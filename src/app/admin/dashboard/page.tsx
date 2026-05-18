import { requireAdminAuth } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { teams, games, progressLogs, caches, gameCaches } from '@/lib/db/schema';
import { eq, sum } from 'drizzle-orm';

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

  const teamScores = await Promise.all(
    allTeams.map(async (team) => {
      const [{ total }] = await db
        .select({ total: sum(progressLogs.points) })
        .from(progressLogs)
        .where(eq(progressLogs.teamId, team.id));
      return { team, score: Number(total ?? 0) };
    }),
  );

  teamScores.sort((a, b) => b.score - a.score);

  const maxScore = teamScores[0]?.score ?? 0;
  const winners = teamScores.filter((ts) => ts.score === maxScore && maxScore > 0);
  const isJointWin = winners.length > 1;

  return (
    <main className="min-h-screen bg-gray-50 p-8">
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

        <div className="bg-white rounded-xl shadow divide-y">
          {teamScores.map(({ team, score }) => (
            <div key={team.id} className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="font-semibold text-gray-900">{team.displayName}</p>
                <p className="text-sm text-gray-500">
                  Cache {team.currentCacheIndex + 1} of {activeGame?.cacheCount ?? '?'}
                </p>
              </div>
              <div className="text-2xl font-bold text-blue-600">{score} pts</div>
            </div>
          ))}
          {teamScores.length === 0 && (
            <p className="px-6 py-4 text-gray-400">No teams registered yet.</p>
          )}
        </div>

        <div className="flex gap-3">
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
