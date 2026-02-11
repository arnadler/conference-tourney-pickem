import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { enterResultSchema, bulkResultSchema } from "@/lib/validators";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized", status: 401, session: null };
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.isAdmin) {
    return { error: "Forbidden: admin required", status: 403, session: null };
  }
  return { error: null, status: 200, session };
}

export async function POST(req: NextRequest) {
  const { error, status, session } = await requireAdmin();
  if (error) return NextResponse.json({ error }, { status });

  try {
    const body = await req.json();

    // Support both single and bulk
    if (body.results) {
      const parsed = bulkResultSchema.parse(body);
      return await processBulkResults(parsed, session!.user.id);
    } else {
      const parsed = enterResultSchema.parse(body);
      return await processSingleResult(parsed, session!.user.id);
    }
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function processSingleResult(
  data: { tournamentId: string; gameNumber: number; winnerTeamName: string },
  adminId: string
) {
  const game = await prisma.game.findUnique({
    where: {
      tournamentId_gameNumber: {
        tournamentId: data.tournamentId,
        gameNumber: data.gameNumber,
      },
    },
  });

  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  // Update game result
  await prisma.game.update({
    where: { id: game.id },
    data: {
      winnerTeamName: data.winnerTeamName,
      resultEnteredBy: adminId,
      resultEnteredAt: new Date(),
    },
  });

  // Advance winner to next game
  if (game.nextGameNumber && game.nextSlot) {
    const nextGame = await prisma.game.findUnique({
      where: {
        tournamentId_gameNumber: {
          tournamentId: data.tournamentId,
          gameNumber: game.nextGameNumber,
        },
      },
    });

    if (nextGame) {
      const updateData =
        game.nextSlot === "top"
          ? { topTeamName: data.winnerTeamName }
          : { bottomTeamName: data.winnerTeamName };

      await prisma.game.update({
        where: { id: nextGame.id },
        data: updateData,
      });
    }
  }

  // Score picks for this game
  const picks = await prisma.pick.findMany({
    where: { gameId: game.id },
  });

  for (const pick of picks) {
    await prisma.pick.update({
      where: { id: pick.id },
      data: { isCorrect: pick.selectedTeam === data.winnerTeamName },
    });
  }

  return NextResponse.json({ success: true });
}

async function processBulkResults(
  data: { tournamentId: string; results: { gameNumber: number; winnerTeamName: string }[] },
  adminId: string
) {
  for (const result of data.results) {
    await processSingleResult(
      { tournamentId: data.tournamentId, ...result },
      adminId
    );
  }

  return NextResponse.json({ success: true, count: data.results.length });
}
