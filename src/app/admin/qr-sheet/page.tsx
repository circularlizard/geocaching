import { requireAdminAuth } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { registrationTokens, games, teams } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export default async function AdminQrSheetPage() {
  requireAdminAuth();

  const [activeGame] = await db
    .select()
    .from(games)
    .where(eq(games.isActive, true))
    .limit(1);

  const allTokens = await db.select().from(registrationTokens);

  const tokenLinks = allTokens.map((t) => ({
    token: t.token,
    url: `${APP_URL}/scan?id=${t.token}`,
  }));

  return (
    <main className="min-h-screen bg-white p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">QR Code Print Sheet</h1>
        {activeGame && (
          <p className="text-gray-600">Game: <strong>{activeGame.name}</strong></p>
        )}

        <div className="grid grid-cols-2 gap-6">
          {tokenLinks.map(({ token, url }) => (
            <div
              key={token}
              className="border border-gray-300 rounded-xl p-6 text-center space-y-3"
            >
              <p className="font-mono text-sm text-gray-700 break-all">{token}</p>
              <p className="text-xs text-gray-500 break-all">
                URL: <span className="font-mono">{url}</span>
              </p>
              <p className="text-xs text-gray-400">
                [QR code for: {url}]
              </p>
            </div>
          ))}
        </div>

        {tokenLinks.length === 0 && (
          <p className="text-gray-400">No registration tokens found.</p>
        )}
      </div>
    </main>
  );
}
