import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { sendPaymentReceiptEmail } from '@/lib/email/mailer';

export async function POST(req: Request) {
  try {
    const { email, trxId, amount } = await req.json();

    if (!email) {
      return NextResponse.json({ success: false, message: 'Email tidak ditemukan' }, { status: 400 });
    }

    // Fetch current user premium status to extend subscription if already active
    const currentUser = await prisma.user.findUnique({
      where: { email },
      select: { isPremium: true, premiumUntil: true },
    });

    let baseDate = new Date();
    if (currentUser?.isPremium && currentUser.premiumUntil) {
      const currentExpiry = new Date(currentUser.premiumUntil);
      if (currentExpiry > baseDate) {
        baseDate = currentExpiry; // Extend from current expiration date
      }
    }

    baseDate.setDate(baseDate.getDate() + 30);
    const premiumUntil = baseDate.toISOString();

    const user = await prisma.user.update({
      where: { email },
      data: {
        isPremium: true,
        premiumUntil,
      },
      select: {
        id: true,
        name: true,
        email: true,
        isPremium: true,
        premiumUntil: true,
      },
    });

    // Send receipt email in background asynchronously
    const transactionId = trxId || `TXN-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    const dateFormatted = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    try {
      const emailResult = await sendPaymentReceiptEmail({
        to: user.email,
        userName: user.name || undefined,
        amount: amount || 1,
        trxId: transactionId,
        paymentMethod: 'QRIS GoPay',
        date: dateFormatted,
        premiumUntil,
      });
      console.log('[Email Receipt Sent Result]', emailResult);
    } catch (err) {
      console.error('[Email Receipt Error]', err);
    }

    return NextResponse.json({ success: true, user, trxId: transactionId });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Gagal update status premium ke database' }, { status: 500 });
  }
}
