import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MyPicksPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/my-picks");
  }

  const tournaments = await prisma.tournament.findMany({
    orderBy: [{ year: "desc" }, { conferenceName: "asc" }],
    include: {
      games: true,
    },
  });

  const allPicks = await prisma.pick.findMany({
    where: { userId: session.user.id },
  });

  // Group picks by tournament
  const picksByTournament = new Map<string, typeof allPicks>();
  for (const pick of allPicks) {
    if (!picksByTournament.has(pick.tournamentId)) {
      picksByTournament.set(pick.tournamentId, []);
    }
    picksByTournament.get(pick.tournamentId)!.push(pick);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-8">My Picks</h1>

      {tournaments.length === 0 ? (
        <p className="text-slate-500">No tournaments available.</p>
      ) : (
        <div className="space-y-6">
          {tournaments.map((t) => {
            const picks = picksByTournament.get(t.id) || [];
            const gameById = new Map(t.games.map((g) => [g.id, g]));
            const nonByeGames = t.games.filter((g) => !g.isBye).length;
            const correctPicks = picks.filter((p) => p.isCorrect === true).length;
            const incorrectPicks = picks.filter((p) => p.isCorrect === false).length;
            const pending = picks.filter((p) => p.isCorrect === null).length;
            const score = picks.reduce((sum, p) => {
              if (p.isCorrect !== true) return sum;
              return sum + (gameById.get(p.gameId)?.round ?? 0);
            }, 0);

            return (
              <div
                key={t.id}
                className="bg-white rounded-xl border border-slate-200 p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      {t.conferenceName} {t.year}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                      {picks.length} of {nonByeGames} games picked
                    </p>
                  </div>
                  <Link
                    href={`/tournaments/${t.id}`}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {picks.length === 0 ? "Make Picks →" : "View Bracket →"}
                  </Link>
                </div>

                {picks.length > 0 && (
                  <div className="flex gap-4 mt-4 text-sm items-center">
                    <span className="text-slate-900 font-bold text-base">
                      {score} pts
                    </span>
                    <span className="text-green-600 font-medium">
                      {correctPicks} correct
                    </span>
                    <span className="text-red-600 font-medium">
                      {incorrectPicks} incorrect
                    </span>
                    <span className="text-slate-500">
                      {pending} pending
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
