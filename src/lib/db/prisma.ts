import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const databaseUrl =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_FfG8YemKna3H@ep-proud-salad-a5fnqii9-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
