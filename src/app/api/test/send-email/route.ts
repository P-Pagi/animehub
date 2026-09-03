import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { sendPaymentReceiptEmail } from '@/lib/email/mailer';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ success: false, message: 'Email tidak ditemukan' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { name: true, email: true, premiumUntil: true },
    });

    const targetEmail = user?.email || email;
    const userName = user?.name || 'Member Test';
    const fakeTrxId = `TEST-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const dateFormatted = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const expDate = (user?.premiumUntil ? new Date(user.premiumUntil) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).toISOString();

    const result = await sendPaymentReceiptEmail({
      to: targetEmail,
      userName,
      amount: 1,
      trxId: fakeTrxId,
      paymentMethod: 'QRIS GoPay (Test)',
      date: dateFormatted,
      premiumUntil: expDate,
    });

    return NextResponse.json({ success: true, message: `Email test berhasil dikirim ke ${targetEmail}`, result });
  } catch (error: any) {
    console.error('[Test Email Error]', error);
    return NextResponse.json({ success: false, message: error?.message || 'Gagal mengirim email test' }, { status: 500 });
  }
}
