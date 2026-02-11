import { prisma } from "./db";
import { tournamentImportSchema, type TournamentImportData } from "./validators";

/**
 * Import a tournament from JSON data.
 * Creates the tournament and all game records.
 */
export async function importTournament(data: TournamentImportData) {
  const parsed = tournamentImportSchema.parse(data);

  const firstGameStart = new Date(parsed.firstGameStart);
  if (isNaN(firstGameStart.getTime())) {
    throw new Error("Invalid firstGameStart datetime");
  }

  // Determine number of rounds
  const numRounds = Math.max(...parsed.games.map((g) => g.round));

  // Check for existing tournament
  const existing = await prisma.tournament.findUnique({
    where: {
      conferenceName_year: {
        conferenceName: parsed.conferenceName,
        year: parsed.year,
      },
    },
  });

  if (existing) {
    throw new Error(
      `Tournament ${parsed.conferenceName} ${parsed.year} already exists. Delete it first to re-import.`
    );
  }

  // Create tournament with games in a transaction
  const tournament = await prisma.$transaction(async (tx) => {
    const t = await tx.tournament.create({
      data: {
        conferenceName: parsed.conferenceName,
        year: parsed.year,
        timezone: parsed.timezone,
        firstGameStart,
        numRounds,
      },
    });

    // Create all games
    for (const game of parsed.games) {
      await tx.game.create({
        data: {
          tournamentId: t.id,
          round: game.round,
          gameNumber: game.gameNumber,
          position: game.position,
          startTime: game.startTime ? new Date(game.startTime) : null,
          topSeedLabel: game.topSeedLabel || (game.topSeed ? `#${game.topSeed}` : null),
          bottomSeedLabel:
            game.bottomSeedLabel || (game.bottomSeed ? `#${game.bottomSeed}` : null),
          topTeamName: game.topTeamName || null,
          bottomTeamName: game.bottomTeamName || null,
          topSourceGameNumber: game.topSourceGameNumber || null,
          bottomSourceGameNumber: game.bottomSourceGameNumber || null,
          nextGameNumber: game.nextGameNumber || null,
          nextSlot: game.nextSlot || null,
          isBye: game.isBye || false,
        },
      });
    }

    return t;
  });

  return tournament;
}
