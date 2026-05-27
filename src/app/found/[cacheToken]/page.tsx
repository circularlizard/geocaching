import { db } from '@/lib/db';
import { caches, games, teams, teamSequences, progressLogs } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { cookies } from 'next/headers';
import type { Team, Cache } from '@/lib/db/schema';

export const metadata = { title: 'Geocache Found!' };

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

  const now = new Date();
  if (activeGame.adminRecallTriggered || activeGame.gameEndTime <= now) {
    return <ErrorPage message="The game has ended. Thank you for playing!" />;
  }

  // --- Resolve team identity via cookie ---
  const cookieStore = cookies();
  const allTeamCookies = cookieStore.getAll('geocache_team');

  if (allTeamCookies.length === 0) {
    return (
      <ScanTeamQRPage message="No team identified on this device. Please scan your team registration QR code first." />
    );
  }

  if (allTeamCookies.length > 1) {
    return (
      <ScanTeamQRPage message="Multiple team identities found on this device. Please scan your team registration QR code to re-identify your team." />
    );
  }

  const cookieTeamId = parseInt(allTeamCookies[0].value, 10);
  if (isNaN(cookieTeamId)) {
    return (
      <ScanTeamQRPage message="Team identity could not be read. Please scan your team registration QR code again." />
    );
  }

  const [team] = await db
    .select()
    .from(teams)
    .where(and(eq(teams.id, cookieTeamId), eq(teams.gameId, activeGame.id)))
    .limit(1);

  if (!team) {
    return (
      <ScanTeamQRPage message="Your team could not be found for this game. Please scan your team registration QR code." />
    );
  }

  // Check if this cache is the team's current cache
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
    return <ErrorPage message="You have already completed all geocaches in this game. Well done!" />;
  }

  if (currentSequence.cacheId !== cache.id) {
    const [correctCache] = await db
      .select()
      .from(caches)
      .where(eq(caches.id, currentSequence.cacheId))
      .limit(1);
    return <WrongCachePage team={team} correctCache={correctCache ?? null} />;
  }

  // Correct cache — log the find
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
        <h1 className="text-3xl font-bold text-green-700">Geocache Found!</h1>
        <p className="text-lg text-gray-700">
          Well done, <span className="font-semibold">{team.displayName}</span>! You found the geocache.
        </p>
        <div className="bg-green-50 border border-green-200 rounded-lg py-3 px-4">
          <p className="text-green-800 font-semibold text-lg">
            🏆 You will earn{' '}
            <span className="text-2xl">{potentialPoints}</span>{' '}
            point{potentialPoints !== 1 ? 's' : ''} for this geocache!
          </p>
        </div>
        <p className="text-gray-600">
          Please replace the geocache box exactly as you found it, then confirm below.
        </p>

        <form action={`/api/cache/${cacheToken}/confirm`} method="post">
          <input type="hidden" name="teamId" value={team.id} />
          <button
            type="submit"
            className="w-full bg-green-600 text-white font-bold py-4 rounded-lg text-xl hover:bg-green-700 transition-colors"
          >
            ✓ I have replaced the geocache box
          </button>
        </form>
      </div>
    </main>
  );
}

function ScanTeamQRPage({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-white">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="text-6xl">🪪</div>
        <h1 className="text-2xl font-bold text-gray-900">Scan Your Team QR Code</h1>
        <p className="text-gray-700">{message}</p>
        <p className="text-sm text-gray-500 mt-2">
          Find your team registration card and scan the QR code on it to identify your team, then scan the geocache again.
        </p>
      </div>
    </main>
  );
}

function WrongCachePage({ team, correctCache }: { team: Team; correctCache: Cache | null }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-white">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="text-6xl">⚠️</div>
        <h1 className="text-2xl font-bold text-red-600">Wrong Geocache!</h1>
        {correctCache ? (
          <p className="text-gray-700">
            This isn&apos;t your next geocache, <span className="font-semibold">{team.displayName}</span>.
            You should be looking for <span className="font-semibold text-blue-700">{correctCache.name}</span>.
          </p>
        ) : (
          <p className="text-gray-700">
            This isn&apos;t your next geocache, <span className="font-semibold">{team.displayName}</span>.
            Head back to your current clue for directions.
          </p>
        )}
        <a
          href={`/clue/${team.id}`}
          className="inline-block mt-4 w-full bg-blue-600 text-white font-bold py-4 rounded-lg text-lg hover:bg-blue-700 transition-colors"
        >
          Go to my clue →
        </a>
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
