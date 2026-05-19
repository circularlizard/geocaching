import { requireAdminAuth } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { teams, games, progressLogs, registrationTokens, teamSequences } from '@/lib/db/schema';
import { eq, sum, asc } from 'drizzle-orm';
import AutoRefresh from '@/components/AutoRefresh';

export default async function AdminDashboardPage() {
  requireAdminAuth();

  const [activeGame] = await db
    .select()
    .from(games)
    .where(eq(games.isActive, true))
    .limit(1);

  const allTeams = activeGame
    ? await db.select().from(teams).where(eq(teams.gameId, activeGame.id))
    : [];

  const allRegTokens = await db.select().from(registrationTokens);
  const totalTokens = allRegTokens.length;
  const registeredCount = allTeams.length;
  const unregisteredCount = Math.max(0, totalTokens - registeredCount);

  const teamData = await Promise.all(
    allTeams.map(async (team) => {
      const [{ total }] = await db
        .select({ total: sum(progressLogs.points) })
        .from(progressLogs)
        .where(eq(progressLogs.teamId, team.id));

      const logs = await db
        .select()
        .from(progressLogs)
        .where(eq(progressLogs.teamId, team.id));

      const sequence = await db
        .select({ sequenceOrder: teamSequences.sequenceOrder, cacheId: teamSequences.cacheId })
        .from(teamSequences)
        .where(eq(teamSequences.teamId, team.id))
        .orderBy(asc(teamSequences.sequenceOrder));

      const logsByCacheId = new Map(logs.map((l) => [l.cacheId, l]));

      const cacheRows = sequence.map((seq, idx) => {
        const log = logsByCacheId.get(seq.cacheId);
        return {
          cacheNumber: idx + 1,
          foundTimestamp: log?.foundTimestamp ?? null,
          skipped: log?.skipped ?? false,
        };
      });

      const members: string[] = JSON.parse(team.members);
      const totalCaches = activeGame?.cacheCount ?? sequence.length;
      const isComplete = team.currentCacheIndex >= totalCaches;
      const cacheProgress = isComplete
        ? `Completed (${totalCaches} of ${totalCaches})`
        : `Cache ${team.currentCacheIndex + 1} of ${totalCaches}`;

      return {
        team,
        score: Number(total ?? 0),
        members,
        cacheProgress,
        cacheRows,
        totalCaches,
        currentCacheIndex: team.currentCacheIndex,
      };
    }),
  );

  teamData.sort((a, b) => b.score - a.score);

  const maxScore = teamData[0]?.score ?? 0;
  const winners = teamData.filter((td) => td.score === maxScore && maxScore > 0);
  const isJointWin = winners.length > 1;

  function formatTime(ts: Date | null): string {
    if (!ts) return '';
    return ts.toISOString().substring(11, 16);
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <AutoRefresh intervalMs={10000} />
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          {activeGame && (
            <span className="text-sm text-gray-500">
              Game: <strong>{activeGame.name}</strong>
            </span>
          )}
        </div>

        {!activeGame && (
          <p className="text-gray-500">No active game. Create one in Admin Setup.</p>
        )}

        {isJointWin && (
          <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4">
            <p className="font-semibold text-yellow-800">
              🏆 Joint Winners ({maxScore} points):{' '}
              {winners.map((w) => w.team.displayName).join(' & ')}
            </p>
          </div>
        )}

        <div className="text-sm text-gray-600">
          <span className="font-medium">{`${registeredCount} registered teams`}</span>
          {unregisteredCount > 0 && (
            <span className="ml-4 text-gray-400">
              {`${unregisteredCount} unregistered token slot${unregisteredCount !== 1 ? 's' : ''}`}
            </span>
          )}
        </div>

        <div className="bg-white rounded-xl shadow divide-y">
          {teamData.map(({ team, score, members, cacheProgress, cacheRows }) => (
            <div key={team.id} className="px-6 py-4 space-y-2" data-team={team.displayName}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{team.displayName}</p>
                  <p className="text-sm text-gray-500">{members.join(', ')}</p>
                  <p className="text-sm text-gray-500">{cacheProgress}</p>
                </div>
                <div className="text-2xl font-bold text-blue-600">{score} pts</div>
              </div>
              {cacheRows.length > 0 && (
                <div className="flex flex-wrap gap-2 text-xs">
                  {cacheRows.map((cr) => (
                    <span
                      key={cr.cacheNumber}
                      className={`px-2 py-1 rounded ${
                        cr.skipped
                          ? 'bg-red-100 text-red-700'
                          : cr.foundTimestamp
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      #{cr.cacheNumber}:{' '}
                      {cr.skipped
                        ? 'Skipped'
                        : cr.foundTimestamp
                          ? formatTime(cr.foundTimestamp)
                          : '—'}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {teamData.length === 0 && (
            <p className="px-6 py-4 text-gray-400">No teams registered yet.</p>
          )}
        </div>

        <div className="flex gap-3 flex-wrap">
          <a
            href="/admin/recall-confirm"
            className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700"
          >
            Recall All Teams
          </a>
          <a
            href="/admin/tokens"
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900"
          >
            Registration Tokens
          </a>
          <a
            href="/admin/qr-sheet"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            QR Code Print Sheet
          </a>
        </div>
      </div>
    </main>
  );
}
