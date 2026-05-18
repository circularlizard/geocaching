import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { teams, caches, teamSequences, progressLogs, games } from '@/lib/db/schema';
import { eq, and, sum } from 'drizzle-orm';

export default async function CluePage({
  params,
}: {
  params: { teamId: string };
}) {
  const teamId = parseInt(params.teamId, 10);
  if (isNaN(teamId)) notFound();

  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  if (!team) notFound();

  const [activeGame] = await db
    .select()
    .from(games)
    .where(eq(games.isActive, true))
    .limit(1);

  const now = new Date();
  const isGameOver =
    !activeGame ||
    activeGame.adminRecallTriggered ||
    activeGame.gameEndTime <= now;

  if (isGameOver) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-white">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="text-6xl">🏁</div>
          <h1 className="text-2xl font-bold text-gray-800">Game Over</h1>
          <p className="text-gray-700">The game has ended. Thank you for playing!</p>
        </div>
      </main>
    );
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
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-white">
        <div className="max-w-md w-full text-center space-y-4">
          <h1 className="text-2xl font-bold text-gray-800">All caches complete!</h1>
        </div>
      </main>
    );
  }

  const [cache] = await db
    .select()
    .from(caches)
    .where(eq(caches.id, currentSequence.cacheId))
    .limit(1);

  if (!cache) notFound();

  const [progressLog] = await db
    .select()
    .from(progressLogs)
    .where(
      and(
        eq(progressLogs.teamId, team.id),
        eq(progressLogs.cacheId, cache.id),
      ),
    )
    .limit(1);

  const [{ totalPoints }] = await db
    .select({ totalPoints: sum(progressLogs.points) })
    .from(progressLogs)
    .where(eq(progressLogs.teamId, team.id));

  const score = Number(totalPoints ?? 0);
  const clue2Visible = !!progressLog?.clue2RequestedTimestamp;
  const clue3Visible = !!progressLog?.clue3RequestedTimestamp;
  const showRequestButton = !clue3Visible;
  const showCannotFind = clue3Visible;

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-6 bg-white">
      <div className="max-w-md w-full space-y-6">
        <div className="border-b pb-4 flex justify-between items-start">
          <h1 className="text-2xl font-bold text-gray-900">{team.displayName}</h1>
          <span className="text-lg font-semibold text-blue-700">
            Score: <span id="score">{score}</span>
          </span>
        </div>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-blue-700 uppercase tracking-wide">Clue 1</h2>
          <p className="text-xl text-gray-800 leading-relaxed">{cache.clue1Text}</p>
        </section>

        {clue2Visible && (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-orange-600 uppercase tracking-wide">Clue 2</h2>
            <p className="text-xl text-gray-800 leading-relaxed">{cache.clue2Text}</p>
          </section>
        )}

        {clue3Visible && (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-red-600 uppercase tracking-wide">Clue 3</h2>
            <p className="text-xl text-gray-800 leading-relaxed">{cache.clue3Text}</p>
            {cache.clue3ImageUrl && (
              <img
                src={cache.clue3ImageUrl}
                alt="Cache location hint"
                className="w-full rounded-lg border"
              />
            )}
          </section>
        )}

        <div className="space-y-3 pt-2">
          {showRequestButton && (
            <form action={`/api/clue/${team.id}/request-next`} method="post">
              <button
                type="submit"
                className="w-full bg-blue-600 text-white font-bold py-4 rounded-lg text-lg hover:bg-blue-700 transition-colors"
              >
                Request next clue
              </button>
            </form>
          )}

          {showCannotFind && (
            <form action={`/api/clue/${team.id}/cannot-find`} method="post">
              <button
                type="submit"
                className="w-full bg-red-100 text-red-700 font-semibold py-3 rounded-lg text-lg hover:bg-red-200 transition-colors border border-red-300"
              >
                Cannot find cache
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
