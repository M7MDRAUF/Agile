"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withDbRetry } from "@/lib/db-retry";
import { requireUser } from "@/lib/auth/guards";
import { can } from "@/lib/domain/permissions";

const teamSchema = z.object({
  key: z
    .string()
    .min(2, "Key must be at least 2 characters")
    .max(10, "Key must be 10 characters or fewer")
    .regex(/^[A-Za-z0-9]+$/, "Key must be alphanumeric"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
});

export interface TeamFormState {
  error?: string;
  ok?: boolean;
  id?: string;
}

/** Create a new team (team managers). */
export async function createTeam(_prev: TeamFormState, formData: FormData): Promise<TeamFormState> {
  const user = await requireUser();
  if (!can(user.role, "team.manage")) return { error: "You cannot manage teams" };

  const parsed = teamSchema.safeParse({
    key: formData.get("key"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const key = parsed.data.key.toUpperCase();
  const existing = await prisma.team.findUnique({ where: { key } });
  if (existing) return { error: "A team with that key already exists" };

  // REL-010: retry the write on transient SQLITE_BUSY contention.
  const team = await withDbRetry(() =>
    prisma.team.create({
      data: {
        key,
        name: parsed.data.name,
        description: parsed.data.description || null,
      },
    }),
  );

  revalidatePath("/teams");
  return { ok: true, id: team.id };
}

/** Add a member to a team (team managers). */
export async function addTeamMember(teamId: string, userId: string, roleName: string | null) {
  const actor = await requireUser();
  if (!can(actor.role, "team.manage")) return { error: "You cannot manage teams" };

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) return { error: "Team not found" };

  const existing = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });
  if (existing) return { error: "User is already a member" };

  const trimmedRole = roleName?.trim() || null;
  if (trimmedRole && trimmedRole.length > 60) {
    return { error: "Role name is too long (max 60 characters)" };
  }

  await prisma.teamMember.create({
    data: { teamId, userId, roleName: trimmedRole },
  });

  revalidatePath(`/teams/${teamId}`);
  revalidatePath("/teams");
  return { ok: true };
}

/** Remove a member from a team (team managers). */
export async function removeTeamMember(teamId: string, userId: string) {
  const actor = await requireUser();
  if (!can(actor.role, "team.manage")) return { error: "You cannot manage teams" };

  await prisma.teamMember.deleteMany({ where: { teamId, userId } });

  revalidatePath(`/teams/${teamId}`);
  revalidatePath("/teams");
  return { ok: true };
}
