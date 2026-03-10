import type { Game, Pick } from "@/generated/prisma/client";

export interface UserScore {
  userId: string;
  userName: string | null;
  userEmail: string | null;
  score: number;
  totalPicks: number;
  correctPicks: number;
  maxPoints: number;
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

  // Build set of teams that have already been eliminated (lost a decided game)
  const eliminatedTeams = new Set<string>();
  for (const game of games) {
    if (game.winnerTeamName && !game.isBye) {
      if (game.topTeamName && game.topTeamName !== game.winnerTeamName) {
        eliminatedTeams.add(game.topTeamName);
      }
      if (game.bottomTeamName && game.bottomTeamName !== game.winnerTeamName) {
        eliminatedTeams.add(game.bottomTeamName);
      }
    }
  }

  for (const pick of allPicks) {
    if (!userMap.has(pick.userId)) {
      userMap.set(pick.userId, {
        userId: pick.userId,
        userName: pick.user.name,
        userEmail: pick.user.email,
        score: 0,
        totalPicks: 0,
        correctPicks: 0,
        maxPoints: 0,
      });
    }

    const entry = userMap.get(pick.userId)!;
    entry.totalPicks++;

    const game = gameById.get(pick.gameId);
    if (!game || game.isBye) continue;

    if (game.winnerTeamName) {
      // Decided game
      if (pick.selectedTeam === game.winnerTeamName) {
        entry.score += game.round;
        entry.correctPicks++;
      }
    } else {
      // Undecided game — only counts toward max if the picked team is still alive
      if (!eliminatedTeams.has(pick.selectedTeam)) {
        entry.maxPoints += game.round;
      }
    }
  }

  // maxPoints = current score + points still possible from undecided games
  for (const entry of userMap.values()) {
    entry.maxPoints += entry.score;
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
        existing.maxPoints += score.maxPoints;
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
