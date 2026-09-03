import { NextRequest, NextResponse } from 'next/server';
import { animeService } from '@/lib/services/anime-service';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import { sanitizeSlug } from '@/lib/utils/sanitizer';
import { createErrorResponse } from '@/lib/utils/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    checkRateLimit(ip);

    const { slug: rawSlug } = await params;
    const slug = sanitizeSlug(rawSlug);

    const animeDetail = await animeService.getDetail(slug);

    return NextResponse.json({
      success: true,
      data: animeDetail,
    });
  } catch (err) {
    const { status, body } = createErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
