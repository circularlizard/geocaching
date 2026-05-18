import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, ADMIN_COOKIE_VALUE, getAdminPassword } from '@/lib/admin-auth';

export async function POST(request: Request) {
  let password: string | undefined;

  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const body = await request.json();
    password = body.password;
  } else {
    const form = await request.formData();
    password = form.get('password') as string | undefined;
  }

  const adminPassword = getAdminPassword();
  if (!adminPassword || password !== adminPassword) {
    return NextResponse.redirect(new URL('/admin/login?error=1', request.url), {
      status: 302,
    });
  }

  const response = NextResponse.redirect(new URL('/admin/dashboard', request.url), {
    status: 302,
  });
  response.cookies.set(ADMIN_COOKIE_NAME, ADMIN_COOKIE_VALUE, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
  });

  return response;
}
