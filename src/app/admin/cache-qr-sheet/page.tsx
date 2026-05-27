import { requireAdminAuth } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { caches, games, gameCaches } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import QRCode from 'qrcode';
import PrintButton from '@/components/PrintButton';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export default async function AdminCacheQrSheetPage() {
  requireAdminAuth();

  const [activeGame] = await db
    .select()
    .from(games)
    .where(eq(games.isActive, true))
    .limit(1);

  const assignedIds = activeGame
    ? new Set(
        (await db.select().from(gameCaches).where(eq(gameCaches.gameId, activeGame.id))).map(
          (gc) => gc.cacheId,
        ),
      )
    : new Set<number>();

  const allCaches = await db.select().from(caches);

  const cacheLinks = await Promise.all(
    allCaches.map(async (c) => {
      const url = `${APP_URL}/scan?id=${c.cacheToken}`;
      const svg = await QRCode.toString(url, { type: 'svg', margin: 1 });
      return { id: c.id, name: c.name, token: c.cacheToken, url, svg, inGame: assignedIds.has(c.id) };
    }),
  );

  return (
    <main className="min-h-screen bg-white p-8 print:p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Geocache Location QR Codes</h1>
            <p className="text-sm text-gray-500 mt-1">
              All {cacheLinks.length} geocaches — QR codes are fixed per physical geocache, game-independent.
              {activeGame && <> Blue border = in current game (<strong>{activeGame.name}</strong>).</>}
            </p>
          </div>
          <div className="flex gap-3">
            <PrintButton />
          </div>
        </div>

        {cacheLinks.length === 0 && (
          <p className="text-gray-400">
            No geocaches found.{' '}
            <a href="/admin/caches" className="text-blue-600 underline">Create one first.</a>
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 print:gap-4 print:grid-cols-2">
          {cacheLinks.map(({ name, token, url, svg, inGame }) => (
            <div
              key={token}
              className={`border-2 rounded-xl p-6 text-center space-y-3 print:border-black print:rounded-none print:break-inside-avoid ${
                inGame ? 'border-blue-400' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between print:hidden">
                <p className="font-semibold text-gray-900 text-sm">{name}</p>
                {activeGame && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${inGame ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                    {inGame ? 'In game' : 'Not assigned'}
                  </span>
                )}
              </div>
              <p className="font-semibold text-gray-900 text-sm hidden print:block">{name}</p>
              <div
                className="w-48 h-48 mx-auto"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
              <p className="font-mono text-xs text-gray-500 break-all">{token}</p>
              <p className="text-xs text-gray-400 break-all font-mono">{url}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
