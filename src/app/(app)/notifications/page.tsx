import type { Metadata } from "next";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Bell, MessageSquare, ShieldAlert, UserPlus, Zap } from "lucide-react";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { MarkAllRead, MarkOneRead } from "@/components/notifications/NotificationActions";

export const metadata: Metadata = { title: "Notifications" };

const PAGE_SIZE = 50;

const ICONS: Record<string, typeof Bell> = {
  assignment: UserPlus,
  comment: MessageSquare,
  blocker: ShieldAlert,
  sprint: Zap,
  system: Bell,
};

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requirePermission("notification.view");
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const [total, unread, notifications] = await Promise.all([
    prisma.notification.count({ where: { userId: user.id } }),
    prisma.notification.count({ where: { userId: user.id, read: false } }),
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        title="Notifications"
        description={`${unread} unread`}
        actions={unread > 0 ? <MarkAllRead /> : undefined}
      />
      {notifications.length === 0 ? (
        <EmptyState title="No notifications" description="You're all caught up." />
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {notifications.map((n) => {
              const Icon = ICONS[n.type] ?? Bell;
              const body = (
                <div className={cn("flex items-center gap-3 px-4 py-3", !n.read && "bg-accent/40")}>
                  <span className="flex size-8 items-center justify-center rounded-full bg-muted">
                    <Icon className="size-4 text-muted-foreground" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate text-sm", !n.read && "font-medium")}>{n.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  {!n.read ? <MarkOneRead id={n.id} /> : null}
                </div>
              );
              return n.link ? (
                <Link key={n.id} href={n.link} className="block hover:bg-accent/60">
                  {body}
                </Link>
              ) : (
                <div key={n.id}>{body}</div>
              );
            })}
          </CardContent>
        </Card>
      )}
      {totalPages > 1 ? (
        <nav
          className="mt-4 flex items-center justify-between"
          aria-label="Notifications pagination"
        >
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                href={`/notifications?page=${page - 1}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Previous
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link
                href={`/notifications?page=${page + 1}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Next
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
