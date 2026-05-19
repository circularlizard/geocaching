import { requireAdminAuth } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { caches, games, gameCaches } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import CreateCacheForm from './CreateCacheForm';
import AssignCachesForm from './AssignCachesForm';

export default async function AdminCachesPage() {
  requireAdminAuth();

  const [activeGame] = await db
    .select()
    .from(games)
    .where(eq(games.isActive, true))
    .limit(1);

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
    cacheToken: c.cacheToken,
    assigned: assignedSet.has(c.id),
  }));

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Manage Caches</h1>
          <div className="flex gap-3 items-center">
            <a
              href="/admin/cache-qr-sheet"
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              Cache QR Codes
            </a>
            <a href="/admin/setup" className="text-blue-600 hover:underline text-sm">
              ← Game Setup
            </a>
          </div>
        </div>

        <section className="bg-white rounded-xl shadow p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">
              All Caches ({allCaches.length})
            </h2>
            <CreateCacheForm />
          </div>

          {allCaches.length === 0 ? (
            <p className="text-gray-400 text-sm">No caches yet. Create one above.</p>
          ) : (
            <div className="divide-y">
              {cacheItems.map((c) => (
                <div key={c.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{c.cacheToken}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {activeGame && (
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${
                          c.assigned
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {c.assigned ? 'In game' : 'Not assigned'}
                      </span>
                    )}
                    <a
                      href={`/admin/caches/${c.id}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View details
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {activeGame && allCaches.length > 0 && (
          <section className="bg-white rounded-xl shadow p-6 space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Assign Caches to Game</h2>
              <p className="text-sm text-gray-500 mt-1">
                Active game: <strong>{activeGame.name}</strong>
              </p>
            </div>
            <AssignCachesForm gameId={activeGame.id} caches={cacheItems} />
          </section>
        )}

        {!activeGame && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-yellow-800 text-sm">
            No active game.{' '}
            <a href="/admin/setup" className="underline">
              Create one in Game Setup
            </a>{' '}
            to assign caches.
          </div>
        )}
      </div>
    </main>
  );
}
