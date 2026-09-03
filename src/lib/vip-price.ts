import { prisma } from '@/lib/db/prisma';

const DEFAULT_VIP_PRICE = 5000;

export async function getVipPrice(): Promise<number> {
  try {
    const setting = await (prisma as any).systemSetting.findUnique({
      where: { key: 'VIP_PRICE' },
    });
    if (setting && !isNaN(Number(setting.value))) {
      return Number(setting.value);
    }
  } catch (err) {
    console.error('[VIP Price DB Error]', err);
  }
  return DEFAULT_VIP_PRICE;
}
