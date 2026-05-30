"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { can } from "@/lib/domain/permissions";
import { TEST_STATUSES, PRIORITIES } from "@/lib/domain/constants";
import {
  createWithSequentialKey,
  nextKeyNumber,
  testCaseKey,
  workItemKey,
} from "@/lib/domain/keys";

const testCaseSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  projectId: z.string().min(1, "Project is required"),
  description: z.string().optional(),
  steps: z.string().optional(),
  expected: z.string().optional(),
  priority: z.enum(PRIORITIES),
  workItemId: z.string().optional(),
});

export interface TestCaseFormState {
  error?: string;
  ok?: boolean;
  id?: string;
}

/** Create a new test case (QA managers). */
export async function createTestCase(
  _prev: TestCaseFormState,
  formData: FormData,
): Promise<TestCaseFormState> {
  const user = await requireUser();
  if (!can(user.role, "qa.manage")) return { error: "You cannot manage test cases" };

  const parsed = testCaseSchema.safeParse({
    title: formData.get("title"),
    projectId: formData.get("projectId"),
    description: formData.get("description") || undefined,
    steps: formData.get("steps") || undefined,
    expected: formData.get("expected") || undefined,
    priority: formData.get("priority"),
    workItemId: formData.get("workItemId") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const project = await prisma.project.findUnique({ where: { id: parsed.data.projectId } });
  if (!project) return { error: "Project not found" };

  // Delete-safe key derived from the max existing TC suffix, with retry on
  // unique-key collisions under concurrency.
  const testCase = await createWithSequentialKey(
    async () => {
      const keys = await prisma.testCase.findMany({
        where: { projectId: project.id },
        select: { key: true },
      });
      return testCaseKey(project.key, nextKeyNumber(keys.map((k) => k.key)));
    },
    (key) =>
      prisma.testCase.create({
        data: {
          key,
          title: parsed.data.title,
          description: parsed.data.description || null,
          steps: parsed.data.steps || null,
          expected: parsed.data.expected || null,
          priority: parsed.data.priority,
          status: "not_run",
          projectId: project.id,
          workItemId: parsed.data.workItemId || null,
          createdById: user.id,
        },
      }),
  );

  revalidatePath("/qa");
  return { ok: true, id: testCase.id };
}

/** Edit an existing test case (QA managers). */
export async function updateTestCase(
  testCaseId: string,
  _prev: TestCaseFormState,
  formData: FormData,
): Promise<TestCaseFormState> {
  const user = await requireUser();
  if (!can(user.role, "qa.manage")) return { error: "You cannot manage test cases" };

  const existing = await prisma.testCase.findUnique({ where: { id: testCaseId } });
  if (!existing) return { error: "Test case not found" };

  const parsed = testCaseSchema.safeParse({
    title: formData.get("title"),
    projectId: formData.get("projectId"),
    description: formData.get("description") || undefined,
    steps: formData.get("steps") || undefined,
    expected: formData.get("expected") || undefined,
    priority: formData.get("priority"),
    workItemId: formData.get("workItemId") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await prisma.testCase.update({
    where: { id: testCaseId },
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      steps: parsed.data.steps || null,
      expected: parsed.data.expected || null,
      priority: parsed.data.priority,
      workItemId: parsed.data.workItemId || null,
    },
  });

  revalidatePath("/qa");
  revalidatePath(`/qa/test-cases/${testCaseId}`);
  return { ok: true, id: testCaseId };
}

/**
 * Record a test run result. If the result is "failed", optionally create a
 * linked bug work item for triage.
 */
export async function recordTestRun(
  testCaseId: string,
  status: string,
  notes: string,
  createBug: boolean,
) {
  const user = await requireUser();
  if (!can(user.role, "qa.manage")) return { error: "Not permitted" };
  if (!(TEST_STATUSES as readonly string[]).includes(status)) return { error: "Invalid status" };

  const testCase = await prisma.testCase.findUnique({ where: { id: testCaseId } });
  if (!testCase) return { error: "Test case not found" };

  // Run + optional auto-bug + test-case status update are written atomically.
  const result = await prisma.$transaction(async (tx) => {
    let bugId: string | undefined;
    if (status === "failed" && createBug) {
      const project = await tx.project.findUnique({ where: { id: testCase.projectId } });
      const bug = await createWithSequentialKey(
        async () => {
          const keys = await tx.workItem.findMany({
            where: { projectId: testCase.projectId },
            select: { key: true },
          });
          return workItemKey(project?.key ?? "BUG", nextKeyNumber(keys.map((k) => k.key)));
        },
        (key) =>
          tx.workItem.create({
            data: {
              key,
              title: `Bug: ${testCase.title}`,
              description: `Auto-created from failed test ${testCase.key}.\n\n${notes}`,
              type: "bug",
              priority: "high",
              status: "backlog",
              projectId: testCase.projectId,
              reporterId: user.id,
            },
          }),
      );
      bugId = bug.id;
    }

    await tx.testRun.create({
      data: { testCaseId, status, notes: notes || null, runById: user.id, bugId },
    });
    await tx.testCase.update({ where: { id: testCaseId }, data: { status } });
    return { bugId };
  });

  revalidatePath("/qa");
  revalidatePath(`/qa/test-cases/${testCaseId}`);
  return { ok: true, bugId: result.bugId };
}
