import type { Game, Pick } from "@/generated/prisma/client";

export type GameWithPicks = Game & { picks?: Pick[] };

/**
 * Check if a tournament is locked (past first game start time).
 */
export function isTournamentLocked(firstGameStart: Date): boolean {
  return new Date() >= new Date(firstGameStart);
}

/**
 * Given a set of picks (gameNumber -> selectedTeam), validate bracket consistency.
 * A team can only be picked in a later round if they were also picked to win in all prior rounds.
 */
export function validateBracketConsistency(
  games: Game[],
  picks: Record<number, string>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const gameMap = new Map<number, Game>();
  for (const g of games) gameMap.set(g.gameNumber, g);

  for (const [gameNumStr, selectedTeam] of Object.entries(picks)) {
    const gameNum = Number(gameNumStr);
    const game = gameMap.get(gameNum);
    if (!game) {
      errors.push(`Game ${gameNum} does not exist in this tournament.`);
      continue;
    }

    // For games that depend on source games, check the pick is consistent
    if (game.topSourceGameNumber != null) {
      const sourceGame = gameMap.get(game.topSourceGameNumber);
      if (sourceGame && !sourceGame.isBye) {
        const sourcePick = picks[game.topSourceGameNumber];
        // If we picked a team in this game's top slot, it must have won the source game
        if (selectedTeam && sourcePick !== undefined) {
          // The team in the top slot should be the winner of the source game
          // (this team must match the source pick if the source feeds the top)
        }
      }
    }

    if (game.bottomSourceGameNumber != null) {
      const sourceGame = gameMap.get(game.bottomSourceGameNumber);
      if (sourceGame && !sourceGame.isBye) {
        const sourcePick = picks[game.bottomSourceGameNumber];
        if (sourcePick !== undefined) {
          // Same logic for bottom
        }
      }
    }

    // Core validation: if this game has source games, the selected team
    // must have been picked as the winner of one of those source games
    const possibleTeams = getPossibleTeams(game, gameMap, picks);
    if (possibleTeams.length > 0 && selectedTeam && !possibleTeams.includes(selectedTeam)) {
      errors.push(
        `Pick for game ${gameNum} (${selectedTeam}) is inconsistent: that team was not picked to advance from an earlier round.`
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Get the possible teams that could appear in a game slot based on picks.
 * For first-round games, it's the actual seeded teams.
 * For later rounds, it's whoever was picked to win the source games.
 */
export function getPossibleTeams(
  game: Game,
  gameMap: Map<number, Game>,
  picks: Record<number, string>
): string[] {
  const teams: string[] = [];

  // Top slot
  if (game.topSourceGameNumber != null) {
    const sourceGame = gameMap.get(game.topSourceGameNumber);
    if (sourceGame?.isBye) {
      // Bye: the team automatically advances
      const byeTeam = sourceGame.topTeamName || sourceGame.bottomTeamName;
      if (byeTeam) teams.push(byeTeam);
    } else if (game.topSourceGameNumber in picks || picks[game.topSourceGameNumber]) {
      teams.push(picks[game.topSourceGameNumber]);
    }
  } else if (game.topTeamName) {
    teams.push(game.topTeamName);
  }

  // Bottom slot
  if (game.bottomSourceGameNumber != null) {
    const sourceGame = gameMap.get(game.bottomSourceGameNumber);
    if (sourceGame?.isBye) {
      const byeTeam = sourceGame.topTeamName || sourceGame.bottomTeamName;
      if (byeTeam) teams.push(byeTeam);
    } else if (picks[game.bottomSourceGameNumber]) {
      teams.push(picks[game.bottomSourceGameNumber]);
    }
  } else if (game.bottomTeamName) {
    teams.push(game.bottomTeamName);
  }

  return teams.filter(Boolean);
}

/**
 * Find all downstream game numbers that depend on a given game.
 * Used to clear picks when an earlier pick changes.
 */
export function getDownstreamGameNumbers(
  gameNumber: number,
  games: Game[]
): number[] {
  const downstream: number[] = [];
  const gameMap = new Map<number, Game>();
  for (const g of games) gameMap.set(g.gameNumber, g);

  function traverse(gn: number) {
    const game = gameMap.get(gn);
    if (!game?.nextGameNumber) return;
    downstream.push(game.nextGameNumber);
    traverse(game.nextGameNumber);
  }

  traverse(gameNumber);
  return downstream;
}

/**
 * Compute scores for all users in a tournament.
 */
export function computeScores(
  games: Game[],
  picksByUser: Record<string, Pick[]>
): Record<string, number> {
  const scores: Record<string, number> = {};
  const resultsMap = new Map<string, string>(); // gameId -> winnerTeamName

  for (const game of games) {
    if (game.winnerTeamName) {
      resultsMap.set(game.id, game.winnerTeamName);
    }
  }

  for (const [userId, picks] of Object.entries(picksByUser)) {
    let score = 0;
    for (const pick of picks) {
      const winner = resultsMap.get(pick.gameId);
      if (winner && pick.selectedTeam === winner) {
        score += 1;
      }
    }
    scores[userId] = score;
  }

  return scores;
}

/**
 * Build a map of gameNumber -> Game for easy lookup
 */
export function buildGameMap(games: Game[]): Map<number, Game> {
  const map = new Map<number, Game>();
  for (const g of games) map.set(g.gameNumber, g);
  return map;
}

/**
 * Get the round names for a tournament
 */
export function getRoundNames(numRounds: number): string[] {
  if (numRounds === 1) return ["Championship"];
  if (numRounds === 2) return ["Semifinals", "Championship"];
  if (numRounds === 3) return ["Quarterfinals", "Semifinals", "Championship"];
  if (numRounds === 4) return ["First Round", "Quarterfinals", "Semifinals", "Championship"];
  if (numRounds === 5) return ["Play-in", "First Round", "Quarterfinals", "Semifinals", "Championship"];

  const names: string[] = [];
  for (let i = 1; i <= numRounds; i++) {
    if (i === numRounds) names.push("Championship");
    else if (i === numRounds - 1) names.push("Semifinals");
    else if (i === numRounds - 2) names.push("Quarterfinals");
    else names.push(`Round ${i}`);
  }
  return names;
}
