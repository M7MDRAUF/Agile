import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { SprintForm } from "@/components/sprint/SprintForm";

export const metadata: Metadata = { title: "New Sprint" };

export default async function NewSprintPage() {
  await requirePermission("sprint.manage");

  const projects = await prisma.project.findMany({
    where: { status: { in: ["active", "on_hold"] } },
    orderBy: { name: "asc" },
    select: { id: true, key: true, name: true },
  });

  return (
    <div>
      <PageHeader title="New sprint" description="Plan a new time-boxed iteration." />
      <SprintForm projects={projects.map((p) => ({ id: p.id, label: `${p.key} · ${p.name}` }))} />
    </div>
  );
}
