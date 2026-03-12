import type { Game, Pick } from "@/generated/prisma/client";
import type { UserScore } from "./scoring";

type PickWithUser = Pick & { user: { name: string | null; email: string | null } };

type TournamentData = {
  id: string;
  conferenceName: string;
  year: number;
  games: Game[];
  picks: PickWithUser[];
};

function displayName(s: UserScore): string {
  return s.userName || s.userEmail || "Unknown";
}

export function buildStandingsSummary(
  tournaments: TournamentData[],
  tournamentScoresMap: Map<string, UserScore[]>,
  overallScores: UserScore[]
): string {
  const leaderScore = overallScores[0]?.score ?? 0;

  // Overall standings with drawing-dead callouts
  let summary = "OVERALL STANDINGS:\n";
  for (const [i, s] of overallScores.entries()) {
    const drawingDead = s.maxPoints < leaderScore;
    const canOnlyTie = !drawingDead && s.maxPoints === leaderScore && i > 0;
    const note = drawingDead
      ? " ⚠️ DRAWING DEAD"
      : canOnlyTie
      ? " (can only tie leader)"
      : "";
    summary += `${i + 1}. ${displayName(s)} — Score: ${s.score} pts, Max Possible: ${s.maxPoints} pts${note}\n`;
  }

  // Per-tournament standings + remaining game breakdown
  for (const t of tournaments) {
    const scores = tournamentScoresMap.get(t.id) ?? [];
    if (scores.length === 0) continue;

    const gamesDecided = t.games.filter((g) => g.winnerTeamName && !g.isBye).length;
    const totalGames = t.games.filter((g) => !g.isBye).length;

    summary += `\n${t.conferenceName} ${t.year} (${gamesDecided}/${totalGames} games played):\n`;

    const tLeaderScore = scores[0]?.score ?? 0;
    for (const [i, s] of scores.entries()) {
      const drawingDead = s.maxPoints < tLeaderScore;
      const note = drawingDead ? " ⚠️ DRAWING DEAD" : "";
      summary += `  ${i + 1}. ${displayName(s)} — Score: ${s.score} pts, Max: ${s.maxPoints} pts${note}\n`;
    }

    // Build eliminated teams set
    const eliminatedTeams = new Set<string>();
    for (const game of t.games) {
      if (game.winnerTeamName && !game.isBye) {
        if (game.topTeamName && game.topTeamName !== game.winnerTeamName)
          eliminatedTeams.add(game.topTeamName);
        if (game.bottomTeamName && game.bottomTeamName !== game.winnerTeamName)
          eliminatedTeams.add(game.bottomTeamName);
      }
    }

    // Remaining undecided games with live picks grouped by team
    const undecidedGames = t.games
      .filter((g) => !g.winnerTeamName && !g.isBye)
      .sort((a, b) => a.round - b.round || a.position - b.position);

    if (undecidedGames.length > 0) {
      summary += `  Remaining games and picks:\n`;
      for (const game of undecidedGames) {
        const gamePicks = t.picks.filter(
          (p) => p.gameId === game.id && !eliminatedTeams.has(p.selectedTeam)
        );
        if (gamePicks.length === 0) continue;

        const byTeam = new Map<string, string[]>();
        for (const pick of gamePicks) {
          const name = pick.user.name || pick.user.email || "?";
          const existing = byTeam.get(pick.selectedTeam) ?? [];
          existing.push(name);
          byTeam.set(pick.selectedTeam, existing);
        }

        const roundLabel = `Round ${game.round}`;
        const teams = [...byTeam.entries()]
          .map(([team, pickers]) => `${team} (${pickers.join(", ")})`)
          .join(" vs ");
        summary += `    ${roundLabel}: ${teams}\n`;
      }
    }
  }

  return summary;
}
