import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { isTournamentLocked } from "@/lib/bracket-utils";
import LockCountdown from "@/components/LockCountdown";
import TournamentBracketClient from "./TournamentBracketClient";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      games: { orderBy: [{ round: "asc" }, { position: "asc" }] },
    },
  });

  if (!tournament) notFound();

  const locked = isTournamentLocked(tournament.firstGameStart);

  // Get user's picks if logged in
  const userPicks: Record<number, string> = {};
  if (session?.user?.id) {
    const picks = await prisma.pick.findMany({
      where: { userId: session.user.id, tournamentId: id },
    });
    for (const p of picks) {
      userPicks[p.gameNumber] = p.selectedTeam;
    }
  }

  // Get results
  const results: Record<number, string> = {};
  for (const g of tournament.games) {
    if (g.winnerTeamName) {
      results[g.gameNumber] = g.winnerTeamName;
    }
  }

  // Serialize games for client
  const gamesData = tournament.games.map((g) => ({
    id: g.id,
    tournamentId: g.tournamentId,
    round: g.round,
    gameNumber: g.gameNumber,
    position: g.position,
    startTime: g.startTime?.toISOString() || null,
    topSeedLabel: g.topSeedLabel,
    bottomSeedLabel: g.bottomSeedLabel,
    topTeamName: g.topTeamName,
    bottomTeamName: g.bottomTeamName,
    topSourceGameNumber: g.topSourceGameNumber,
    bottomSourceGameNumber: g.bottomSourceGameNumber,
    nextGameNumber: g.nextGameNumber,
    nextSlot: g.nextSlot,
    winnerTeamName: g.winnerTeamName,
    resultEnteredBy: g.resultEnteredBy,
    resultEnteredAt: g.resultEnteredAt?.toISOString() || null,
    isBye: g.isBye,
  }));

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {tournament.conferenceName} {tournament.year}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {tournament.numRounds} rounds &middot;{" "}
            {tournament.games.filter((g) => !g.isBye).length} games
          </p>
        </div>
        <div className="flex items-center gap-3">
          <LockCountdown lockTime={tournament.firstGameStart.toISOString()} />
          <Link
            href={`/standings/${tournament.id}`}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            View Standings →
          </Link>
        </div>
      </div>

      {!session ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-amber-800">
            <Link href="/login" className="font-medium underline">
              Sign in
            </Link>{" "}
            to make your picks.
          </p>
        </div>
      ) : null}

      <TournamentBracketClient
        games={gamesData}
        numRounds={tournament.numRounds}
        initialPicks={userPicks}
        results={results}
        locked={locked}
        tournamentId={tournament.id}
        loggedIn={!!session?.user?.id}
      />
    </div>
  );
}
