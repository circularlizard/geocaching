import { requireAdminAuth } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { caches, games, gameCaches } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import CreateCacheForm from './CreateCacheForm';
import DeleteCacheButton from './DeleteCacheButton';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export const metadata = { title: 'Manage Geocaches' };

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
    scanUrl: `${APP_URL}/scan?id=${c.cacheToken}`,
    assigned: assignedSet.has(c.id),
  }));

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Manage Geocaches</h1>
          <a
            href="/admin/cache-qr-sheet"
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            Geocache QR Codes
          </a>
        </div>

        <CreateCacheForm />

        <section className="bg-white rounded-xl shadow p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">
            All Geocaches ({allCaches.length})
          </h2>

          {allCaches.length === 0 ? (
            <p className="text-gray-400 text-sm">No geocaches yet. Create one above.</p>
          ) : (
            <div className="divide-y">
              {cacheItems.map((c) => (
                <div key={c.id} className="py-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{c.name}</p>
                    <a
                      href={c.scanUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-400 font-mono hover:text-gray-600 hover:underline break-all"
                    >
                      {c.scanUrl}
                    </a>
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
                      className="text-xs text-blue-600 hover:underline self-center"
                    >
                      View details
                    </a>
                    {!c.assigned && <DeleteCacheButton cacheId={c.id} />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}
