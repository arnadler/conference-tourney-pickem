import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import type { Provider } from "next-auth/providers";
import { prisma } from "./db";

const isProduction = process.env.NODE_ENV === "production";
const emailProviderConfigured = Boolean(process.env.EMAIL_SERVER_HOST);

// Credentials login is kept for local/dev convenience and as an opt-in fallback.
const credentialsEnabled =
  !isProduction ||
  !emailProviderConfigured ||
  process.env.ENABLE_CREDENTIALS_LOGIN === "true";

const providers: Provider[] = [];

if (credentialsEnabled) {
  providers.push(
    CredentialsProvider({
      name: "Email Login",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "admin@example.com" },
      },
      async authorize(credentials) {
        const rawEmail = credentials?.email;
        const email =
          typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : null;
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

        // Prevent privilege-claiming of admin accounts through passwordless credentials
        // outside local development unless explicitly allowed.
        const allowAdminCredentials =
          !isProduction || process.env.ALLOW_ADMIN_CREDENTIALS_LOGIN === "true";
        if (user.isAdmin && !allowAdminCredentials) {
          return null;
        }

        return { id: user.id, email: user.email, name: user.name };
      },
    })
  );
}

if (emailProviderConfigured) {
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

if (providers.length === 0) {
  throw new Error("No auth providers configured. Enable SMTP or credentials login.");
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
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
