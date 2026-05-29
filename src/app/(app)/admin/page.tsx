import type { Metadata } from "next";
import { format } from "date-fns";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { humanize } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { RoleSelect } from "@/components/admin/RoleSelect";
import { StatusToggle } from "@/components/admin/StatusToggle";
import { CreateUserForm } from "@/components/admin/CreateUserForm";
import { Users, FolderKanban, ListChecks, ScrollText } from "lucide-react";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  const me = await requirePermission("admin.access");

  const [users, auditLogs, counts] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: "asc" } }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { actor: true },
    }),
    Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.workItem.count(),
      prisma.auditLog.count(),
    ]),
  ]);
  const [userCount, projectCount, itemCount, auditCount] = counts;

  return (
    <div>
      <PageHeader
        title="Administration"
        description="Manage users, roles and review the audit trail."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Users" value={userCount} icon={Users} />
        <StatCard label="Projects" value={projectCount} icon={FolderKanban} />
        <StatCard label="Work Items" value={itemCount} icon={ListChecks} />
        <StatCard label="Audit Events" value={auditCount} icon={ScrollText} />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>User Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <CreateUserForm />
          </div>
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Email</TH>
                <TH>Role</TH>
                <TH>Status</TH>
                <TH>Actions</TH>
              </TR>
            </THead>
            <TBody>
              {users.map((u) => (
                <TR key={u.id}>
                  <TD>
                    <span className="flex items-center gap-2">
                      <Avatar name={u.name} color={u.avatarColor} size={26} />
                      <span className="font-medium">{u.name}</span>
                    </span>
                  </TD>
                  <TD className="text-sm text-muted-foreground">{u.email}</TD>
                  <TD>
                    <RoleSelect userId={u.id} role={u.role} />
                  </TD>
                  <TD>
                    <Badge variant={u.status === "active" ? "success" : "muted"}>
                      {humanize(u.status)}
                    </Badge>
                  </TD>
                  <TD>
                    {u.id !== me.id ? (
                      <StatusToggle userId={u.id} status={u.status} />
                    ) : (
                      <span className="text-xs text-muted-foreground">You</span>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit Log</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {auditLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit events.</p>
          ) : (
            auditLogs.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm"
              >
                <Badge variant="info">{humanize(a.action)}</Badge>
                <span className="flex-1">
                  <span className="font-medium">{a.actor?.name ?? "System"}</span>{" "}
                  <span className="text-muted-foreground">
                    {a.detail ?? `${a.entityType} ${a.entityId ?? ""}`}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(a.createdAt), "MMM d, HH:mm")}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
