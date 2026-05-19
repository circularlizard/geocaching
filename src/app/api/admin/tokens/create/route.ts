import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { registrationTokens } from '@/lib/db/schema';
import { ADMIN_COOKIE_NAME, ADMIN_COOKIE_VALUE } from '@/lib/admin-auth';
import { randomUUID } from 'crypto';

function isAuthed(request: Request): boolean {
  const cookie = request.headers.get('cookie') ?? '';
  return cookie.includes(`${ADMIN_COOKIE_NAME}=${ADMIN_COOKIE_VALUE}`);
}

export async function POST(request: Request) {
  if (!isAuthed(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = randomUUID();
  const [created] = await db.insert(registrationTokens).values({ token }).returning();
  return NextResponse.json({ token: created }, { status: 201 });
}
