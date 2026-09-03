import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getVipPrice } from '@/lib/vip-price';

const DEFAULT_VIP_PRICE = 5000;

export async function GET() {
  const price = await getVipPrice();
  return NextResponse.json({ price, defaultPrice: DEFAULT_VIP_PRICE });
}

export async function POST(req: Request) {
  try {
    const { price, adminPin } = await req.json();

    const envAdminPin = process.env.ADMIN_PIN || '905002';
    if (adminPin !== envAdminPin) {
      return NextResponse.json({ success: false, message: 'PIN Admin tidak valid!' }, { status: 403 });
    }

    const numericPrice = Number(price);
    if (isNaN(numericPrice) || numericPrice < 1) {
      return NextResponse.json({ success: false, message: 'Harga tidak valid!' }, { status: 400 });
    }

    await (prisma as any).systemSetting.upsert({
      where: { key: 'VIP_PRICE' },
      update: { value: String(numericPrice) },
      create: { key: 'VIP_PRICE', value: String(numericPrice) },
    });

    return NextResponse.json({
      success: true,
      message: `Harga VIP berhasil diperbarui menjadi Rp ${numericPrice.toLocaleString('id-ID')}`,
      price: numericPrice,
    });
  } catch (error: any) {
    console.error('[Admin VIP Price Error]', error);
    return NextResponse.json({ success: false, message: error?.message || 'Gagal mengubah harga VIP' }, { status: 500 });
  }
}
