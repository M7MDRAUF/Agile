import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { countBy } from "@/lib/domain/metrics";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { TestStatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { can } from "@/lib/domain/permissions";
import { CheckCircle2, XCircle, Clock, ShieldQuestion, Plus } from "lucide-react";

export const metadata: Metadata = { title: "QA" };

export default async function QAPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const canManage = can(user.role, "qa.manage");
  const where = sp.project ? { projectId: sp.project } : {};
  const testCases = await prisma.testCase.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: { project: { select: { key: true } }, _count: { select: { runs: true } } },
  });

  const byStatus = countBy(testCases, (t) => t.status);
  const passed = byStatus.passed ?? 0;
  const failed = byStatus.failed ?? 0;
  const blocked = byStatus.blocked ?? 0;
  const notRun = byStatus.not_run ?? 0;
  const total = testCases.length;
  const readiness = total ? Math.round((passed / total) * 100) : 0;

  return (
    <div>
      <PageHeader
        title="Quality Assurance"
        description="Test coverage, execution and release readiness."
        actions={
          canManage ? (
            <Link href="/qa/test-cases/new" className={buttonVariants()}>
              <Plus className="size-4" /> New test case
            </Link>
          ) : undefined
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Passed" value={passed} icon={CheckCircle2} tone="success" />
        <StatCard label="Failed" value={failed} icon={XCircle} tone="danger" />
        <StatCard label="Blocked" value={blocked} icon={ShieldQuestion} tone="warning" />
        <StatCard label="Not Run" value={notRun} icon={Clock} />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Release Readiness</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-1 flex justify-between text-sm text-muted-foreground">
            <span>
              {passed}/{total} test cases passing
            </span>
            <span>{readiness}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{
                width: `${readiness}%`,
                backgroundColor:
                  readiness >= 80 ? "#16a34a" : readiness >= 50 ? "#d97706" : "#dc2626",
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Table>
        <THead>
          <TR>
            <TH>Key</TH>
            <TH>Title</TH>
            <TH>Project</TH>
            <TH>Status</TH>
            <TH>Runs</TH>
          </TR>
        </THead>
        <TBody>
          {testCases.map((t) => (
            <TR key={t.id}>
              <TD className="font-mono text-xs text-muted-foreground">{t.key}</TD>
              <TD>
                <Link href={`/qa/test-cases/${t.id}`} className="font-medium hover:underline">
                  {t.title}
                </Link>
              </TD>
              <TD className="text-sm text-muted-foreground">{t.project.key}</TD>
              <TD>
                <TestStatusBadge status={t.status} />
              </TD>
              <TD className="tabular-nums">{t._count.runs}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
