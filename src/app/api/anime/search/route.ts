import { NextRequest, NextResponse } from 'next/server';
import { animeService } from '@/lib/services/anime-service';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import { sanitizeQuery, pageSchema } from '@/lib/utils/sanitizer';
import { createErrorResponse } from '@/lib/utils/errors';

export async function GET(request: NextRequest) {
  try {
    const rawIp = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const ip = rawIp.split(',')[0].trim();
    checkRateLimit(ip);

    const { searchParams } = new URL(request.url);
    const qParam = searchParams.get('q') || '';

    if (!qParam.trim()) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: {
          page: 1,
          hasNextPage: false,
        },
      });
    }

    const query = sanitizeQuery(qParam);
    const page = pageSchema.parse(searchParams.get('page'));

    const result = await animeService.search(query, page);

    return NextResponse.json({
      success: true,
      data: result.anime,
      pagination: {
        page,
        hasNextPage: result.hasNextPage,
      },
    });
  } catch (err) {
    const { status, body } = createErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
