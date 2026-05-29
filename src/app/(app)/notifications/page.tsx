import type { Metadata } from "next";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Bell, MessageSquare, ShieldAlert, UserPlus, Zap } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { MarkAllRead, MarkOneRead } from "@/components/notifications/NotificationActions";

export const metadata: Metadata = { title: "Notifications" };

const ICONS: Record<string, typeof Bell> = {
  assignment: UserPlus,
  comment: MessageSquare,
  blocker: ShieldAlert,
  sprint: Zap,
  system: Bell,
};

export default async function NotificationsPage() {
  const user = await requireUser();
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const unread = notifications.filter((n) => !n.read).length;

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
    </div>
  );
}
