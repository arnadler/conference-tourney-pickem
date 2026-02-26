import { describe, it, expect } from "vitest";
import {
  calculateTournamentScores,
  calculateOverallScores,
  scorePick,
} from "../lib/scoring";
import type { Game, Pick } from "../generated/prisma/client";

function makeGame(overrides: Partial<Game> & { id: string; gameNumber: number }): Game {
  return {
    tournamentId: "t1",
    round: 1,
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

function makePick(
  overrides: Partial<Pick> & { userId: string; gameId: string; selectedTeam: string }
): Pick & { user: { name: string | null; email: string | null } } {
  return {
    id: `pick-${overrides.userId}-${overrides.gameId}`,
    tournamentId: "t1",
    gameNumber: 1,
    isCorrect: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: { name: overrides.userId, email: `${overrides.userId}@test.com` },
    ...overrides,
  };
}

describe("calculateTournamentScores", () => {
  it("scores correct picks", () => {
    const games = [
      makeGame({ id: "g1", gameNumber: 1, winnerTeamName: "Auburn" }),
      makeGame({ id: "g2", gameNumber: 2, winnerTeamName: "Alabama" }),
    ];

    const picks = [
      makePick({ userId: "user1", gameId: "g1", selectedTeam: "Auburn", gameNumber: 1 }),
      makePick({ userId: "user1", gameId: "g2", selectedTeam: "Alabama", gameNumber: 2 }),
    ];

    const scores = calculateTournamentScores(games, picks);
    expect(scores).toHaveLength(1);
    expect(scores[0].score).toBe(2);
    expect(scores[0].correctPicks).toBe(2);
  });

  it("scores incorrect picks as 0", () => {
    const games = [
      makeGame({ id: "g1", gameNumber: 1, winnerTeamName: "Auburn" }),
    ];

    const picks = [
      makePick({ userId: "user1", gameId: "g1", selectedTeam: "Vanderbilt", gameNumber: 1 }),
    ];

    const scores = calculateTournamentScores(games, picks);
    expect(scores[0].score).toBe(0);
    expect(scores[0].correctPicks).toBe(0);
  });

  it("handles games with no result yet", () => {
    const games = [
      makeGame({ id: "g1", gameNumber: 1, winnerTeamName: null }),
    ];

    const picks = [
      makePick({ userId: "user1", gameId: "g1", selectedTeam: "Auburn", gameNumber: 1 }),
    ];

    const scores = calculateTournamentScores(games, picks);
    expect(scores[0].score).toBe(0);
  });

  it("awards round-based points (R1=1pt, R2=2pt, etc.)", () => {
    const games = [
      makeGame({ id: "g1", gameNumber: 1, round: 1, winnerTeamName: "Auburn" }),
      makeGame({ id: "g2", gameNumber: 2, round: 2, winnerTeamName: "Alabama" }),
      makeGame({ id: "g3", gameNumber: 3, round: 3, winnerTeamName: "Florida" }),
    ];

    const picks = [
      makePick({ userId: "user1", gameId: "g1", selectedTeam: "Auburn", gameNumber: 1 }),
      makePick({ userId: "user1", gameId: "g2", selectedTeam: "Alabama", gameNumber: 2 }),
      makePick({ userId: "user1", gameId: "g3", selectedTeam: "Florida", gameNumber: 3 }),
    ];

    const scores = calculateTournamentScores(games, picks);
    expect(scores[0].score).toBe(6); // 1 + 2 + 3
    expect(scores[0].correctPicks).toBe(3);
    expect(scores[0].possiblePoints).toBe(6); // 1 + 2 + 3
  });

  it("sorts users by score descending", () => {
    const games = [
      makeGame({ id: "g1", gameNumber: 1, winnerTeamName: "Auburn" }),
      makeGame({ id: "g2", gameNumber: 2, winnerTeamName: "Alabama" }),
    ];

    const picks = [
      makePick({ userId: "user1", gameId: "g1", selectedTeam: "Auburn", gameNumber: 1 }),
      makePick({ userId: "user1", gameId: "g2", selectedTeam: "Florida", gameNumber: 2 }),
      makePick({ userId: "user2", gameId: "g1", selectedTeam: "Auburn", gameNumber: 1 }),
      makePick({ userId: "user2", gameId: "g2", selectedTeam: "Alabama", gameNumber: 2 }),
    ];

    const scores = calculateTournamentScores(games, picks);
    expect(scores[0].userId).toBe("user2");
    expect(scores[0].score).toBe(2);
    expect(scores[1].userId).toBe("user1");
    expect(scores[1].score).toBe(1);
  });
});

describe("calculateOverallScores", () => {
  it("aggregates scores across tournaments", () => {
    const tournament1Scores = [
      { userId: "user1", userName: "User 1", userEmail: "u1@test.com", score: 3, totalPicks: 5, correctPicks: 3, possiblePoints: 5 },
      { userId: "user2", userName: "User 2", userEmail: "u2@test.com", score: 2, totalPicks: 5, correctPicks: 2, possiblePoints: 5 },
    ];
    const tournament2Scores = [
      { userId: "user1", userName: "User 1", userEmail: "u1@test.com", score: 1, totalPicks: 3, correctPicks: 1, possiblePoints: 3 },
      { userId: "user2", userName: "User 2", userEmail: "u2@test.com", score: 3, totalPicks: 3, correctPicks: 3, possiblePoints: 3 },
    ];

    const map = new Map<string, typeof tournament1Scores>();
    map.set("t1", tournament1Scores);
    map.set("t2", tournament2Scores);

    const overall = calculateOverallScores(map);
    // user2: 2+3=5, user1: 3+1=4
    expect(overall[0].userId).toBe("user2");
    expect(overall[0].score).toBe(5);
    expect(overall[1].userId).toBe("user1");
    expect(overall[1].score).toBe(4);
  });
});

describe("scorePick", () => {
  it("returns true for correct pick", () => {
    const game = makeGame({ id: "g1", gameNumber: 1, winnerTeamName: "Auburn" });
    const pick = makePick({ userId: "u1", gameId: "g1", selectedTeam: "Auburn" });
    expect(scorePick(pick, game)).toBe(true);
  });

  it("returns false for incorrect pick", () => {
    const game = makeGame({ id: "g1", gameNumber: 1, winnerTeamName: "Auburn" });
    const pick = makePick({ userId: "u1", gameId: "g1", selectedTeam: "Vanderbilt" });
    expect(scorePick(pick, game)).toBe(false);
  });

  it("returns null when no result yet", () => {
    const game = makeGame({ id: "g1", gameNumber: 1, winnerTeamName: null });
    const pick = makePick({ userId: "u1", gameId: "g1", selectedTeam: "Auburn" });
    expect(scorePick(pick, game)).toBe(null);
  });
});
