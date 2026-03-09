"use client";

import { useTransition } from "react";
import { deleteTournament } from "./actions";

export default function DeleteTournamentButton({
  tournamentId,
  name,
}: {
  tournamentId: string;
  name: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`Delete ${name}? This will remove all picks too.`)) return;
    startTransition(() => deleteTournament(tournamentId));
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="px-3 py-1.5 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-md transition-colors disabled:opacity-50"
    >
      {isPending ? "Deleting..." : "Delete"}
    </button>
  );
}
