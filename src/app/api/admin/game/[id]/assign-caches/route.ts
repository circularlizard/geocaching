import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { games, gameCaches } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { ADMIN_COOKIE_NAME, ADMIN_COOKIE_VALUE } from '@/lib/admin-auth';

function isAuthed(request: Request): boolean {
  const cookie = request.headers.get('cookie') ?? '';
  return cookie.includes(`${ADMIN_COOKIE_NAME}=${ADMIN_COOKIE_VALUE}`);
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  if (!isAuthed(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const gameId = parseInt(params.id, 10);
  const body = await request.json();
  const { cacheIds } = body as { cacheIds: number[] };

  if (!Array.isArray(cacheIds) || cacheIds.length === 0) {
    return NextResponse.json({ error: 'cacheIds required' }, { status: 400 });
  }

  await db.delete(gameCaches).where(eq(gameCaches.gameId, gameId));
  await db.insert(gameCaches).values(
    cacheIds.map((cacheId) => ({ gameId, cacheId })),
  );

  await db
    .update(games)
    .set({ cacheCount: cacheIds.length })
    .where(eq(games.id, gameId));

  return NextResponse.json({ assigned: cacheIds.length });
}
