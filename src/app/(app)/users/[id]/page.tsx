import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { can } from "@/lib/domain/permissions";
import { humanize } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, PriorityBadge } from "@/components/status-badge";
import { WorkItemTypeIcon } from "@/components/work-item/type-icon";
import { RoleSelect } from "@/components/admin/RoleSelect";
import { StatusToggle } from "@/components/admin/StatusToggle";

export const metadata: Metadata = { title: "User" };

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requirePermission("user.view");
  const { id } = await params;
  const isAdmin = can(me.role, "admin.access");

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      teamMemberships: { include: { team: true } },
      assignedItems: {
        where: { status: { notIn: ["done", "canceled"] } },
        include: { project: { select: { key: true } } },
        orderBy: { updatedAt: "desc" },
        take: 20,
      },
    },
  });
  if (!user) notFound();

  return (
    <div>
      <PageHeader
        title={user.name}
        description={
          <span className="flex items-center gap-2">
            <Avatar name={user.name} color={user.avatarColor} size={24} />
            {user.title ?? humanize(user.role)} · {user.email}
          </span>
        }
        actions={
          isAdmin && user.id !== me.id ? (
            <StatusToggle userId={user.id} status={user.status} />
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Role</span>
              {isAdmin ? (
                <RoleSelect userId={user.id} role={user.role} />
              ) : (
                <Badge variant="muted">{humanize(user.role)}</Badge>
              )}
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={user.status === "active" ? "success" : "muted"}>
                {humanize(user.status)}
              </Badge>
            </div>
            <div>
              <p className="mb-1 text-muted-foreground">Teams</p>
              <div className="flex flex-wrap gap-1">
                {user.teamMemberships.length ? (
                  user.teamMemberships.map((m) => (
                    <Link key={m.id} href={`/teams/${m.teamId}`}>
                      <Badge variant="info">{m.team.name}</Badge>
                    </Link>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">No teams</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Active Work ({user.assignedItems.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {user.assignedItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active assignments.</p>
            ) : (
              user.assignedItems.map((i) => (
                <Link
                  key={i.id}
                  href={`/work-items/${i.id}`}
                  className="flex items-center gap-3 rounded-md border border-border px-3 py-2 hover:bg-accent"
                >
                  <WorkItemTypeIcon type={i.type} />
                  <span className="flex-1 truncate text-sm">{i.title}</span>
                  <PriorityBadge priority={i.priority} />
                  <StatusBadge status={i.status} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
