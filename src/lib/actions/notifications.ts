"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";

/** Mark a single notification as read. */
export async function markNotificationRead(id: string) {
  const user = await requireUser();
  const notif = await prisma.notification.findUnique({ where: { id } });
  if (!notif || notif.userId !== user.id) return { error: "Not found" };
  await prisma.notification.update({ where: { id }, data: { read: true } });
  revalidatePath("/notifications");
  return { ok: true };
}

/** Mark all of the current user's notifications as read. */
export async function markAllNotificationsRead() {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });
  revalidatePath("/notifications");
  return { ok: true };
}
