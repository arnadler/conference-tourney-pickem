import { readFileSync } from "fs";
import { join } from "path";
import type { Game, User } from "@/generated/prisma/client";
import { tournamentImportSchema } from "@/lib/validators";

async function main() {
  // Dynamic import to work with Prisma 7's ESM generated client
  const { PrismaClient } = await import("@/generated/prisma/client.js");
  const { PrismaBetterSqlite3 } = await import("@prisma/adapter-better-sqlite3");
  const path = await import("path");

  const dbPath = path.join(process.cwd(), "dev.db");
  const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
  const prisma = new PrismaClient({ adapter });

  console.log("Seeding database...");

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Admin",
      isAdmin: true,
      emailVerified: new Date(),
    },
  });
  console.log(`  Admin user: ${admin.email}`);

  // Create test users
  const users: User[] = [];
  const testEmails = [
    "alice@example.com",
    "bob@example.com",
    "charlie@example.com",
    "diana@example.com",
    "eve@example.com",
  ];

  for (const email of testEmails) {
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: email.split("@")[0].charAt(0).toUpperCase() + email.split("@")[0].slice(1),
        emailVerified: new Date(),
      },
    });
    users.push(user);
    console.log(`  Test user: ${user.email}`);
  }

  // Import sample tournaments
  const sampleFiles = ["big-ten-2026.json", "acc-2026.json", "big-12-2026.json", "sec-2026.json", "big-east-2026.json"];
  const sampleDir = join(process.cwd(), "prisma", "sample-data");

  for (const file of sampleFiles) {
    const filePath = join(sampleDir, file);
    const data = tournamentImportSchema.parse(JSON.parse(readFileSync(filePath, "utf-8")));

    // Delete existing tournament if it exists
    const existing = await prisma.tournament.findUnique({
      where: {
        conferenceName_year: {
          conferenceName: data.conferenceName,
          year: data.year,
        },
      },
    });
    if (existing) {
      await prisma.pick.deleteMany({ where: { tournamentId: existing.id } });
      await prisma.game.deleteMany({ where: { tournamentId: existing.id } });
      await prisma.tournament.delete({ where: { id: existing.id } });
    }

    const numRounds = Math.max(...data.games.map((g) => g.round));
    const tournament = await prisma.tournament.create({
      data: {
        conferenceName: data.conferenceName,
        year: data.year,
        timezone: data.timezone,
        firstGameStart: new Date(data.firstGameStart),
        numRounds,
      },
    });

    for (const game of data.games) {
      await prisma.game.create({
        data: {
          tournamentId: tournament.id,
          round: game.round,
          gameNumber: game.gameNumber,
          position: game.position,
          startTime: game.startTime ? new Date(game.startTime) : null,
          topSeedLabel: game.topSeedLabel || null,
          bottomSeedLabel: game.bottomSeedLabel || null,
          topTeamName: game.topTeamName || null,
          bottomTeamName: game.bottomTeamName || null,
          topSourceGameNumber: game.topSourceGameNumber || null,
          bottomSourceGameNumber: game.bottomSourceGameNumber || null,
          nextGameNumber: game.nextGameNumber || null,
          nextSlot: game.nextSlot || null,
          isBye: game.isBye || false,
        },
      });
    }

    console.log(
      `  Tournament: ${data.conferenceName} ${data.year} (${data.games.length} games, ${numRounds} rounds)`
    );

    // Generate random picks for test users
    const games = await prisma.game.findMany({
      where: { tournamentId: tournament.id },
      orderBy: { round: "asc" },
    });

    const gameMap = new Map<number, Game>(games.map((g) => [g.gameNumber, g]));

    for (const user of users) {
      const userPicks: Record<number, string> = {};
      const sortedGames = [...games].sort((a, b) => a.round - b.round || a.position - b.position);

      for (const g of sortedGames) {
        if (g.isBye) {
          const byeTeam = g.topTeamName || g.bottomTeamName;
          if (byeTeam) userPicks[g.gameNumber] = byeTeam;
          continue;
        }

        let topTeam = g.topTeamName;
        let bottomTeam = g.bottomTeamName;

        if (g.topSourceGameNumber != null) {
          const sourceGame = gameMap.get(g.topSourceGameNumber);
          if (sourceGame?.isBye) {
            topTeam = sourceGame.topTeamName || sourceGame.bottomTeamName;
          } else if (userPicks[g.topSourceGameNumber]) {
            topTeam = userPicks[g.topSourceGameNumber];
          }
        }

        if (g.bottomSourceGameNumber != null) {
          const sourceGame = gameMap.get(g.bottomSourceGameNumber);
          if (sourceGame?.isBye) {
            bottomTeam = sourceGame.topTeamName || sourceGame.bottomTeamName;
          } else if (userPicks[g.bottomSourceGameNumber]) {
            bottomTeam = userPicks[g.bottomSourceGameNumber];
          }
        }

        if (topTeam && bottomTeam) {
          userPicks[g.gameNumber] = Math.random() > 0.5 ? topTeam : bottomTeam;
        } else if (topTeam) {
          userPicks[g.gameNumber] = topTeam;
        } else if (bottomTeam) {
          userPicks[g.gameNumber] = bottomTeam;
        }
      }

      for (const g of sortedGames) {
        if (g.isBye) continue;
        const selectedTeam = userPicks[g.gameNumber];
        if (!selectedTeam) continue;

        await prisma.pick.create({
          data: {
            userId: user.id,
            tournamentId: tournament.id,
            gameId: g.id,
            gameNumber: g.gameNumber,
            selectedTeam,
          },
        });
      }
      console.log(`    Picks for ${user.name} in ${data.conferenceName}`);
    }
  }

  console.log("\nSeed complete!");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
