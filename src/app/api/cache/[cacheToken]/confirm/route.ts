import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { caches, teams, teamSequences, progressLogs } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

function calcPoints(log: {
  clue2RequestedTimestamp: Date | null;
  clue3RequestedTimestamp: Date | null;
}): number {
  if (log.clue3RequestedTimestamp) return 1;
  if (log.clue2RequestedTimestamp) return 3;
  return 5;
}

export async function POST(
  request: Request,
  { params }: { params: { cacheToken: string } },
) {
  const { cacheToken } = params;

  let teamId: number | null = null;
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const body = await request.json();
    teamId = parseInt(body.teamId, 10);
  } else {
    const form = await request.formData();
    teamId = parseInt(form.get('teamId') as string, 10);
  }

  if (!teamId || isNaN(teamId)) {
    return NextResponse.json({ error: 'teamId required' }, { status: 400 });
  }

  const [cache] = await db
    .select()
    .from(caches)
    .where(eq(caches.cacheToken, cacheToken))
    .limit(1);

  if (!cache) {
    return NextResponse.json({ error: 'Cache not found' }, { status: 404 });
  }

  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  if (!team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  }

  const [progressLog] = await db
    .select()
    .from(progressLogs)
    .where(
      and(
        eq(progressLogs.teamId, teamId),
        eq(progressLogs.cacheId, cache.id),
      ),
    )
    .limit(1);

  const points = progressLog
    ? calcPoints(progressLog)
    : 5;

  const now = new Date();
  if (progressLog) {
    await db
      .update(progressLogs)
      .set({
        points,
        foundTimestamp: progressLog.foundTimestamp ?? now,
      })
      .where(eq(progressLogs.id, progressLog.id));
  } else {
    await db.insert(progressLogs).values({
      teamId,
      cacheId: cache.id,
      foundTimestamp: now,
      points,
    });
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

  const totalCaches = await db
    .select()
    .from(teamSequences)
    .where(eq(teamSequences.teamId, teamId));

  const nextIndex = team.currentCacheIndex + 1;
  const isLast = nextIndex >= totalCaches.length;

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

  return NextResponse.redirect(new URL(`/clue/${teamId}`, request.url), {
    status: 302,
  });
}
