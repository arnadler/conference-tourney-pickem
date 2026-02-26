import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function UserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ tournament?: string }>;
}) {
  const { userId } = await params;
  const { tournament: filterTournamentId } = await searchParams;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });

  if (!user) notFound();

  const tournaments = await prisma.tournament.findMany({
    where: filterTournamentId ? { id: filterTournamentId } : undefined,
    orderBy: [{ year: "desc" }, { conferenceName: "asc" }],
    include: { games: { orderBy: [{ round: "asc" }, { position: "asc" }] } },
  });

  const picks = await prisma.pick.findMany({
    where: {
      userId,
      ...(filterTournamentId ? { tournamentId: filterTournamentId } : {}),
    },
  });

  const picksByGame = new Map<string, typeof picks[0]>();
  for (const p of picks) picksByGame.set(p.gameId, p);

  return (
    <div>
      <Link href="/standings" className="text-sm text-blue-600 hover:text-blue-800 mb-6 block">
        ← Back to Standings
      </Link>

      <h1 className="text-3xl font-bold text-slate-900 mb-8">
        {user.name || user.email || "User"}&apos;s Picks
      </h1>

      {tournaments.map((t) => (
        <section key={t.id} className="mb-10">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">
            {t.conferenceName} {t.year}
          </h2>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-2 font-medium text-slate-600">Game</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-600">Round</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-600">Matchup</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-600">Pick</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-600">Result</th>
                  <th className="text-center px-4 py-2 font-medium text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {t.games
                  .filter((g) => !g.isBye)
                  .map((game) => {
                    const pick = picksByGame.get(game.id);
                    const isCorrect = pick?.isCorrect === true;
                    const isIncorrect = pick?.isCorrect === false;

                    return (
                      <tr key={game.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-2 text-slate-500">#{game.gameNumber}</td>
                        <td className="px-4 py-2 text-slate-600">R{game.round}</td>
                        <td className="px-4 py-2 text-slate-700">
                          {game.topTeamName || game.topSeedLabel || "TBD"} vs{" "}
                          {game.bottomTeamName || game.bottomSeedLabel || "TBD"}
                        </td>
                        <td className="px-4 py-2 font-medium">
                          {pick?.selectedTeam || (
                            <span className="text-slate-400">No pick</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-slate-600">
                          {game.winnerTeamName || (
                            <span className="text-slate-400">Pending</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {isCorrect && (
                            <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                              Correct
                            </span>
                          )}
                          {isIncorrect && (
                            <span className="inline-block px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                              Wrong
                            </span>
                          )}
                          {!pick && (
                            <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-xs">
                              —
                            </span>
                          )}
                          {pick && pick.isCorrect === null && (
                            <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
