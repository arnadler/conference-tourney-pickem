/**
 * Run with: npx tsx scripts/send-standings-email.ts
 * Requires .env.local with DATABASE_URL, RESEND_API_KEY, ANTHROPIC_API_KEY
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local
config({ path: resolve(process.cwd(), ".env.local") });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { calculateTournamentScores, calculateOverallScores } from "../src/lib/scoring";
import Anthropic from "@anthropic-ai/sdk";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const day = process.argv[2] ? Number(process.argv[2]) : null;
  if (!day) {
    console.error("Usage: npx tsx scripts/send-standings-email.ts <day>");
    console.error("Example: npx tsx scripts/send-standings-email.ts 3");
    process.exit(1);
  }

  console.log(`Fetching standings for Day ${day} recap...`);

  const tournaments = await prisma.tournament.findMany({
    orderBy: [{ year: "desc" }, { conferenceName: "asc" }],
    include: {
      games: true,
      picks: { include: { user: { select: { name: true, email: true } } } },
    },
  });

  const tournamentScoresMap = new Map<string, ReturnType<typeof calculateTournamentScores>>();
  for (const t of tournaments) {
    tournamentScoresMap.set(t.id, calculateTournamentScores(t.games, t.picks));
  }
  const overallScores = calculateOverallScores(tournamentScoresMap);

  if (overallScores.length === 0) {
    console.error("No picks yet — nobody to email.");
    process.exit(1);
  }

  // Build standings summary
  let standingsSummary = "OVERALL STANDINGS:\n";
  for (const [i, s] of overallScores.entries()) {
    standingsSummary += `${i + 1}. ${s.userName || s.userEmail} — Score: ${s.score} pts, Max Possible: ${s.maxPoints} pts\n`;
  }
  for (const t of tournaments) {
    const scores = tournamentScoresMap.get(t.id) ?? [];
    if (scores.length === 0) continue;
    const gamesDecided = t.games.filter((g) => g.winnerTeamName && !g.isBye).length;
    const totalGames = t.games.filter((g) => !g.isBye).length;
    standingsSummary += `\n${t.conferenceName} ${t.year} (${gamesDecided}/${totalGames} games played):\n`;
    for (const [i, s] of scores.entries()) {
      standingsSummary += `${i + 1}. ${s.userName || s.userEmail} — Score: ${s.score} pts, Max Possible: ${s.maxPoints} pts\n`;
    }
  }

  console.log("\nCurrent standings:\n" + standingsSummary);

  // Generate email with Claude
  console.log("Generating email with Claude...");
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You're writing a cheeky, trash-talky end-of-day recap email for a college basketball conference tournament pick'em competition between friends. Day ${day} just wrapped up.

Write a funny, slightly savage but friendly email to all participants. Roast whoever is in last, hype up the leader, note any close battles, comment on the "Max Points" ceiling (someone with a low max is basically mathematically cooked), and bring the energy. Sign it "— The Commissioner 🏀".

Keep it under 300 words. Write it as plain text with line breaks — no HTML tags.

Current standings:
${standingsSummary}`,
      },
    ],
  });

  const emailText = (response.content[0] as { type: string; text: string }).text;
  console.log("\n--- EMAIL PREVIEW ---\n" + emailText + "\n--- END PREVIEW ---\n");

  const emailHtml = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b;">
      <div style="font-size: 28px; margin-bottom: 16px;">🏀 Day ${day} Recap</div>
      <div style="font-size: 15px; line-height: 1.7; white-space: pre-line;">${emailText}</div>
      <hr style="margin: 24px 0; border: none; border-top: 1px solid #e2e8f0;" />
      <div style="font-size: 12px; color: #94a3b8;">
        View full standings at <a href="https://conftourneypickem.com/standings" style="color: #3b82f6;">conftourneypickem.com/standings</a>
      </div>
    </div>
  `;

  // Get all player emails
  const players = await prisma.user.findMany({
    where: { picks: { some: {} }, email: { not: null } },
    select: { email: true, name: true },
  });
  const emails = players.map((p) => p.email).filter(Boolean) as string[];
  console.log(`Sending to ${emails.length} players: ${emails.join(", ")}`);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Pick'Em Commissioner <noreply@conftourneypickem.com>",
      to: emails,
      subject: `🏀 Day ${day} Pick'Em Standings — Who's cooked?`,
      html: emailHtml,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    console.error("Resend error:", err);
    process.exit(1);
  }

  console.log(`✓ Email sent to ${emails.length} players!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
