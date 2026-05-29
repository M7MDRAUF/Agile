import type { Metadata } from "next";
import { Hexagon } from "lucide-react";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in · AgileForge" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-2 text-white">
          <Hexagon className="size-7 text-primary" />
          <span className="text-xl font-bold">AgileForge</span>
        </div>
        <div>
          <h1 className="max-w-md text-3xl font-bold leading-tight text-white">
            Plan, execute and ship Agile delivery across every team.
          </h1>
          <p className="mt-4 max-w-md text-sm text-sidebar-foreground">
            Sprints, boards, backlogs, blockers, QA and engineering metrics — one production-grade
            platform for your whole organization.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/70">
          © {new Date().getFullYear()} NovaCore Software Inc. · Internal tooling
        </p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <Hexagon className="size-7 text-primary" />
            <span className="text-xl font-bold">AgileForge</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
          <p className="mb-6 mt-1 text-sm text-muted-foreground">
            Sign in to your AgileForge workspace.
          </p>
          <LoginForm next={next} />
        </div>
      </div>
    </main>
  );
}
