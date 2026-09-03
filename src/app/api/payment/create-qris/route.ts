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

  const targetUrl = `${GOPAY_URL}/create-qris`;
  console.log(`[QRIS] POST → ${targetUrl} | amount: ${amount} | key: ${GOPAY_KEY ? '***set***' : 'MISSING'}`);

  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': GOPAY_KEY,
      },
      body: JSON.stringify({ amount }),
    });

    const text = await res.text();
    console.log(`[QRIS] Gateway response → status: ${res.status} | body: ${text}`);

    if (!res.ok) {
      return NextResponse.json(
        { success: false, message: `Gateway error (${res.status}): ${text}` },
        { status: 502 }
      );
    }

    try {
      const data = JSON.parse(text);
      return NextResponse.json(data);
    } catch {
      return NextResponse.json(
        { success: false, message: `Gateway returned invalid JSON: ${text}` },
        { status: 502 }
      );
    }
  } catch (err: any) {
    console.error(`[QRIS] Fetch error → ${err?.message}`);
    return NextResponse.json(
      { success: false, message: `Tidak dapat terhubung ke GoPay Gateway (${targetUrl}): ${err?.message}` },
      { status: 503 }
    );
  }
}
