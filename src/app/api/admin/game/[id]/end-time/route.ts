import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { games } from '@/lib/db/schema';
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

  const gameId = parseInt(params.id, 10);
  const body = await request.json();
  const { endTime } = body;

  if (!endTime) {
    return NextResponse.json({ error: 'endTime required' }, { status: 400 });
  }

  const [updated] = await db
    .update(games)
    .set({ gameEndTime: new Date(endTime) })
    .where(eq(games.id, gameId))
    .returning();

  return NextResponse.json({ game: updated });
}
