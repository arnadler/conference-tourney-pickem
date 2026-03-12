import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import DeleteTournamentButton from "./DeleteTournamentButton";
import SendEmailButton from "./SendEmailButton";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/admin");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.isAdmin) redirect("/");

  const tournaments = await prisma.tournament.findMany({
    orderBy: [{ year: "desc" }, { conferenceName: "asc" }],
    include: {
      _count: { select: { games: true, picks: true } },
      games: { where: { winnerTeamName: { not: null }, isBye: false }, select: { id: true } },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
        <div className="flex items-center gap-3">
          <SendEmailButton />
          <Link
            href="/admin/import"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors"
          >
            Import Tournament
          </Link>
        </div>
      </div>

      {tournaments.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <p className="text-lg">No tournaments yet.</p>
          <p className="text-sm mt-2">
            <Link href="/admin/import" className="text-blue-600 underline">
              Import a tournament
            </Link>{" "}
            to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tournaments.map((t) => {
            const gamesWithResults = t.games.length;
            return (
              <div
                key={t.id}
                className="bg-white rounded-xl border border-slate-200 p-6 flex items-center justify-between"
              >
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {t.conferenceName} {t.year}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {t._count.games} games &middot; {t._count.picks} total picks &middot;{" "}
                    {gamesWithResults} results entered
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Lock: {new Date(t.firstGameStart).toLocaleString("en-US", { timeZone: "America/New_York" })} ET
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/admin/tournaments/${t.id}`}
                    className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                  >
                    Manage / Enter Results
                  </Link>
                  <DeleteTournamentButton tournamentId={t.id} name={`${t.conferenceName} ${t.year}`}/>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
