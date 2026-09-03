import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const email = (session?.user as any)?.email;

    if (!email) {
      return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        isPremium: true,
        premiumUntil: true,
        trialClaimed: true,
        createdAt: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // Auto-fix: if isPremium but premiumUntil is null, set 30 days from now
    let premiumUntil = user.premiumUntil;
    if (user.isPremium && !premiumUntil) {
      const exp = new Date();
      exp.setDate(exp.getDate() + 30);
      premiumUntil = exp;
      await prisma.user.update({
        where: { email },
        data: { premiumUntil: exp },
      });
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          ...user,
          premiumUntil: premiumUntil?.toISOString() || null,
          createdAt: user.createdAt?.toISOString() || null,
        },
      },
      {
        headers: {
          // Cache for 60s, allow serving stale for up to 30s while revalidating
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=30',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
