import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { importTournament } from "@/lib/tournament-import";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized", status: 401 };
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.isAdmin) {
    return { error: "Forbidden: admin required", status: 403 };
  }
  return { error: null, status: 200 };
}

export async function POST(req: NextRequest) {
  const { error, status } = await requireAdmin();
  if (error) return NextResponse.json({ error }, { status });

  try {
    const data = await req.json();
    const tournament = await importTournament(data);
    return NextResponse.json({ success: true, tournament });
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { error, status } = await requireAdmin();
  if (error) return NextResponse.json({ error }, { status });

  const tournamentId = req.nextUrl.searchParams.get("id");
  if (!tournamentId) {
    return NextResponse.json({ error: "Tournament id required" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.pick.deleteMany({ where: { tournamentId } });
    await tx.game.deleteMany({ where: { tournamentId } });
    await tx.tournament.delete({ where: { id: tournamentId } });
  });

  return NextResponse.json({ success: true });
}
