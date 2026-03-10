"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import type { Game } from "@/generated/prisma/client";
import { getRoundNames, getDownstreamGameNumbers } from "@/lib/bracket-utils";

interface BracketProps {
  games: Game[];
  numRounds: number;
  picks: Record<number, string>;
  results: Record<number, string>; // gameNumber -> winnerTeamName
  locked: boolean;
  onSave: (picks: Record<number, string>) => Promise<void>;
  onSubmit?: () => void;
}

export default function Bracket({ games, numRounds, picks: initialPicks, results, locked, onSave, onSubmit }: BracketProps) {
  const [picks, setPicks] = useState<Record<number, string>>(initialPicks);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [invalidWarning, setInvalidWarning] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const picksRef = useRef(picks);

  // Keep ref in sync so handleSubmit can read latest picks without stale closure
  useEffect(() => {
    picksRef.current = picks;
  }, [picks]);

  const gameMap = useMemo(() => {
    const map = new Map<number, Game>();
    for (const g of games) map.set(g.gameNumber, g);
    return map;
  }, [games]);

  const roundNames = getRoundNames(numRounds);

  // Group games by round
  const rounds = useMemo(() => {
    const result: Game[][] = [];
    for (let r = 1; r <= numRounds; r++) {
      result.push(
        games
          .filter((g) => g.round === r)
          .sort((a, b) => a.position - b.position)
      );
    }
    return result;
  }, [games, numRounds]);

  // Get available teams for a game slot based on current picks
  const getTeams = useCallback(
    (game: Game): [string | null, string | null] => {
      let topTeam = game.topTeamName || null;
      let bottomTeam = game.bottomTeamName || null;

      if (game.topSourceGameNumber != null) {
        const source = gameMap.get(game.topSourceGameNumber);
        if (source?.isBye) {
          topTeam = source.topTeamName || source.bottomTeamName || null;
        } else if (results[game.topSourceGameNumber]) {
          topTeam = results[game.topSourceGameNumber];
        } else if (picks[game.topSourceGameNumber]) {
          topTeam = picks[game.topSourceGameNumber];
        } else {
          topTeam = null;
        }
      }

      if (game.bottomSourceGameNumber != null) {
        const source = gameMap.get(game.bottomSourceGameNumber);
        if (source?.isBye) {
          bottomTeam = source.topTeamName || source.bottomTeamName || null;
        } else if (results[game.bottomSourceGameNumber]) {
          bottomTeam = results[game.bottomSourceGameNumber];
        } else if (picks[game.bottomSourceGameNumber]) {
          bottomTeam = picks[game.bottomSourceGameNumber];
        } else {
          bottomTeam = null;
        }
      }

      return [topTeam, bottomTeam];
    },
    [picks, results, gameMap]
  );

  const handlePick = (gameNumber: number, team: string) => {
    if (locked) return;

    const game = gameMap.get(gameNumber);
    if (!game) return;

    setPicks((prev) => {
      const newPicks = { ...prev };

      // If changing a pick, check for downstream invalidation
      const oldPick = prev[gameNumber];
      if (oldPick && oldPick !== team) {
        const downstream = getDownstreamGameNumbers(gameNumber, games);
        let cleared = 0;
        for (const dg of downstream) {
          if (newPicks[dg] === oldPick) {
            delete newPicks[dg];
            cleared++;
          }
        }
        if (cleared > 0) {
          setInvalidWarning(
            `Changed pick cleared ${cleared} downstream pick${cleared > 1 ? "s" : ""} that depended on ${oldPick}.`
          );
          setTimeout(() => setInvalidWarning(null), 4000);
        }
      }

      newPicks[gameNumber] = team;
      return newPicks;
    });
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    // Cancel pending debounced save and flush immediately
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    try {
      await onSave(picksRef.current);
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
    onSubmit?.();
  };

  // Debounced auto-save
  useEffect(() => {
    if (locked) return;
    if (JSON.stringify(picks) === JSON.stringify(initialPicks)) return;

    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      setSaving(true);
      try {
        await onSave(picks);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } finally {
        setSaving(false);
      }
    }, 1500);

    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [picks, locked, onSave, initialPicks]);

  return (
    <div className="space-y-4">
      {/* Save status bar */}
      {!locked && (
        <div className="flex items-center gap-3 text-sm">
          {saving && <span className="text-blue-600">Saving...</span>}
          {saveStatus === "saved" && <span className="text-green-600">Picks saved!</span>}
          {saveStatus === "error" && <span className="text-red-600">Error saving picks. Try again.</span>}
          {invalidWarning && (
            <span className="text-amber-600 bg-amber-50 px-3 py-1 rounded-md">
              {invalidWarning}
            </span>
          )}
        </div>
      )}

      {/* Submit button */}
      {onSubmit && !locked && (
        <div className="flex justify-center mt-2 mb-2">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Submitting..." : "Submit Picks"}
          </button>
        </div>
      )}

      {/* Bracket grid */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-6 min-w-fit">
          {rounds.map((roundGames, roundIndex) => (
            <div key={roundIndex} className="flex flex-col">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 text-center">
                {roundNames[roundIndex] || `Round ${roundIndex + 1}`}
              </h3>
              <div
                className="flex flex-col justify-around flex-1 gap-2"
                style={{ minWidth: 220 }}
              >
                {roundGames.map((game) => {
                  if (game.isBye) {
                    const byeTeam = game.topTeamName || game.bottomTeamName;
                    return (
                      <div key={game.gameNumber} className="flex flex-col gap-0.5 opacity-60">
                        <div className="text-xs text-slate-400 mb-1">Game {game.gameNumber} (BYE)</div>
                        <div className="px-3 py-2 bg-slate-100 rounded text-sm text-slate-600 border border-slate-200">
                          {byeTeam || "BYE"} → advances
                        </div>
                      </div>
                    );
                  }

                  const [topTeam, bottomTeam] = getTeams(game);
                  const currentPick = picks[game.gameNumber];
                  const result = results[game.gameNumber];
                  const isCorrect = result && currentPick === result;
                  const isIncorrect = result && currentPick && currentPick !== result;

                  return (
                    <div key={game.gameNumber} className="flex flex-col gap-0.5">
                      <div className="text-xs text-slate-400 mb-1">
                        Game {game.gameNumber}
                        {result && (
                          <span className="ml-2 text-xs font-medium text-slate-600">
                            Final: {result}
                          </span>
                        )}
                      </div>
                      <div
                        className={`border rounded-lg overflow-hidden ${
                          isCorrect
                            ? "border-green-400 ring-1 ring-green-200"
                            : isIncorrect
                            ? "border-red-400 ring-1 ring-red-200"
                            : "border-slate-200"
                        }`}
                      >
                        <TeamButton
                          team={topTeam}
                          label={game.topSeedLabel}
                          selected={currentPick === topTeam && !!topTeam}
                          isWinner={result === topTeam && !!topTeam}
                          isLoser={!!result && result !== topTeam && !!topTeam}
                          disabled={locked || !topTeam}
                          onClick={() => topTeam && handlePick(game.gameNumber, topTeam)}
                        />
                        <div className="border-t border-slate-200" />
                        <TeamButton
                          team={bottomTeam}
                          label={game.bottomSeedLabel}
                          selected={currentPick === bottomTeam && !!bottomTeam}
                          isWinner={result === bottomTeam && !!bottomTeam}
                          isLoser={!!result && result !== bottomTeam && !!bottomTeam}
                          disabled={locked || !bottomTeam}
                          onClick={() => bottomTeam && handlePick(game.gameNumber, bottomTeam)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TeamButton({
  team,
  label,
  selected,
  isWinner,
  isLoser,
  disabled,
  onClick,
}: {
  team: string | null;
  label: string | null | undefined;
  selected: boolean;
  isWinner: boolean;
  isLoser: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  let bgClass = "bg-white hover:bg-blue-50";
  if (selected && isWinner) bgClass = "bg-green-100";
  else if (selected && isLoser) bgClass = "bg-red-100";
  else if (selected) bgClass = "bg-blue-100";
  else if (isWinner) bgClass = "bg-green-50";
  else if (isLoser) bgClass = "bg-slate-50";

  const textClass = isLoser ? "text-slate-400 line-through" : "text-slate-800";

  return (
    <button
      className={`w-full px-3 py-2 text-left text-sm transition-colors ${bgClass} ${
        disabled ? "cursor-not-allowed" : "cursor-pointer"
      } flex items-center justify-between`}
      disabled={disabled}
      onClick={onClick}
    >
      <span className={textClass}>
        {team || (
          <span className="text-slate-300 italic">
            {label || "TBD"}
          </span>
        )}
      </span>
      <span className="flex items-center gap-1">
        {selected && !isWinner && !isLoser && (
          <span className="text-blue-600 text-xs font-bold">✓</span>
        )}
        {isWinner && <span className="text-green-600 text-xs font-bold">✓</span>}
        {selected && isLoser && <span className="text-red-600 text-xs font-bold">✗</span>}
      </span>
    </button>
  );
}
