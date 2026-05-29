"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { can } from "@/lib/domain/permissions";
import { TEST_STATUSES, PRIORITIES } from "@/lib/domain/constants";

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

  const count = await prisma.testCase.count({ where: { projectId: project.id } });
  const key = `${project.key}-TC${count + 1}`;

  const testCase = await prisma.testCase.create({
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
  });

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

  let bugId: string | undefined;
  if (status === "failed" && createBug) {
    const count = await prisma.workItem.count({ where: { projectId: testCase.projectId } });
    const project = await prisma.project.findUnique({ where: { id: testCase.projectId } });
    const key = `${project?.key ?? "BUG"}-${count + 1}`;
    const bug = await prisma.workItem.create({
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
    });
    bugId = bug.id;
  }

  await prisma.testRun.create({
    data: { testCaseId, status, notes: notes || null, runById: user.id, bugId },
  });
  await prisma.testCase.update({ where: { id: testCaseId }, data: { status } });

  revalidatePath("/qa");
  revalidatePath(`/qa/test-cases/${testCaseId}`);
  return { ok: true, bugId };
}
