import { requireAdminAuth } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { games, caches, gameCaches } from '@/lib/db/schema';
import { eq, desc, asc } from 'drizzle-orm';
import CreateGameForm from './CreateGameForm';
import EditEndTimeForm from './EditEndTimeForm';
import AssignCachesForm from '../caches/AssignCachesForm';

export const metadata = { title: 'Game Setup' };

function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default async function AdminSetupPage() {
  requireAdminAuth();

  const allGames = await db.select().from(games).orderBy(desc(games.id));
  const activeGame = allGames.find((g) => g.isActive);

  const allCaches = await db.select().from(caches).orderBy(asc(caches.name));
  const assignedIds = activeGame
    ? (await db.select().from(gameCaches).where(eq(gameCaches.gameId, activeGame.id))).map(
        (gc) => gc.cacheId,
      )
    : [];
  const assignedSet = new Set(assignedIds);
  const cacheItems = allCaches.map((c) => ({
    id: c.id,
    name: c.name,
    assigned: assignedSet.has(c.id),
  }));

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-gray-900">Game Setup</h1>

        {activeGame ? (
          <>
            <section className="bg-white rounded-xl shadow p-6 space-y-4">
              <h2 className="text-xl font-semibold text-gray-800">Active Game</h2>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Name</p>
                  <p className="font-medium">{activeGame.name}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Caches</p>
                  <p className="font-medium">{activeGame.cacheCount}</p>
                </div>
              </div>
              <EditEndTimeForm
                gameId={activeGame.id}
                currentEndTime={toDatetimeLocal(activeGame.gameEndTime)}
              />
            </section>

            {allCaches.length > 0 && (
              <section className="bg-white rounded-xl shadow p-6 space-y-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">Caches in Game</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Select which caches are active for <strong>{activeGame.name}</strong>.
                  </p>
                </div>
                <AssignCachesForm gameId={activeGame.id} caches={cacheItems} />
              </section>
            )}
          </>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-yellow-800 text-sm">
            No active game. Create one below.
          </div>
        )}

        <section className="bg-white rounded-xl shadow p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">
            {activeGame ? 'Start a New Game' : 'Create Game'}
          </h2>
          {activeGame && (
            <p className="text-sm text-gray-500">
              Creating a new game will deactivate <strong>{activeGame.name}</strong>.
            </p>
          )}
          <CreateGameForm />
        </section>

        {allGames.length > 1 && (
          <section className="bg-white rounded-xl shadow p-6 space-y-3">
            <h2 className="text-xl font-semibold text-gray-800">All Games</h2>
            <div className="divide-y">
              {allGames.map((g) => (
                <div key={g.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{g.name}</p>
                    <p className="text-xs text-gray-500">
                      Ends {g.gameEndTime.toLocaleString()} · {g.cacheCount} caches
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      g.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {g.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </main>
  );
}
