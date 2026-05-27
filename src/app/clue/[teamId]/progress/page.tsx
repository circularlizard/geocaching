import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { teams, caches, teamSequences, progressLogs, games } from '@/lib/db/schema';
import { eq, sum, asc } from 'drizzle-orm';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { teamId: string } }): Promise<Metadata> {
  const teamId = parseInt(params.teamId, 10);
  if (isNaN(teamId)) return { title: 'Team Progress' };
  const [team] = await db.select({ displayName: teams.displayName }).from(teams).where(eq(teams.id, teamId)).limit(1);
  return { title: team ? `Progress — ${team.displayName}` : 'Team Progress' };
}

export default async function ProgressPage({ params }: { params: { teamId: string } }) {
  const teamId = parseInt(params.teamId, 10);
  if (isNaN(teamId)) notFound();

  const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
  if (!team) notFound();

  const [activeGame] = await db
    .select()
    .from(games)
    .where(eq(games.isActive, true))
    .limit(1);

  const [{ total }] = await db
    .select({ total: sum(progressLogs.points) })
    .from(progressLogs)
    .where(eq(progressLogs.teamId, team.id));

  const score = Number(total ?? 0);

  const sequence = await db
    .select({
      sequenceOrder: teamSequences.sequenceOrder,
      cacheId: teamSequences.cacheId,
      cacheName: caches.name,
    })
    .from(teamSequences)
    .innerJoin(caches, eq(teamSequences.cacheId, caches.id))
    .where(eq(teamSequences.teamId, team.id))
    .orderBy(asc(teamSequences.sequenceOrder));

  const logs = await db
    .select()
    .from(progressLogs)
    .where(eq(progressLogs.teamId, team.id));

  const logsByCacheId = new Map(logs.map((l) => [l.cacheId, l]));

  const totalCaches = activeGame?.cacheCount ?? sequence.length;

  const endTimeFormatted = activeGame
    ? activeGame.gameEndTime.toLocaleTimeString('en-GB', {
        timeZone: 'Europe/London',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-6 bg-white">
      <div className="max-w-md w-full space-y-6">
        {endTimeFormatted && (
          <div className="bg-amber-500 text-white text-center rounded-lg px-4 py-2 font-semibold text-sm tracking-wide">
            ⏰ Game ends at {endTimeFormatted}
          </div>
        )}

        <div className="border-b pb-4 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Progress</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {team.displayName}
            </p>
          </div>
          <div className="text-right shrink-0 ml-4">
            <div className="text-2xl font-bold text-blue-700">{score} pts</div>
            <div className="text-xs text-gray-500">
              {team.currentCacheIndex} of {totalCaches} done
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {sequence.map((seq, idx) => {
            const log = logsByCacheId.get(seq.cacheId);
            const isCurrent = idx === team.currentCacheIndex;
            const isDone = !!log?.foundTimestamp;
            const isSkipped = !!log?.skipped;
            const isFuture = !isDone && !isSkipped && !isCurrent;

            let statusIcon = '';
            let rowClass = '';
            let statusLabel = '';

            if (isSkipped) {
              statusIcon = '⏭️';
              rowClass = 'bg-red-50 border-red-200';
              statusLabel = 'Skipped';
            } else if (isDone) {
              const pts = log?.points ?? 0;
              statusIcon = '✅';
              rowClass = 'bg-green-50 border-green-200';
              statusLabel = `${pts} pt${pts !== 1 ? 's' : ''}`;
            } else if (isCurrent) {
              statusIcon = '🔍';
              rowClass = 'bg-blue-50 border-blue-300';
              statusLabel = 'Current';
            } else {
              statusIcon = '⬜';
              rowClass = 'bg-gray-50 border-gray-200';
              statusLabel = 'Not yet';
            }

            return (
              <div
                key={seq.cacheId}
                className={`flex items-center justify-between rounded-lg border px-4 py-3 ${rowClass}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{statusIcon}</span>
                  <div>
                    <p className={`font-medium text-sm ${isFuture ? 'text-gray-400' : 'text-gray-900'}`}>
                      #{idx + 1} {isFuture ? '—' : seq.cacheName}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    isSkipped
                      ? 'bg-red-100 text-red-700'
                      : isDone
                        ? 'bg-green-100 text-green-700'
                        : isCurrent
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {statusLabel}
                </span>
              </div>
            );
          })}
        </div>

        <div className="pt-2">
          <a
            href={`/clue/${team.id}`}
            className="block w-full bg-blue-600 text-white font-bold py-4 rounded-lg text-lg text-center hover:bg-blue-700 transition-colors"
          >
            ← Back to my clue
          </a>
        </div>
      </div>
    </main>
  );
}
