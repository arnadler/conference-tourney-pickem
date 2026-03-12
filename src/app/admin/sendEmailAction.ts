"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { calculateTournamentScores, calculateOverallScores } from "@/lib/scoring";
import { buildStandingsSummary } from "@/lib/standings-summary";
import Anthropic from "@anthropic-ai/sdk";

export async function sendStandingsEmail(day: number): Promise<{ success: boolean; error?: string; sent?: number; preview?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Not authenticated" };

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.isAdmin) return { success: false, error: "Not authorized" };

  // Fetch all tournaments with picks
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
    return { success: false, error: "No picks yet — nobody to email." };
  }

  const standingsSummary = buildStandingsSummary(tournaments, tournamentScoresMap, overallScores);

  // Generate email with Claude
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You're writing a cheeky, trash-talky end-of-day recap email for a college basketball conference tournament pick'em competition between friends. Day ${day} just wrapped up.

Write a funny, slightly savage but friendly email to all participants. Include:
- Hype up the leader, roast anyone in last place
- Call out players marked "DRAWING DEAD" — their Max Possible is already below the leader's current score, meaning they literally cannot win. Be ruthless but funny about it.
- For players still alive, use the "Remaining games and picks" data to call out specific "needs" — e.g. "Alex needs Virginia to beat Miami or he's cooked." Look for games where two players picked different teams and one needs their pick to win to stay in contention.
- Keep the overall energy fun and trash-talky

Sign it "— The Commissioner 🏀". Under 400 words. Plain text with line breaks only — no HTML.

Data:
${standingsSummary}`,
      },
    ],
  });

  const emailText = (response.content[0] as { type: string; text: string }).text;

  // Convert line breaks to HTML
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

  // Get all users who have made picks
  const players = await prisma.user.findMany({
    where: { picks: { some: {} }, email: { not: null } },
    select: { email: true },
  });

  const emails = players.map((p) => p.email).filter(Boolean) as string[];
  if (emails.length === 0) return { success: false, error: "No player emails found." };

  // Send via Resend
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
    return { success: false, error: JSON.stringify(err) };
  }

  return { success: true, sent: emails.length, preview: emailText };
}
