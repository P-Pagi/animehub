import { NextRequest, NextResponse } from 'next/server';
import { animeService } from '@/lib/services/anime-service';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import { pageSchema } from '@/lib/utils/sanitizer';
import { createErrorResponse } from '@/lib/utils/errors';
import { z } from 'zod';

const genreSlugSchema = z
  .string()
  .min(1)
  .max(60)
  .regex(/^[a-z0-9-]+$/, 'Invalid genre slug');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    checkRateLimit(ip);

    const { slug } = await params;
    const validSlug = genreSlugSchema.parse(slug);

    const { searchParams } = new URL(request.url);
    const page = pageSchema.parse(searchParams.get('page'));

    const result = await animeService.getGenre(validSlug, page);

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
