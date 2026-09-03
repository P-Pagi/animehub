import { NextResponse } from 'next/server';
import { verify2FAToken, ADMIN_CONFIG } from '@/lib/auth/totp';

export async function POST(req: Request) {
  try {
    const { pin, token } = await req.json();

    if (pin !== ADMIN_CONFIG.pin) {
      return NextResponse.json({ success: false, message: 'PIN Admin Salah!' }, { status: 401 });
    }

    const isValidToken = verify2FAToken(token);
    if (!isValidToken) {
      return NextResponse.json({ success: false, message: 'Kode 2FA Authenticator Salah / Expired!' }, { status: 401 });
    }

    // Set secure admin session cookie (valid for 24 hours)
    const response = NextResponse.json({ success: true, message: 'Login Berhasil!' });
    response.cookies.set('admin_session', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 1 day
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan sistem' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, message: 'Logout Berhasil!' });
  response.cookies.delete('admin_session');
  return response;
}
