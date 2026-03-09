"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export async function deleteTournament(tournamentId: string) {
  const session = await auth();
  if (!session?.user?.id) return;
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.isAdmin) return;

  await prisma.$transaction(async (tx) => {
    await tx.pick.deleteMany({ where: { tournamentId } });
    await tx.game.deleteMany({ where: { tournamentId } });
    await tx.tournament.delete({ where: { id: tournamentId } });
  });

  redirect("/admin");
}
