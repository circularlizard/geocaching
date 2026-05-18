import { requireAdminAuth } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { registrationTokens, teams, games } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export default async function AdminTokensPage() {
  requireAdminAuth();

  const [activeGame] = await db
    .select()
    .from(games)
    .where(eq(games.isActive, true))
    .limit(1);

  const allTokens = await db.select().from(registrationTokens);

  const tokenStatus = await Promise.all(
    allTokens.map(async (token) => {
      const usedInGame = activeGame
        ? await db
            .select()
            .from(teams)
            .where(
              and(
                eq(teams.registrationTokenId, token.id),
                eq(teams.gameId, activeGame.id),
              ),
            )
            .limit(1)
        : [];
      return { token, used: usedInGame.length > 0 };
    }),
  );

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Registration Tokens</h1>

        <div className="bg-white rounded-xl shadow divide-y">
          {tokenStatus.map(({ token, used }) => (
            <div key={token.id} className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="font-mono text-sm text-gray-900">{token.token}</p>
              </div>
              <span
                className={`text-xs font-medium px-3 py-1 rounded-full ${
                  used
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {used ? 'Used' : 'Unused'}
              </span>
            </div>
          ))}
          {tokenStatus.length === 0 && (
            <p className="px-6 py-4 text-gray-400">No registration tokens found.</p>
          )}
        </div>

        <a href="/admin/dashboard" className="text-blue-600 hover:underline text-sm">
          ← Back to Dashboard
        </a>
      </div>
    </main>
  );
}
