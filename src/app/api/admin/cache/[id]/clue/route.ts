import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { caches } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { ADMIN_COOKIE_NAME, ADMIN_COOKIE_VALUE } from '@/lib/admin-auth';

function isAuthed(request: Request): boolean {
  const cookie = request.headers.get('cookie') ?? '';
  return cookie.includes(`${ADMIN_COOKIE_NAME}=${ADMIN_COOKIE_VALUE}`);
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  if (!isAuthed(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cacheId = parseInt(params.id, 10);
  const body = await request.json();
  const { clue, text } = body as { clue: 'clue1' | 'clue2' | 'clue3'; text: string };

  if (!clue || !text) {
    return NextResponse.json({ error: 'clue and text required' }, { status: 400 });
  }

  const fieldMap = {
    clue1: 'clue1Text' as const,
    clue2: 'clue2Text' as const,
    clue3: 'clue3Text' as const,
  };

  const field = fieldMap[clue];
  if (!field) {
    return NextResponse.json({ error: 'Invalid clue number' }, { status: 400 });
  }

  const [updated] = await db
    .update(caches)
    .set({ [field]: text })
    .where(eq(caches.id, cacheId))
    .returning();

  return NextResponse.json({ cache: updated });
}
