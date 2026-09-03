import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    const rawUsers = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        isPremium: true,
        premiumUntil: true,
        createdAt: true,
      },
    });

    // Auto-fix/fallback for users with isPremium=true but no premiumUntil set
    const users = rawUsers.map((u) => {
      if (u.isPremium && !u.premiumUntil) {
        const exp = new Date(u.createdAt || Date.now());
        exp.setDate(exp.getDate() + 30);
        return { ...u, premiumUntil: exp.toISOString() };
      }
      return u;
    });

    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Gagal mengambil data user' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { userId, isPremium, role } = body;

    if (!userId) {
      return NextResponse.json({ success: false, message: 'User ID diperlukan' }, { status: 400 });
    }

    const updateData: any = {};
    if (typeof isPremium === 'boolean') {
      updateData.isPremium = isPremium;
      if (isPremium) {
        const exp = new Date();
        exp.setDate(exp.getDate() + 30);
        updateData.premiumUntil = exp.toISOString();
      } else {
        updateData.premiumUntil = null;
      }
    }
    if (role) {
      updateData.role = role;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isPremium: true,
        premiumUntil: true,
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Gagal mengupdate user' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, message: 'User ID diperlukan' }, { status: 400 });
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ success: true, message: 'User berhasil dihapus' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Gagal menghapus user' }, { status: 500 });
  }
}
