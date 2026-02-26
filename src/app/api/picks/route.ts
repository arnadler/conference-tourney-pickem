import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { savePicksSchema } from "@/lib/validators";
import {
  isTournamentLocked,
  validateBracketConsistency,
  buildGameMap,
} from "@/lib/bracket-utils";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = savePicksSchema.parse(body);

    // Get tournament
    const tournament = await prisma.tournament.findUnique({
      where: { id: parsed.tournamentId },
      include: { games: true },
    });

    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    // Server-side lock enforcement
    if (isTournamentLocked(tournament.firstGameStart)) {
      return NextResponse.json(
        { error: "Tournament is locked. Picks can no longer be changed." },
        { status: 403 }
      );
    }

    const gameMap = buildGameMap(tournament.games);

    // Build picks map for validation
    const picksMap: Record<number, string> = {};
    for (const pick of parsed.picks) {
      picksMap[pick.gameNumber] = pick.selectedTeam;
    }

    // Validate bracket consistency and source-game dependencies.
    const validation = validateBracketConsistency(tournament.games, picksMap);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors[0] }, { status: 400 });
    }

    // Build picks data, filtering out byes
    const picksToCreate = parsed.picks
      .map((pick) => {
        const game = gameMap.get(pick.gameNumber);
        if (!game || game.isBye) return null;
        return {
          userId: session.user.id,
          tournamentId: parsed.tournamentId,
          gameId: game.id,
          gameNumber: pick.gameNumber,
          selectedTeam: pick.selectedTeam,
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    // Save picks in transaction
    await prisma.$transaction(async (tx) => {
      await tx.pick.deleteMany({
        where: {
          userId: session.user.id,
          tournamentId: parsed.tournamentId,
        },
      });

      if (picksToCreate.length > 0) {
        await tx.pick.createMany({ data: picksToCreate });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tournamentId = req.nextUrl.searchParams.get("tournamentId");
  if (!tournamentId) {
    return NextResponse.json({ error: "tournamentId required" }, { status: 400 });
  }

  const picks = await prisma.pick.findMany({
    where: {
      userId: session.user.id,
      tournamentId,
    },
  });

  const picksMap: Record<number, string> = {};
  for (const pick of picks) {
    picksMap[pick.gameNumber] = pick.selectedTeam;
  }

  return NextResponse.json({ picks: picksMap });
}
