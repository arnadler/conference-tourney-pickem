import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import { prisma } from "./db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  debug: process.env.NODE_ENV !== "production",
  adapter: PrismaAdapter(prisma),
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: "noreply@conftourneypickem.com",
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
