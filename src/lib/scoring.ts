import type { Game, Pick } from "@/generated/prisma/client";

export interface UserScore {
  userId: string;
  userName: string | null;
  userEmail: string | null;
  score: number;
  totalPicks: number;
  correctPicks: number;
  possiblePoints: number;
}

/**
 * Calculate scores for a single tournament.
 * Returns sorted leaderboard (highest score first).
 */
export function calculateTournamentScores(
  games: Game[],
  allPicks: (Pick & { user: { name: string | null; email: string | null } })[],
): UserScore[] {
  const userMap = new Map<string, UserScore>();
  const gameById = new Map(games.map((g) => [g.id, g]));
  const possiblePoints = games.filter((g) => !g.isBye).reduce((sum, g) => sum + g.round, 0);

  for (const pick of allPicks) {
    if (!userMap.has(pick.userId)) {
      userMap.set(pick.userId, {
        userId: pick.userId,
        userName: pick.user.name,
        userEmail: pick.user.email,
        score: 0,
        totalPicks: 0,
        correctPicks: 0,
        possiblePoints,
      });
    }

    const entry = userMap.get(pick.userId)!;
    entry.totalPicks++;

    const game = gameById.get(pick.gameId);
    if (game?.winnerTeamName) {
      if (pick.selectedTeam === game.winnerTeamName) {
        entry.score += game.round; // points = round number (R1=1, R2=2, R3=3, R4=4)
        entry.correctPicks++;
      }
    }
  }

  return Array.from(userMap.values()).sort((a, b) => b.score - a.score);
}

/**
 * Calculate overall scores across all tournaments.
 */
export function calculateOverallScores(
  tournamentScores: Map<string, UserScore[]>
): UserScore[] {
  const overallMap = new Map<string, UserScore>();

  for (const scores of tournamentScores.values()) {
    for (const score of scores) {
      const existing = overallMap.get(score.userId);
      if (existing) {
        existing.score += score.score;
        existing.totalPicks += score.totalPicks;
        existing.correctPicks += score.correctPicks;
        existing.possiblePoints += score.possiblePoints;
      } else {
        overallMap.set(score.userId, { ...score });
      }
    }
  }

  return Array.from(overallMap.values()).sort((a, b) => b.score - a.score);
}

/**
 * Update isCorrect on Pick records based on game results.
 */
export function scorePick(
  pick: Pick,
  game: Game
): boolean | null {
  if (!game.winnerTeamName) return null;
  return pick.selectedTeam === game.winnerTeamName;
}
