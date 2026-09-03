import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { visitorTracker } from '@/lib/utils/visitor-tracker';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Track active real-time visitors from client IP
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
  visitorTracker.ping(ip);

  // Protect /admin routes (except /admin/login)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const session = request.cookies.get('admin_session');
    if (!session || session.value !== 'authenticated') {
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
