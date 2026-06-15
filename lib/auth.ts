import type { NextAuthOptions, Session } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });
        if (!user || !user.passwordHash || !user.isActive) return null;
        const ok = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as { id: string }).id;
        token.role = (user as { role: Role }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
  events: {
    // Record each successful login for usage analytics. Best effort — a
    // tracking failure must never block sign-in.
    async signIn({ user }) {
      const id = (user as { id?: string })?.id;
      if (!id) return;
      try {
        await prisma.$transaction([
          prisma.loginEvent.create({ data: { userId: id } }),
          prisma.user.update({ where: { id }, data: { lastLoginAt: new Date() } }),
        ]);
      } catch (e) {
        console.error("login tracking failed:", (e as Error).message);
      }
    },
  },
};

export function getSession() {
  return getServerSession(authOptions);
}

// --- Role guards for API routes ---

export class AuthError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function requireUser(): Promise<NonNullable<Session["user"]>> {
  const session = await getSession();
  if (!session?.user) throw new AuthError(401, "Unauthorized");
  return session.user;
}

export async function requireRole(...roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new AuthError(403, "Forbidden");
  return user;
}

export const isManagerOrAdmin = (role?: Role) => role === "MANAGER" || role === "ADMIN";
