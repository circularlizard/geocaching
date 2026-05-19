import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { caches, games, gameCaches } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { ADMIN_COOKIE_NAME, ADMIN_COOKIE_VALUE } from '@/lib/admin-auth';

function isAuthed(request: Request): boolean {
  const cookie = request.headers.get('cookie') ?? '';
  return cookie.includes(`${ADMIN_COOKIE_NAME}=${ADMIN_COOKIE_VALUE}`);
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  if (!isAuthed(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cacheId = parseInt(params.id, 10);

  const [activeGame] = await db
    .select()
    .from(games)
    .where(eq(games.isActive, true))
    .limit(1);

  if (activeGame) {
    const [assigned] = await db
      .select()
      .from(gameCaches)
      .where(
        and(
          eq(gameCaches.cacheId, cacheId),
          eq(gameCaches.gameId, activeGame.id),
        ),
      )
      .limit(1);

    if (assigned) {
      return NextResponse.json(
        { error: 'Cannot delete a geocache that is assigned to the active game. Unassign it first.' },
        { status: 409 },
      );
    }
  }

  await db.delete(caches).where(eq(caches.id, cacheId));
  return NextResponse.json({ ok: true });
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
  const { name } = body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const [updated] = await db
    .update(caches)
    .set({ name: name.trim() })
    .where(eq(caches.id, cacheId))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: 'Geocache not found' }, { status: 404 });
  }

  return NextResponse.json({ cache: updated });
}
