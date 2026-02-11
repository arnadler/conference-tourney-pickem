import { prisma } from "@/lib/db";
import { calculateTournamentScores, calculateOverallScores, type UserScore } from "@/lib/scoring";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function StandingsPage() {
  const tournaments = await prisma.tournament.findMany({
    orderBy: [{ year: "desc" }, { conferenceName: "asc" }],
    include: {
      games: true,
      picks: { include: { user: { select: { name: true, email: true } } } },
    },
  });

  // Calculate per-tournament scores
  const tournamentScoresMap = new Map<string, UserScore[]>();
  for (const t of tournaments) {
    const scores = calculateTournamentScores(t.games, t.picks);
    tournamentScoresMap.set(t.id, scores);
  }

  // Calculate overall scores
  const overallScores = calculateOverallScores(tournamentScoresMap);

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Standings</h1>

      {/* Overall Leaderboard */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Overall Leaderboard</h2>
        {overallScores.length === 0 ? (
          <p className="text-slate-500">No picks yet.</p>
        ) : (
          <LeaderboardTable scores={overallScores} />
        )}
      </section>

      {/* Per-tournament standings */}
      {tournaments.map((t) => {
        const scores = tournamentScoresMap.get(t.id) || [];
        return (
          <section key={t.id} className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-800">
                {t.conferenceName} {t.year}
              </h2>
              <Link
                href={`/standings/${t.id}`}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Full Details →
              </Link>
            </div>
            {scores.length === 0 ? (
              <p className="text-slate-500 text-sm">No picks yet.</p>
            ) : (
              <LeaderboardTable scores={scores.slice(0, 5)} compact />
            )}
          </section>
        );
      })}
    </div>
  );
}

function LeaderboardTable({ scores, compact }: { scores: UserScore[]; compact?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left px-4 py-3 font-medium text-slate-600 w-12">#</th>
            <th className="text-left px-4 py-3 font-medium text-slate-600">Player</th>
            <th className="text-right px-4 py-3 font-medium text-slate-600">Score</th>
            {!compact && (
              <>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Correct</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Total Picks</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {scores.map((s, i) => (
            <tr key={s.userId} className="border-b border-slate-100 last:border-0">
              <td className="px-4 py-3 text-slate-500 font-mono">{i + 1}</td>
              <td className="px-4 py-3">
                <Link
                  href={`/user/${s.userId}`}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  {s.userName || s.userEmail || "Anonymous"}
                </Link>
              </td>
              <td className="px-4 py-3 text-right font-bold text-slate-900">{s.score}</td>
              {!compact && (
                <>
                  <td className="px-4 py-3 text-right text-slate-600">{s.correctPicks}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{s.totalPicks}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
