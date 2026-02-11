import { prisma } from "@/lib/db";
import Link from "next/link";
import LockCountdown from "@/components/LockCountdown";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const tournaments = await prisma.tournament.findMany({
    orderBy: [{ year: "desc" }, { conferenceName: "asc" }],
    include: {
      _count: { select: { games: true, picks: true } },
    },
  });

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-2">
        Conference Tournament Pick&apos;Em
      </h1>
      <p className="text-slate-600 mb-8">
        Pick winners in college basketball conference tournaments. Select a tournament below to start making picks.
      </p>

      {tournaments.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <p className="text-lg">No tournaments yet.</p>
          <p className="text-sm mt-2">An admin needs to set up tournaments first.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((t) => {
            const totalGames = t._count.games;
            return (
              <Link
                key={t.id}
                href={`/tournaments/${t.id}`}
                className="block bg-white rounded-xl border border-slate-200 p-6 hover:border-blue-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {t.conferenceName}
                    </h2>
                    <p className="text-sm text-slate-500">{t.year} Tournament</p>
                  </div>
                  <LockCountdown lockTime={t.firstGameStart.toISOString()} />
                </div>
                <div className="flex gap-4 text-sm text-slate-500 mt-4">
                  <span>{totalGames} games</span>
                  <span>{t.numRounds} rounds</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
