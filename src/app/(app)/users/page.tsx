import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { can } from "@/lib/domain/permissions";
import { humanize } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { RoleSelect } from "@/components/admin/RoleSelect";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage() {
  const me = await requireUser();
  const isAdmin = can(me.role, "admin.access");

  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { assignedItems: true } } },
  });

  return (
    <div>
      <PageHeader title="Users" description="Everyone with access to the workspace." />
      <Table>
        <THead>
          <TR>
            <TH>Name</TH>
            <TH>Email</TH>
            <TH>Role</TH>
            <TH>Status</TH>
            <TH>Assigned</TH>
          </TR>
        </THead>
        <TBody>
          {users.map((u) => (
            <TR key={u.id}>
              <TD>
                <Link href={`/users/${u.id}`} className="flex items-center gap-2 hover:underline">
                  <Avatar name={u.name} color={u.avatarColor} size={28} />
                  <span className="font-medium">{u.name}</span>
                </Link>
              </TD>
              <TD className="text-sm text-muted-foreground">{u.email}</TD>
              <TD>
                {isAdmin ? (
                  <RoleSelect userId={u.id} role={u.role} />
                ) : (
                  <Badge variant="muted">{humanize(u.role)}</Badge>
                )}
              </TD>
              <TD>
                <Badge variant={u.status === "active" ? "success" : "muted"}>
                  {humanize(u.status)}
                </Badge>
              </TD>
              <TD className="tabular-nums">{u._count.assignedItems}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
