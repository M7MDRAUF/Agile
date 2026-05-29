import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { getUserPreferences } from "@/lib/actions/settings";

/** Download the signed-in user's own profile + activity data as JSON. */
export async function GET() {
  const user = await requireUser();

  const [record, assigned, reported, comments, preferences] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        title: true,
        department: true,
        status: true,
        mfaEnabled: true,
        createdAt: true,
      },
    }),
    prisma.workItem.count({ where: { assigneeId: user.id } }),
    prisma.workItem.count({ where: { reporterId: user.id } }),
    prisma.comment.count({ where: { authorId: user.id } }),
    getUserPreferences(user.id),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    profile: record,
    stats: { assignedWorkItems: assigned, reportedWorkItems: reported, comments },
    preferences,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="agileforge-profile-${user.id}.json"`,
    },
  });
}
