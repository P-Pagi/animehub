import { NextRequest, NextResponse } from 'next/server';
import { animeService } from '@/lib/services/anime-service';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import { createErrorResponse } from '@/lib/utils/errors';

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    checkRateLimit(ip);

    const result = await animeService.getOnAir();

    return NextResponse.json({
      success: true,
      data: result.anime,
      pagination: {
        page: 1,
        hasNextPage: false,
      },
    });
  } catch (err) {
    const { status, body } = createErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
