import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./db";

const providers: any[] = [
  CredentialsProvider({
    name: "Dev Login",
    credentials: {
      email: { label: "Email", type: "email", placeholder: "admin@example.com" },
    },
    async authorize(credentials) {
      const email = credentials?.email as string;
      if (!email) return null;

      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            name: email.split("@")[0],
            emailVerified: new Date(),
          },
        });
      }
      return { id: user.id, email: user.email, name: user.name };
    },
  }),
];

// Add email provider only if SMTP is configured
if (process.env.EMAIL_SERVER_HOST) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const EmailProvider = require("next-auth/providers/email").default;
  providers.push(
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT || 587),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM || "noreply@pickem.local",
    })
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma) as any,
  providers,
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
        (session.user as unknown as Record<string, unknown>).isAdmin =
          dbUser?.isAdmin ?? false;
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
