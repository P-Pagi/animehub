import { NextResponse } from 'next/server';

const GOPAY_URL = process.env.GOPAY_GATEWAY_URL || 'http://localhost:3005';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ qrisId: string }> }
) {
  const { qrisId } = await params;

  try {
    const res = await fetch(`${GOPAY_URL}/api/qr-status/${qrisId}`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ success: false, paid: false, status: 'PENDING' });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ success: false, paid: false, status: 'PENDING' });
  }
}
