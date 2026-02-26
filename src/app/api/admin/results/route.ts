import { NextRequest, NextResponse } from "next/server";
import type { Game, Prisma } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { enterResultSchema, bulkResultSchema } from "@/lib/validators";
import { getDownstreamGameNumbers } from "@/lib/bracket-utils";

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

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

function resolveAdvancingTeam(
  sourceGameNumber: number | null,
  gameMap: Map<number, Game>
): string | null {
  if (sourceGameNumber == null) return null;
  const sourceGame = gameMap.get(sourceGameNumber);
  if (!sourceGame) return null;
  if (sourceGame.isBye) {
    return sourceGame.topTeamName || sourceGame.bottomTeamName || null;
  }
  return sourceGame.winnerTeamName || null;
}

async function applySingleResult(
  tx: Prisma.TransactionClient,
  data: { tournamentId: string; gameNumber: number; winnerTeamName: string },
  adminId: string,
  existingGameMap?: Map<number, Game>
): Promise<Map<number, Game>> {
  let gameMap: Map<number, Game>;
  let games: Game[];

  if (existingGameMap) {
    gameMap = existingGameMap;
    games = Array.from(existingGameMap.values());
  } else {
    games = await tx.game.findMany({
      where: { tournamentId: data.tournamentId },
    });
    gameMap = new Map<number, Game>();
    for (const game of games) {
      gameMap.set(game.gameNumber, game);
    }
  }

  const targetGame = gameMap.get(data.gameNumber);
  if (!targetGame) {
    throw new ApiError("Game not found", 404);
  }
  if (targetGame.isBye) {
    throw new ApiError("Cannot enter a winner for a bye game.", 400);
  }

  const validTeams = [targetGame.topTeamName, targetGame.bottomTeamName].filter(
    (team): team is string => Boolean(team)
  );
  if (!validTeams.includes(data.winnerTeamName)) {
    throw new ApiError(
      `Invalid winner for game ${data.gameNumber}. Must be one of: ${validTeams.join(", ")}`,
      400
    );
  }

  // Save corrected result for the target game.
  const updatedTargetGame = await tx.game.update({
    where: { id: targetGame.id },
    data: {
      winnerTeamName: data.winnerTeamName,
      resultEnteredBy: adminId,
      resultEnteredAt: new Date(),
    },
  });
  gameMap.set(updatedTargetGame.gameNumber, updatedTargetGame);

  // Any correction invalidates downstream results. Recompute slots and clear winners.
  const downstreamNumbers = getDownstreamGameNumbers(targetGame.gameNumber, games);
  const downstreamGames = downstreamNumbers
    .map((gameNumber) => gameMap.get(gameNumber))
    .filter((game): game is Game => Boolean(game))
    .sort((a, b) => a.round - b.round || a.position - b.position);

  for (const game of downstreamGames) {
    const current = gameMap.get(game.gameNumber);
    if (!current) continue;

    const topTeamName =
      current.topSourceGameNumber != null
        ? resolveAdvancingTeam(current.topSourceGameNumber, gameMap)
        : current.topTeamName;
    const bottomTeamName =
      current.bottomSourceGameNumber != null
        ? resolveAdvancingTeam(current.bottomSourceGameNumber, gameMap)
        : current.bottomTeamName;

    const updatedGame = await tx.game.update({
      where: { id: current.id },
      data: {
        topTeamName,
        bottomTeamName,
        winnerTeamName: null,
        resultEnteredBy: null,
        resultEnteredAt: null,
      },
    });
    gameMap.set(updatedGame.gameNumber, updatedGame);
  }

  // Rescore only games affected by this correction.
  const affectedGames = [targetGame.gameNumber, ...downstreamNumbers]
    .map((gameNumber) => gameMap.get(gameNumber))
    .filter((game): game is Game => Boolean(game));
  const winnerByGameId = new Map(affectedGames.map((game) => [game.id, game.winnerTeamName]));

  const picks = await tx.pick.findMany({
    where: {
      gameId: {
        in: affectedGames.map((game) => game.id),
      },
    },
    select: {
      id: true,
      gameId: true,
      selectedTeam: true,
    },
  });
  for (const pick of picks) {
    const winnerTeamName = winnerByGameId.get(pick.gameId);
    await tx.pick.update({
      where: { id: pick.id },
      data: {
        isCorrect: winnerTeamName ? pick.selectedTeam === winnerTeamName : null,
      },
    });
  }

  return gameMap;
}

export async function POST(req: NextRequest) {
  const { error, status, session } = await requireAdmin();
  if (error) return NextResponse.json({ error }, { status });

  try {
    const body = await req.json();

    if (body.results) {
      const parsed = bulkResultSchema.parse(body);
      await prisma.$transaction(async (tx) => {
        // Fetch all games once and thread the updated map between calls
        const games = await tx.game.findMany({ where: { tournamentId: parsed.tournamentId } });
        let gameMap = new Map<number, Game>();
        for (const game of games) gameMap.set(game.gameNumber, game);

        for (const result of parsed.results) {
          gameMap = await applySingleResult(
            tx,
            { tournamentId: parsed.tournamentId, ...result },
            session!.user.id,
            gameMap
          );
        }
      });
      return NextResponse.json({ success: true, count: parsed.results.length });
    }

    const parsed = enterResultSchema.parse(body);
    await prisma.$transaction(async (tx) => {
      await applySingleResult(tx, parsed, session!.user.id);
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
