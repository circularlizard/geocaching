import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { teams, teamSequences, progressLogs } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(
  request: Request,
  { params }: { params: { teamId: string } },
) {
  const teamId = parseInt(params.teamId, 10);

  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  if (!team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  }

  const [currentSequence] = await db
    .select()
    .from(teamSequences)
    .where(
      and(
        eq(teamSequences.teamId, team.id),
        eq(teamSequences.sequenceOrder, team.currentCacheIndex),
      ),
    )
    .limit(1);

  if (!currentSequence) {
    return NextResponse.redirect(new URL(`/clue/${teamId}`, request.url), {
      status: 302,
    });
  }

  const cacheId = currentSequence.cacheId;

  const [existingLog] = await db
    .select()
    .from(progressLogs)
    .where(
      and(
        eq(progressLogs.teamId, team.id),
        eq(progressLogs.cacheId, cacheId),
      ),
    )
    .limit(1);

  if (!existingLog) {
    await db.insert(progressLogs).values({
      teamId: team.id,
      cacheId,
      clue2RequestedTimestamp: new Date(),
    });
  } else if (!existingLog.clue3RequestedTimestamp) {
    await db
      .update(progressLogs)
      .set({ clue3RequestedTimestamp: new Date() })
      .where(eq(progressLogs.id, existingLog.id));
  }

  return NextResponse.redirect(new URL(`/clue/${teamId}`, request.url), {
    status: 302,
  });
}
