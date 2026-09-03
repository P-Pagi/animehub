import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/db/prisma';

const baseAdapter = PrismaAdapter(prisma);
const customAdapter = {
  ...baseAdapter,
  createUser: (data: any) => {
    const { emailVerified, ...rest } = data;
    return prisma.user.create({
      data: {
        ...rest,
        ...(emailVerified ? { emailVerified } : {}),
      },
    });
  },
};

export const authOptions: NextAuthOptions = {
  adapter: customAdapter as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      // On initial sign-in, store the user ID
      if (user) {
        token.id = user.id;
        token.dbRefreshedAt = 0; // force immediate DB fetch on first sign-in
      }

      // Only re-query DB every 2 minutes (120s TTL), not on every request
      const now = Math.floor(Date.now() / 1000);
      const lastRefresh = (token.dbRefreshedAt as number) || 0;
      const shouldRefresh = now - lastRefresh > 120;

      if (token.id && shouldRefresh) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { isPremium: true, premiumUntil: true, role: true },
          });
          if (dbUser) {
            token.isPremium = dbUser.isPremium || false;
            token.premiumUntil = dbUser.premiumUntil?.toISOString() || null;
            token.role = dbUser.role || 'USER';
            token.dbRefreshedAt = now;
          }
        } catch {}
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).isPremium = token.isPremium;
        (session.user as any).premiumUntil = token.premiumUntil;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
