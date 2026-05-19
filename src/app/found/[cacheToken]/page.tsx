import { db } from '@/lib/db';
import { caches, games, teams, teamSequences, progressLogs } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { cookies } from 'next/headers';

export const metadata = { title: 'Cache Found!' };

async function findCurrentTeamForCache(cacheId: number, gameId: number) {
  const seqs = await db
    .select()
    .from(teamSequences)
    .where(eq(teamSequences.cacheId, cacheId));

  for (const seq of seqs) {
    const [team] = await db
      .select()
      .from(teams)
      .where(
        and(
          eq(teams.id, seq.teamId),
          eq(teams.gameId, gameId),
          eq(teams.currentCacheIndex, seq.sequenceOrder),
        ),
      )
      .limit(1);
    if (team) return { team, seq };
  }
  return null;
}

export default async function FoundPage({
  params,
}: {
  params: { cacheToken: string };
}) {
  const { cacheToken } = params;

  const [cache] = await db
    .select()
    .from(caches)
    .where(eq(caches.cacheToken, cacheToken))
    .limit(1);

  if (!cache) {
    return <ErrorPage message="This QR code is not recognised." />;
  }

  const [activeGame] = await db
    .select()
    .from(games)
    .where(eq(games.isActive, true))
    .limit(1);

  if (!activeGame) {
    return <ErrorPage message="No active game." />;
  }

  const teamCookie = cookies().get('geocache_team')?.value;
  const cookieTeamId = teamCookie ? parseInt(teamCookie, 10) : null;

  if (cookieTeamId) {
    const [cookieTeam] = await db
      .select()
      .from(teams)
      .where(and(eq(teams.id, cookieTeamId), eq(teams.gameId, activeGame.id)))
      .limit(1);

    if (cookieTeam) {
      const [expectedSeq] = await db
        .select()
        .from(teamSequences)
        .where(
          and(
            eq(teamSequences.teamId, cookieTeam.id),
            eq(teamSequences.sequenceOrder, cookieTeam.currentCacheIndex),
          ),
        )
        .limit(1);

      if (!expectedSeq || expectedSeq.cacheId !== cache.id) {
        return (
          <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-white">
            <div className="max-w-md w-full text-center space-y-4">
              <div className="text-6xl">⚠️</div>
              <h1 className="text-2xl font-bold text-red-600">Wrong Cache!</h1>
              <p className="text-gray-700">This isn&apos;t your next cache. Head back to your current clue.</p>
              <a
                href={`/clue/${cookieTeam.id}`}
                className="inline-block mt-4 w-full bg-blue-600 text-white font-bold py-4 rounded-lg text-lg hover:bg-blue-700 transition-colors"
              >
                Return to my clue →
              </a>
            </div>
          </main>
        );
      }
    }
  }

  const match = await findCurrentTeamForCache(cache.id, activeGame.id);

  if (!match) {
    const [existingLog] = await db
      .select()
      .from(progressLogs)
      .where(
        and(
          eq(progressLogs.cacheId, cache.id),
        ),
      )
      .limit(1);

    if (existingLog?.foundTimestamp) {
      return <ErrorPage message="This cache has already been found by your team." />;
    }

    return <ErrorPage message="This is not your next cache. Scan your registration QR card to return to your current clue." />;
  }

  const { team } = match;

  const [existingLog] = await db
    .select()
    .from(progressLogs)
    .where(
      and(
        eq(progressLogs.teamId, team.id),
        eq(progressLogs.cacheId, cache.id),
      ),
    )
    .limit(1);

  if (!existingLog) {
    await db.insert(progressLogs).values({
      teamId: team.id,
      cacheId: cache.id,
      foundTimestamp: new Date(),
    });
  } else if (!existingLog.foundTimestamp) {
    await db
      .update(progressLogs)
      .set({ foundTimestamp: new Date() })
      .where(eq(progressLogs.id, existingLog.id));
  }

  const potentialPoints = !existingLog
    ? 5
    : existingLog.clue3RequestedTimestamp
      ? 1
      : existingLog.clue2RequestedTimestamp
        ? 3
        : 5;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-white">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="text-6xl">🎉</div>
        <h1 className="text-3xl font-bold text-green-700">Cache Found!</h1>
        <p className="text-lg text-gray-700">
          Well done, <span className="font-semibold">{team.displayName}</span>! You found the cache.
        </p>
        <div className="bg-green-50 border border-green-200 rounded-lg py-3 px-4">
          <p className="text-green-800 font-semibold text-lg">
            🏆 You will earn{' '}
            <span className="text-2xl">{potentialPoints}</span>{' '}
            point{potentialPoints !== 1 ? 's' : ''} for this cache!
          </p>
        </div>
        <p className="text-gray-600">
          Please replace the cache box exactly as you found it, then confirm below.
        </p>

        <form action={`/api/cache/${cacheToken}/confirm`} method="post">
          <input type="hidden" name="teamId" value={team.id} />
          <button
            type="submit"
            className="w-full bg-green-600 text-white font-bold py-4 rounded-lg text-xl hover:bg-green-700 transition-colors"
          >
            ✓ I have replaced the cache box
          </button>
        </form>
      </div>
    </main>
  );
}

function ErrorPage({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-white">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="text-6xl">⚠️</div>
        <h1 className="text-2xl font-bold text-red-600">Oops!</h1>
        <p className="text-gray-700">{message}</p>
      </div>
    </main>
  );
}
