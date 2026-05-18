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

  const [currentSeq] = await db
    .select()
    .from(teamSequences)
    .where(
      and(
        eq(teamSequences.teamId, teamId),
        eq(teamSequences.sequenceOrder, team.currentCacheIndex),
      ),
    )
    .limit(1);

  if (!currentSeq) {
    return NextResponse.redirect(new URL(`/completion/${teamId}`, request.url), { status: 302 });
  }

  const [existingLog] = await db
    .select()
    .from(progressLogs)
    .where(
      and(
        eq(progressLogs.teamId, teamId),
        eq(progressLogs.cacheId, currentSeq.cacheId),
      ),
    )
    .limit(1);

  if (existingLog) {
    await db
      .update(progressLogs)
      .set({ points: 0, skipped: true })
      .where(eq(progressLogs.id, existingLog.id));
  } else {
    await db.insert(progressLogs).values({
      teamId,
      cacheId: currentSeq.cacheId,
      points: 0,
      skipped: true,
    });
  }

  const allSeqs = await db
    .select()
    .from(teamSequences)
    .where(eq(teamSequences.teamId, teamId));

  const nextIndex = team.currentCacheIndex + 1;
  const isLast = nextIndex >= allSeqs.length;

  await db
    .update(teams)
    .set({ currentCacheIndex: nextIndex })
    .where(eq(teams.id, teamId));

  if (isLast) {
    return NextResponse.redirect(
      new URL(`/completion/${teamId}`, request.url),
      { status: 302 },
    );
  }

  return NextResponse.redirect(new URL(`/clue/${teamId}`, request.url), { status: 302 });
}
