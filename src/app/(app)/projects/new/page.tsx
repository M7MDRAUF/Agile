import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/page-header";
import { CreateProjectForm } from "./CreateProjectForm";

export const metadata: Metadata = { title: "New Project" };

export default async function NewProjectPage() {
  await requirePermission("project.create");

  return (
    <div>
      <PageHeader title="New Project" description="Create a new delivery initiative." />
      <CreateProjectForm />
    </div>
  );
}
