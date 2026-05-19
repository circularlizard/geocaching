import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { teams, caches, teamSequences, progressLogs, games } from '@/lib/db/schema';
import { eq, and, sum } from 'drizzle-orm';
import SetTeamCookie from '@/components/SetTeamCookie';
import RequestClueButton from './RequestClueButton';
import FoundItButton from './FoundItButton';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { teamId: string } }): Promise<Metadata> {
  const teamId = parseInt(params.teamId, 10);
  if (isNaN(teamId)) return { title: 'Cache Hunt' };
  const [team] = await db.select({ displayName: teams.displayName }).from(teams).where(eq(teams.id, teamId)).limit(1);
  return { title: team ? `Geocache Hunt — ${team.displayName}` : 'Geocache Hunt' };
}

export default async function CluePage({
  params,
  searchParams,
}: {
  params: { teamId: string };
  searchParams: { earned?: string };
}) {
  const justEarned = searchParams.earned ? parseInt(searchParams.earned, 10) : null;
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
          <h1 className="text-2xl font-bold text-gray-800">All geocaches complete!</h1>
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
  const showCannotFind = clue3Visible;

  const potentialPoints = clue3Visible ? 1 : clue2Visible ? 3 : 5;
  const nextClueNum: 2 | 3 = clue2Visible ? 3 : 2;
  const afterRequestPoints = nextClueNum === 2 ? 3 : 1;

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-6 bg-white">
      <SetTeamCookie teamId={team.id} />
      <div className="max-w-md w-full space-y-6">
        <div className="border-b pb-4 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{cache.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">Team: <span className="font-medium text-gray-700">{team.displayName}</span></p>
          </div>
          <span className="text-lg font-semibold text-blue-700 shrink-0 ml-4">
            Score: <span id="score">{score}</span>
          </span>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-blue-700 uppercase tracking-wide">Clue 1</h2>
          <p className="text-xl text-gray-800 leading-relaxed">{cache.clue1Text}</p>
        </section>

        {clue2Visible && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-orange-600 uppercase tracking-wide">Clue 2</h2>
            <p className="text-xl text-gray-800 leading-relaxed">{cache.clue2Text}</p>
          </section>
        )}

        {clue3Visible && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-red-600 uppercase tracking-wide">Clue 3</h2>
            <p className="text-xl text-gray-800 leading-relaxed">{cache.clue3Text}</p>
            {cache.clue3ImageUrl && (
              <img
                src={cache.clue3ImageUrl}
                alt="Geocache location hint"
                className="w-full rounded-lg border"
              />
            )}
          </section>
        )}

        {justEarned !== null && (
          <div className="bg-green-50 border border-green-300 rounded-lg px-4 py-3 text-sm text-green-800 text-center font-medium">
            🏆 You just earned <strong>{justEarned} point{justEarned !== 1 ? 's' : ''}</strong> for that geocache!
            Your total score is now <strong>{score}</strong>.
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-900 text-center">
          Find this geocache now to earn <strong>{potentialPoints} point{potentialPoints !== 1 ? 's' : ''}</strong>.
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800 text-center">
          📷 When you find the geocache, <strong>scan the QR code</strong> inside the box to record your find.
        </div>

        <div className="pt-2">
          <FoundItButton />
        </div>

        <div className="space-y-3 pt-4 border-t border-gray-200">
          {!clue3Visible && (
            <RequestClueButton
              teamId={team.id}
              currentPoints={potentialPoints}
              afterPoints={afterRequestPoints}
              nextClueNum={nextClueNum}
            />
          )}

          {showCannotFind && (
            <form action={`/api/clue/${team.id}/cannot-find`} method="post">
              <button
                type="submit"
                className="w-full bg-red-100 text-red-700 font-semibold py-3 rounded-lg text-lg hover:bg-red-200 transition-colors border border-red-300"
              >
                Cannot find geocache
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
