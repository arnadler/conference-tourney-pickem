import { describe, it, expect } from "vitest";
import {
  isTournamentLocked,
  validateBracketConsistency,
  getPossibleTeams,
  getDownstreamGameNumbers,
  getRoundNames,
  buildGameMap,
} from "../lib/bracket-utils";
import type { Game } from "../generated/prisma/client";

// Helper to create a minimal Game object for testing
function makeGame(overrides: Partial<Game> & { gameNumber: number; round: number }): Game {
  return {
    id: `game-${overrides.gameNumber}`,
    tournamentId: "test-tournament",
    position: 0,
    startTime: null,
    topSeedLabel: null,
    bottomSeedLabel: null,
    topTeamName: null,
    bottomTeamName: null,
    topSourceGameNumber: null,
    bottomSourceGameNumber: null,
    nextGameNumber: null,
    nextSlot: null,
    winnerTeamName: null,
    resultEnteredBy: null,
    resultEnteredAt: null,
    isBye: false,
    ...overrides,
  };
}

describe("isTournamentLocked", () => {
  it("returns true when current time is past lock time", () => {
    const pastDate = new Date("2020-01-01");
    expect(isTournamentLocked(pastDate)).toBe(true);
  });

  it("returns false when current time is before lock time", () => {
    const futureDate = new Date("2099-01-01");
    expect(isTournamentLocked(futureDate)).toBe(false);
  });
});

describe("getPossibleTeams", () => {
  it("returns actual teams for first-round games", () => {
    const game = makeGame({
      gameNumber: 1,
      round: 1,
      topTeamName: "Auburn",
      bottomTeamName: "Vanderbilt",
    });
    const gameMap = buildGameMap([game]);
    const possible = getPossibleTeams(game, gameMap, {});
    expect(possible).toEqual(["Auburn", "Vanderbilt"]);
  });

  it("returns picked teams for later rounds", () => {
    const game1 = makeGame({
      gameNumber: 1,
      round: 1,
      topTeamName: "Auburn",
      bottomTeamName: "Vanderbilt",
      nextGameNumber: 3,
      nextSlot: "top",
    });
    const game2 = makeGame({
      gameNumber: 2,
      round: 1,
      topTeamName: "Alabama",
      bottomTeamName: "Florida",
      nextGameNumber: 3,
      nextSlot: "bottom",
    });
    const game3 = makeGame({
      gameNumber: 3,
      round: 2,
      topSourceGameNumber: 1,
      bottomSourceGameNumber: 2,
    });

    const games = [game1, game2, game3];
    const gameMap = buildGameMap(games);
    const picks = { 1: "Auburn", 2: "Florida" };

    const possible = getPossibleTeams(game3, gameMap, picks);
    expect(possible).toEqual(["Auburn", "Florida"]);
  });

  it("handles bye games correctly", () => {
    const byeGame = makeGame({
      gameNumber: 1,
      round: 1,
      topTeamName: "Alabama",
      isBye: true,
      nextGameNumber: 2,
      nextSlot: "top",
    });
    const game2 = makeGame({
      gameNumber: 2,
      round: 2,
      topSourceGameNumber: 1,
      bottomTeamName: "Florida",
    });

    const gameMap = buildGameMap([byeGame, game2]);
    const possible = getPossibleTeams(game2, gameMap, {});
    expect(possible).toContain("Alabama");
    expect(possible).toContain("Florida");
  });
});

describe("getDownstreamGameNumbers", () => {
  it("finds all downstream games in a chain", () => {
    const games = [
      makeGame({ gameNumber: 1, round: 1, nextGameNumber: 3, nextSlot: "top" }),
      makeGame({ gameNumber: 2, round: 1, nextGameNumber: 3, nextSlot: "bottom" }),
      makeGame({ gameNumber: 3, round: 2, nextGameNumber: 5, nextSlot: "top" }),
      makeGame({ gameNumber: 4, round: 2, nextGameNumber: 5, nextSlot: "bottom" }),
      makeGame({ gameNumber: 5, round: 3 }),
    ];

    const downstream = getDownstreamGameNumbers(1, games);
    expect(downstream).toContain(3);
    expect(downstream).toContain(5);
    expect(downstream).not.toContain(1);
    expect(downstream).not.toContain(2);
  });

  it("returns empty array for championship game", () => {
    const games = [makeGame({ gameNumber: 1, round: 1 })];
    const downstream = getDownstreamGameNumbers(1, games);
    expect(downstream).toEqual([]);
  });
});

describe("validateBracketConsistency", () => {
  it("allows valid first-round picks", () => {
    const games = [
      makeGame({
        gameNumber: 1,
        round: 1,
        topTeamName: "Auburn",
        bottomTeamName: "Vanderbilt",
      }),
    ];
    const result = validateBracketConsistency(games, { 1: "Auburn" });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("detects picks for nonexistent games", () => {
    const result = validateBracketConsistency([], { 99: "SomeTeam" });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("does not exist");
  });

  it("detects inconsistent bracket picks", () => {
    const game1 = makeGame({
      gameNumber: 1,
      round: 1,
      topTeamName: "Auburn",
      bottomTeamName: "Vanderbilt",
      nextGameNumber: 3,
      nextSlot: "top",
    });
    const game2 = makeGame({
      gameNumber: 2,
      round: 1,
      topTeamName: "Alabama",
      bottomTeamName: "Florida",
      nextGameNumber: 3,
      nextSlot: "bottom",
    });
    const game3 = makeGame({
      gameNumber: 3,
      round: 2,
      topSourceGameNumber: 1,
      bottomSourceGameNumber: 2,
    });

    const games = [game1, game2, game3];
    // Pick Vanderbilt in game 1 but Auburn in game 3 — inconsistent
    const result = validateBracketConsistency(games, {
      1: "Vanderbilt",
      2: "Alabama",
      3: "Auburn", // can't advance if they lost game 1
    });
    expect(result.valid).toBe(false);
  });
});

describe("getRoundNames", () => {
  it("returns correct names for 4-round tournament", () => {
    const names = getRoundNames(4);
    expect(names).toEqual(["First Round", "Quarterfinals", "Semifinals", "Championship"]);
  });

  it("returns Championship for single round", () => {
    expect(getRoundNames(1)).toEqual(["Championship"]);
  });

  it("returns correct names for 2-round tournament", () => {
    expect(getRoundNames(2)).toEqual(["Semifinals", "Championship"]);
  });
});
