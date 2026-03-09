"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Game } from "@/generated/prisma/client";
import Bracket from "@/components/Bracket";

interface GameData {
  id: string;
  tournamentId: string;
  round: number;
  gameNumber: number;
  position: number;
  startTime: string | null;
  topSeedLabel: string | null;
  bottomSeedLabel: string | null;
  topTeamName: string | null;
  bottomTeamName: string | null;
  topSourceGameNumber: number | null;
  bottomSourceGameNumber: number | null;
  nextGameNumber: number | null;
  nextSlot: string | null;
  winnerTeamName: string | null;
  resultEnteredBy: string | null;
  resultEnteredAt: string | null;
  isBye: boolean;
}

interface Props {
  games: GameData[];
  numRounds: number;
  initialPicks: Record<number, string>;
  results: Record<number, string>;
  locked: boolean;
  tournamentId: string;
  loggedIn: boolean;
}

export default function TournamentBracketClient({
  games,
  numRounds,
  initialPicks,
  results,
  locked,
  tournamentId,
  loggedIn,
}: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    // Picks are already auto-saved; just navigate back to my-picks
    router.push("/my-picks");
  }

  const bracketGames = useMemo<Game[]>(
    () =>
      games.map((game) => ({
        ...game,
        startTime: game.startTime ? new Date(game.startTime) : null,
        resultEnteredAt: game.resultEnteredAt ? new Date(game.resultEnteredAt) : null,
      })),
    [games]
  );

  const handleSave = useCallback(
    async (picks: Record<number, string>) => {
      if (!loggedIn) return;

      const picksArray = Object.entries(picks).map(([gameNumber, selectedTeam]) => ({
        gameNumber: Number(gameNumber),
        selectedTeam,
      }));

      const res = await fetch("/api/picks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentId, picks: picksArray }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save picks");
      }
    },
    [tournamentId, loggedIn]
  );

  return (
    <div>
      <Bracket
        games={bracketGames}
        numRounds={numRounds}
        picks={initialPicks}
        results={results}
        locked={locked || !loggedIn}
        onSave={handleSave}
      />
      {loggedIn && !locked && (
        <div className="flex justify-center mt-8">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Submitting..." : "Submit Picks"}
          </button>
        </div>
      )}
    </div>
  );
}
