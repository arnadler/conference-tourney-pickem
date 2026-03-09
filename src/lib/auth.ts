import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import type { EmailProviderSendVerificationRequestParams as SendVerificationRequestParams } from "@auth/core/providers/email";
import { prisma } from "./db";

const baseUrl = process.env.AUTH_URL ?? "https://conftourneypickem.com";

async function sendVerificationRequest({
  identifier,
  url,
  provider,
}: SendVerificationRequestParams) {
  // Wrap callback in /verify so Google's scanner can't consume the one-time token
  const verifyUrl = new URL("/verify", baseUrl);
  verifyUrl.searchParams.set("url", url);
  verifyUrl.searchParams.set("email", identifier);
  const link = verifyUrl.toString();

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${(provider as { apiKey?: string }).apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: provider.from,
      to: identifier,
      subject: "Sign in to Conference Tourney Pick'em",
      html: `<p>Click the button below to sign in. This link expires in 24 hours.</p>
<p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">Sign in to Pick'em</a></p>
<p style="color:#666;font-size:12px">Or copy this link: ${link}</p>`,
      text: `Sign in to Conference Tourney Pick'em:\n${link}`,
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error("Resend error: " + JSON.stringify(error));
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  debug: true,
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: "noreply@conftourneypickem.com",
      sendVerificationRequest,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async session({ session, token }) {
      if (token?.sub) {
        session.user.id = token.sub;
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { isAdmin: true },
        });
        session.user.isAdmin = dbUser?.isAdmin ?? false;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  pages: {
    signIn: "/login",
  },
});
