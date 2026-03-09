"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface GameData {
  id: string;
  gameNumber: number;
  round: number;
  position: number;
  topTeamName: string | null;
  bottomTeamName: string | null;
  topSeedLabel: string | null;
  bottomSeedLabel: string | null;
  winnerTeamName: string | null;
  isBye: boolean;
  topSourceGameNumber: number | null;
  bottomSourceGameNumber: number | null;
}

export default function AdminResultsClient({
  games,
  tournamentId,
}: {
  games: GameData[];
  tournamentId: string;
}) {
  const [saving, setSaving] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function enterResult(gameNumber: number, winnerTeamName: string) {
    setSaving(gameNumber);
    setError(null);

    try {
      const res = await fetch("/api/admin/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentId, gameNumber, winnerTeamName }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to enter result");
      } else {
        router.refresh();
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(null);
    }
  }

  // Group by round
  const rounds = new Map<number, GameData[]>();
  for (const g of games) {
    if (!rounds.has(g.round)) rounds.set(g.round, []);
    rounds.get(g.round)!.push(g);
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {Array.from(rounds.entries())
        .sort(([a], [b]) => a - b)
        .map(([round, roundGames]) => (
          <div key={round}>
            <h2 className="text-lg font-semibold text-slate-700 mb-3">Round {round}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {roundGames.map((game) => {
                if (game.isBye) {
                  return (
                    <div
                      key={game.gameNumber}
                      className="bg-slate-50 rounded-lg border border-slate-200 p-4 opacity-60"
                    >
                      <div className="text-xs text-slate-400 mb-2">
                        Game {game.gameNumber} (BYE)
                      </div>
                      <div className="text-sm text-slate-600">
                        {game.topTeamName || game.bottomTeamName} auto-advances
                      </div>
                    </div>
                  );
                }

                const hasResult = !!game.winnerTeamName;
                const topTeam = game.topTeamName;
                const bottomTeam = game.bottomTeamName;

                return (
                  <div
                    key={game.gameNumber}
                    className={`bg-white rounded-lg border p-4 ${
                      hasResult ? "border-green-200 bg-green-50" : "border-slate-200"
                    }`}
                  >
                    <div className="text-xs text-slate-400 mb-2">
                      Game {game.gameNumber}
                      {hasResult && (
                        <span className="ml-2 text-green-600 font-medium">
                          Winner: {game.winnerTeamName}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <button
                        onClick={() => topTeam && enterResult(game.gameNumber, topTeam)}
                        disabled={!topTeam || saving === game.gameNumber}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                          game.winnerTeamName === topTeam
                            ? "bg-green-200 text-green-800 font-medium"
                            : topTeam
                            ? "bg-slate-100 hover:bg-blue-100 cursor-pointer"
                            : "bg-slate-50 text-slate-400 cursor-not-allowed"
                        }`}
                      >
                        {topTeam || game.topSeedLabel || "TBD"}
                      </button>
                      <button
                        onClick={() => bottomTeam && enterResult(game.gameNumber, bottomTeam)}
                        disabled={!bottomTeam || saving === game.gameNumber}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                          game.winnerTeamName === bottomTeam
                            ? "bg-green-200 text-green-800 font-medium"
                            : bottomTeam
                            ? "bg-slate-100 hover:bg-blue-100 cursor-pointer"
                            : "bg-slate-50 text-slate-400 cursor-not-allowed"
                        }`}
                      >
                        {bottomTeam || game.bottomSeedLabel || "TBD"}
                      </button>
                    </div>

                    {saving === game.gameNumber && (
                      <div className="text-xs text-blue-600 mt-2">Saving...</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
    </div>
  );
}
