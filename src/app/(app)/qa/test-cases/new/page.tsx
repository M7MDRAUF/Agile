import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { TestCaseForm } from "@/components/qa/TestCaseForm";

export const metadata: Metadata = { title: "New Test Case" };

export default async function NewTestCasePage() {
  await requirePermission("qa.manage");

  const projects = await prisma.project.findMany({
    orderBy: { name: "asc" },
    select: { id: true, key: true, name: true },
  });

  return (
    <div>
      <PageHeader title="New test case" description="Document a test scenario for a project." />
      <TestCaseForm projects={projects.map((p) => ({ id: p.id, label: `${p.key} · ${p.name}` }))} />
    </div>
  );
}
