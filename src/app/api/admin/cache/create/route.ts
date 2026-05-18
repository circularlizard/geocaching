import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { caches } from '@/lib/db/schema';
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

  let name: string | undefined;
  let clue1: string | undefined;
  let clue2: string | undefined;
  let clue3: string | undefined;

  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const body = await request.json();
    name = body.name;
    clue1 = body.clue1;
    clue2 = body.clue2;
    clue3 = body.clue3;
  } else {
    const form = await request.formData();
    name = form.get('name') as string;
    clue1 = form.get('clue1') as string;
    clue2 = form.get('clue2') as string;
    clue3 = form.get('clue3') as string;
  }

  if (!name || !clue1 || !clue2 || !clue3) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const cacheToken = `CACHE-${randomUUID().slice(0, 8).toUpperCase()}`;

  const [newCache] = await db
    .insert(caches)
    .values({ name, clue1Text: clue1, clue2Text: clue2, clue3Text: clue3, cacheToken })
    .returning();

  return NextResponse.json({ cache: newCache }, { status: 201 });
}
