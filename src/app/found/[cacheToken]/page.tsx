import { db } from '@/lib/db';
import { caches, games, teams, teamSequences, progressLogs } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

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

    return <ErrorPage message="This is not your next cache." />;
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

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-white">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="text-6xl">🎉</div>
        <h1 className="text-3xl font-bold text-green-700">Cache Found!</h1>
        <p className="text-lg text-gray-700">
          Well done, <span className="font-semibold">{team.displayName}</span>! You found the cache.
        </p>
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
