import { NextResponse } from 'next/server';
import { getVipPrice } from '@/lib/vip-price';

const GOPAY_URL = process.env.GOPAY_GATEWAY_URL || 'http://localhost:3005';
const GOPAY_KEY = process.env.GOPAY_API_KEY || '';

export async function GET() {
  const price = await getVipPrice();
  return NextResponse.json({ price });
}

export async function POST(req: Request) {
  const dynamicPrice = await getVipPrice();
  let amount = dynamicPrice;

  try {
    const body = await req.json();
    if (body?.amount && Number.isFinite(Number(body.amount)) && Number(body.amount) > 0) {
      amount = Number(body.amount);
    }
  } catch { /* body kosong / bukan JSON → pakai default harga database */ }

  try {
    const res = await fetch(`${GOPAY_URL}/create-qris`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': GOPAY_KEY,
      },
      body: JSON.stringify({ amount }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { success: false, message: `Gateway error: ${text}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { success: false, message: 'Tidak dapat terhubung ke GoPay Gateway. Pastikan gateway sedang berjalan.' },
      { status: 503 }
    );
  }
}
