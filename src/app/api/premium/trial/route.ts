import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db/prisma';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    const email = (session?.user as any)?.email;

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Kamu harus login terlebih dahulu.' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        isPremium: true,
        premiumUntil: true,
        trialClaimed: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Pengguna tidak ditemukan.' },
        { status: 404 }
      );
    }

    // Block if already premium
    if (user.isPremium && user.premiumUntil && new Date(user.premiumUntil) > new Date()) {
      return NextResponse.json(
        { success: false, message: 'Akun kamu sudah aktif VIP Premium.' },
        { status: 400 }
      );
    }

    // Block if trial already claimed
    if (user.trialClaimed) {
      return NextResponse.json(
        { success: false, message: 'Kamu sudah pernah menggunakan trial VIP sebelumnya.' },
        { status: 400 }
      );
    }

    // Block if account is older than 7 days
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const accountAge = Date.now() - new Date(user.createdAt).getTime();
    if (accountAge > ONE_WEEK_MS) {
      return NextResponse.json(
        { success: false, message: 'Trial VIP hanya tersedia untuk pengguna baru (daftar kurang dari 7 hari).' },
        { status: 403 }
      );
    }

    // Grant 3-day trial
    const trialExpiry = new Date();
    trialExpiry.setDate(trialExpiry.getDate() + 3);

    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        isPremium: true,
        premiumUntil: trialExpiry,
        trialClaimed: true,
      },
      select: {
        id: true,
        email: true,
        isPremium: true,
        premiumUntil: true,
        trialClaimed: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Trial VIP 3 hari berhasil diaktifkan!',
      user: {
        ...updatedUser,
        premiumUntil: updatedUser.premiumUntil?.toISOString() || null,
      },
    });
  } catch (error: any) {
    console.error('[Trial API Error]', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server.' },
      { status: 500 }
    );
  }
}
