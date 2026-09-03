import { NextResponse } from 'next/server';
import { analyticsService } from '@/lib/services/analytics-service';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const isAdmin = searchParams.get('admin') === 'true';

  const stats = isAdmin ? analyticsService.getDetailedStats() : analyticsService.getStats();
  return NextResponse.json({
    status: 'success',
    data: stats,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const visitorId = body.visitorId;

    if (!visitorId || typeof visitorId !== 'string') {
      return NextResponse.json(
        { status: 'error', message: 'Visitor ID is required' },
        { status: 400 }
      );
    }

    const stats = analyticsService.recordVisit(visitorId);

    return NextResponse.json({
      status: 'success',
      data: stats,
    });
  } catch {
    return NextResponse.json(
      { status: 'error', message: 'Invalid request' },
      { status: 400 }
    );
  }
}
