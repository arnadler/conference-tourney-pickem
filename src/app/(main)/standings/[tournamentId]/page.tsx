import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { calculateTournamentScores } from "@/lib/scoring";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function TournamentStandingsPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;
  const session = await auth();
  const currentUserId = session?.user?.id ?? null;

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      games: true,
      picks: { include: { user: { select: { name: true, email: true } } } },
    },
  });

  if (!tournament) notFound();

  const scores = calculateTournamentScores(tournament.games, tournament.picks);
  const gamesDecided = tournament.games.filter((g) => g.winnerTeamName && !g.isBye).length;
  const totalGames = tournament.games.filter((g) => !g.isBye).length;

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Link href="/standings" className="text-sm text-blue-600 hover:text-blue-800">
          ← All Standings
        </Link>
      </div>

      <h1 className="text-3xl font-bold text-slate-900 mb-2">
        {tournament.conferenceName} {tournament.year} Standings
      </h1>
      <p className="text-sm text-slate-500 mb-8">
        {gamesDecided} of {totalGames} games decided
      </p>

      {scores.length === 0 ? (
        <p className="text-slate-500">No picks submitted yet.</p>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-medium text-slate-600 w-12">#</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Player</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Score</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Correct</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Total Picks</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Pts Remaining</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((s, i) => (
                <tr
                  key={s.userId}
                  className={`border-b border-slate-100 last:border-0 ${s.userId === currentUserId ? "bg-blue-50" : ""}`}
                >
                  <td className="px-4 py-3 text-slate-500 font-mono">{i + 1}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/user/${s.userId}?tournament=${tournamentId}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {s.userName || s.userEmail || "Anonymous"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">{s.score}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{s.correctPicks}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{s.totalPicks}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{s.possiblePoints}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
