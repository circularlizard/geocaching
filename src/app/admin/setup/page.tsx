import { requireAdminAuth } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { games } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import CreateGameForm from './CreateGameForm';
import EditEndTimeForm from './EditEndTimeForm';

function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default async function AdminSetupPage() {
  requireAdminAuth();

  const allGames = await db.select().from(games).orderBy(desc(games.id));
  const activeGame = allGames.find((g) => g.isActive);

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Game Setup</h1>
          <a href="/admin/dashboard" className="text-blue-600 hover:underline text-sm">
            ← Dashboard
          </a>
        </div>

        {activeGame ? (
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

        <div className="flex gap-4">
          <a
            href="/admin/caches"
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 text-sm"
          >
            Manage Caches →
          </a>
        </div>
      </div>
    </main>
  );
}
