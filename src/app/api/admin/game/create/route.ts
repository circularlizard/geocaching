import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { games, caches, gameCaches } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { ADMIN_COOKIE_NAME, ADMIN_COOKIE_VALUE } from '@/lib/admin-auth';

function isAuthed(request: Request): boolean {
  const cookie = request.headers.get('cookie') ?? '';
  return cookie.includes(`${ADMIN_COOKIE_NAME}=${ADMIN_COOKIE_VALUE}`);
}

export async function POST(request: Request) {
  if (!isAuthed(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let name: string | undefined;
  let endTime: string | undefined;

  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const body = await request.json();
    name = body.name;
    endTime = body.endTime;
  } else {
    const form = await request.formData();
    name = form.get('name') as string;
    endTime = form.get('endTime') as string;
  }

  if (!name || !endTime) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  await db.update(games).set({ isActive: false }).where(eq(games.isActive, true));

  const allCaches = await db.select().from(caches);
  const cacheCount = allCaches.length;

  const [newGame] = await db
    .insert(games)
    .values({
      name,
      gameEndTime: new Date(endTime),
      cacheCount,
      isActive: true,
      adminRecallTriggered: false,
    })
    .returning();

  if (allCaches.length > 0) {
    await db.insert(gameCaches).values(
      allCaches.map((c) => ({ gameId: newGame.id, cacheId: c.id })),
    );
  }

  return NextResponse.json({ game: newGame }, { status: 201 });
}
