import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { can } from "@/lib/domain/permissions";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TestStatusBadge, PriorityBadge } from "@/components/status-badge";
import { Avatar } from "@/components/ui/avatar";
import { TestRunForm } from "@/components/qa/TestRunForm";

export const metadata: Metadata = { title: "Test Case" };

export default async function TestCaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("qa.view");
  const { id } = await params;

  const testCase = await prisma.testCase.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, key: true, name: true } },
      workItem: { select: { id: true, key: true, title: true } },
      runs: { include: { runBy: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!testCase) notFound();

  return (
    <div>
      <PageHeader
        title={testCase.title}
        description={
          <span className="flex items-center gap-2">
            <span className="font-mono text-xs">{testCase.key}</span>
            <TestStatusBadge status={testCase.status} />
            <PriorityBadge priority={testCase.priority} />
            <Link href={`/projects/${testCase.project.id}`} className="hover:underline">
              {testCase.project.name}
            </Link>
          </span>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Specification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {testCase.description ? (
                <p className="whitespace-pre-wrap text-muted-foreground">{testCase.description}</p>
              ) : null}
              {testCase.steps ? (
                <div>
                  <h4 className="mb-1 font-semibold">Steps</h4>
                  <p className="whitespace-pre-wrap text-muted-foreground">{testCase.steps}</p>
                </div>
              ) : null}
              {testCase.expected ? (
                <div>
                  <h4 className="mb-1 font-semibold">Expected Result</h4>
                  <p className="whitespace-pre-wrap text-muted-foreground">{testCase.expected}</p>
                </div>
              ) : null}
              {testCase.workItem ? (
                <p className="text-muted-foreground">
                  Linked to{" "}
                  <Link
                    href={`/work-items/${testCase.workItem.id}`}
                    className="text-primary hover:underline"
                  >
                    {testCase.workItem.key} · {testCase.workItem.title}
                  </Link>
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Run History ({testCase.runs.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {testCase.runs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No runs recorded yet.</p>
              ) : (
                testCase.runs.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
                  >
                    <TestStatusBadge status={r.status} />
                    <span className="flex-1 text-sm text-muted-foreground">{r.notes || "—"}</span>
                    {r.bugId ? (
                      <Link href={`/work-items/${r.bugId}`}>
                        <Badge variant="danger">Bug</Badge>
                      </Link>
                    ) : null}
                    {r.runBy ? (
                      <Avatar name={r.runBy.name} color={r.runBy.avatarColor} size={22} />
                    ) : null}
                    <span className="hidden text-xs text-muted-foreground sm:block">
                      {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {can(user.role, "qa.manage") ? (
          <div className="space-y-6">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/qa/test-cases/${testCase.id}/edit`}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Edit test case
                </Link>
              </CardContent>
            </Card>
            <Card className="h-fit">
              <CardHeader>
                <CardTitle>Record a Run</CardTitle>
              </CardHeader>
              <CardContent>
                <TestRunForm testCaseId={testCase.id} />
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
}
