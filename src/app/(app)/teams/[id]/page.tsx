import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { humanize } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { HealthBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { AddTeamMember, RemoveTeamMember } from "@/components/team/TeamMemberControls";
import { can } from "@/lib/domain/permissions";

export const metadata: Metadata = { title: "Team" };

export default async function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      members: { include: { user: true } },
      projects: { include: { _count: { select: { workItems: true } } } },
    },
  });
  if (!team) notFound();

  const canManage = can(user.role, "team.manage");
  const memberIds = new Set(team.members.map((m) => m.userId));
  const candidates = canManage
    ? (
        await prisma.user.findMany({
          where: { status: "active" },
          orderBy: { name: "asc" },
          select: { id: true, name: true, role: true },
        })
      )
        .filter((u) => !memberIds.has(u.id))
        .map((u) => ({ id: u.id, label: `${u.name} · ${humanize(u.role)}` }))
    : [];

  return (
    <div>
      <PageHeader title={team.name} description={team.description ?? undefined} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Members ({team.members.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {team.members.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
              >
                <Link
                  href={`/users/${m.userId}`}
                  className="flex flex-1 items-center gap-3 hover:underline"
                >
                  <Avatar name={m.user.name} color={m.user.avatarColor} size={32} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{m.user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.user.title ?? humanize(m.user.role)}
                    </p>
                  </div>
                </Link>
                {m.roleName ? <Badge variant="muted">{m.roleName}</Badge> : null}
                {canManage ? <RemoveTeamMember teamId={team.id} userId={m.userId} /> : null}
              </div>
            ))}
            {canManage ? (
              <div className="pt-2">
                <AddTeamMember teamId={team.id} candidates={candidates} />
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Projects ({team.projects.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {team.projects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="flex items-center gap-3 rounded-md border border-border px-3 py-2 hover:bg-accent"
              >
                <Badge variant="muted">{p.key}</Badge>
                <span className="flex-1 text-sm font-medium">{p.name}</span>
                <HealthBadge health={p.health} />
                <span className="text-xs text-muted-foreground">{p._count.workItems} items</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
