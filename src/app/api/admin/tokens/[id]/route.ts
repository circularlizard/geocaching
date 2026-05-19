import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { registrationTokens, teams, games } from '@/lib/db/schema';
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

  const tokenId = parseInt(params.id, 10);

  const [activeGame] = await db
    .select()
    .from(games)
    .where(eq(games.isActive, true))
    .limit(1);

  if (activeGame) {
    const [usedTeam] = await db
      .select()
      .from(teams)
      .where(
        and(
          eq(teams.registrationTokenId, tokenId),
          eq(teams.gameId, activeGame.id),
        ),
      )
      .limit(1);

    if (usedTeam) {
      return NextResponse.json(
        { error: 'Cannot delete a token that has been used in the active game' },
        { status: 409 },
      );
    }
  }

  await db.delete(registrationTokens).where(eq(registrationTokens.id, tokenId));
  return NextResponse.json({ ok: true });
}
