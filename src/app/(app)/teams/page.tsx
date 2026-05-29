import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/empty-state";
import { CreateTeamForm } from "@/components/team/CreateTeamForm";
import { can } from "@/lib/domain/permissions";

export const metadata: Metadata = { title: "Teams" };

export default async function TeamsPage() {
  const user = await requireUser();
  const canManage = can(user.role, "team.manage");
  const teams = await prisma.team.findMany({
    orderBy: { name: "asc" },
    include: {
      members: { include: { user: true } },
      _count: { select: { projects: true } },
    },
  });

  return (
    <div>
      <PageHeader title="Teams" description="Cross-functional delivery squads." />
      {canManage ? (
        <div className="mb-6">
          <CreateTeamForm />
        </div>
      ) : null}
      {teams.length === 0 ? (
        <EmptyState title="No teams" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {teams.map((t) => (
            <Link key={t.id} href={`/teams/${t.id}`}>
              <Card className="h-full transition-colors hover:border-primary">
                <CardHeader>
                  <CardTitle>{t.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {t.description ? (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{t.description}</p>
                  ) : null}
                  <div className="flex -space-x-2">
                    {t.members.slice(0, 6).map((m) => (
                      <Avatar
                        key={m.id}
                        name={m.user.name}
                        color={m.user.avatarColor}
                        size={28}
                        className="ring-2 ring-card"
                      />
                    ))}
                    {t.members.length > 6 ? (
                      <span className="flex size-7 items-center justify-center rounded-full bg-muted text-xs ring-2 ring-card">
                        +{t.members.length - 6}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t.members.length} members · {t._count.projects} projects
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
