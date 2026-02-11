import { z } from "zod";

export const tournamentImportGameSchema = z.object({
  gameNumber: z.number().int().positive(),
  round: z.number().int().positive(),
  position: z.number().int().nonnegative(),
  startTime: z.string().optional().nullable(),
  topSeed: z.number().optional().nullable(),
  bottomSeed: z.number().optional().nullable(),
  topTeamName: z.string().optional().nullable(),
  bottomTeamName: z.string().optional().nullable(),
  topSourceGameNumber: z.number().optional().nullable(),
  bottomSourceGameNumber: z.number().optional().nullable(),
  nextGameNumber: z.number().optional().nullable(),
  nextSlot: z.enum(["top", "bottom"]).optional().nullable(),
  isBye: z.boolean().optional().default(false),
  topSeedLabel: z.string().optional().nullable(),
  bottomSeedLabel: z.string().optional().nullable(),
});

export const tournamentImportSchema = z.object({
  conferenceName: z.string().min(1).max(50),
  year: z.number().int().min(2000).max(2100),
  timezone: z.string().default("America/New_York"),
  firstGameStart: z.string(), // ISO datetime string
  teams: z
    .array(
      z.object({
        seed: z.number().int().positive(),
        name: z.string().min(1),
      })
    )
    .optional(),
  games: z.array(tournamentImportGameSchema).min(1),
});

export type TournamentImportData = z.infer<typeof tournamentImportSchema>;
export type GameImportData = z.infer<typeof tournamentImportGameSchema>;

export const savePicksSchema = z.object({
  tournamentId: z.string(),
  picks: z.array(
    z.object({
      gameNumber: z.number().int().positive(),
      selectedTeam: z.string().min(1),
    })
  ),
});

export const enterResultSchema = z.object({
  tournamentId: z.string(),
  gameNumber: z.number().int().positive(),
  winnerTeamName: z.string().min(1),
});

export const bulkResultSchema = z.object({
  tournamentId: z.string(),
  results: z.array(
    z.object({
      gameNumber: z.number().int().positive(),
      winnerTeamName: z.string().min(1),
    })
  ),
});
