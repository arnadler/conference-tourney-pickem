import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import AdminResultsClient from "./AdminResultsClient";

export const dynamic = "force-dynamic";

export default async function AdminTournamentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.isAdmin) redirect("/");

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      games: { orderBy: [{ round: "asc" }, { position: "asc" }] },
    },
  });

  if (!tournament) notFound();

  const gamesData = tournament.games.map((g) => ({
    id: g.id,
    gameNumber: g.gameNumber,
    round: g.round,
    position: g.position,
    topTeamName: g.topTeamName,
    bottomTeamName: g.bottomTeamName,
    topSeedLabel: g.topSeedLabel,
    bottomSeedLabel: g.bottomSeedLabel,
    winnerTeamName: g.winnerTeamName,
    isBye: g.isBye,
    topSourceGameNumber: g.topSourceGameNumber,
    bottomSourceGameNumber: g.bottomSourceGameNumber,
  }));

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-2">
        {tournament.conferenceName} {tournament.year} — Enter Results
      </h1>
      <p className="text-sm text-slate-500 mb-8">
        Click the winning team for each completed game. Results are saved immediately and picks are auto-scored.
      </p>

      <AdminResultsClient games={gamesData} tournamentId={tournament.id} />
    </div>
  );
}
