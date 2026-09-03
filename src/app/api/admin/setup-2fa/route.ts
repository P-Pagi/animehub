import { NextResponse } from 'next/server';
import { get2FAQRCode, get2FAPairedStatus } from '@/lib/auth/totp';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    if (searchParams.get('check') === 'status') {
      return NextResponse.json({ success: true, isPaired: get2FAPairedStatus() });
    }

    const data = await get2FAQRCode();
    return NextResponse.json({ success: true, ...data });
  } catch (err: any) {
    if (err.message === '2FA_ALREADY_PAIRED') {
      return NextResponse.json(
        { success: false, isPaired: true, message: '2FA sudah terpasang di perangkat Admin utama. Pemasangan ulang dikunci!' },
        { status: 403 }
      );
    }
    return NextResponse.json({ success: false, message: 'Gagal membuat QR Code' }, { status: 500 });
  }
}
