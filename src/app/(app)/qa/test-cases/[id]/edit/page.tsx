import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { TestCaseForm } from "@/components/qa/TestCaseForm";

export const metadata: Metadata = { title: "Edit Test Case" };

export default async function EditTestCasePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("qa.manage");
  const { id } = await params;

  const testCase = await prisma.testCase.findUnique({
    where: { id },
    include: { project: { select: { id: true, key: true, name: true } } },
  });
  if (!testCase) notFound();

  const projects = await prisma.project.findMany({
    orderBy: { name: "asc" },
    select: { id: true, key: true, name: true },
  });

  return (
    <div>
      <PageHeader title="Edit test case" description={`Editing ${testCase.key}`} />
      <TestCaseForm
        projects={projects.map((p) => ({ id: p.id, label: `${p.key} · ${p.name}` }))}
        values={{
          id: testCase.id,
          title: testCase.title,
          projectId: testCase.projectId,
          description: testCase.description ?? "",
          steps: testCase.steps ?? "",
          expected: testCase.expected ?? "",
          priority: testCase.priority,
          workItemId: testCase.workItemId ?? "",
        }}
      />
    </div>
  );
}
