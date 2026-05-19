import { requireAdminAuth } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { caches, games, gameCaches } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import EditCacheForm from './EditCacheForm';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) return { title: 'Geocache Details' };
  const [cache] = await db.select({ name: caches.name }).from(caches).where(eq(caches.id, id)).limit(1);
  return { title: cache ? cache.name : 'Geocache Details' };
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export default async function AdminCacheDetailPage({ params }: { params: { id: string } }) {
  requireAdminAuth();

  const cacheId = parseInt(params.id, 10);
  const [cache] = await db.select().from(caches).where(eq(caches.id, cacheId)).limit(1);
  if (!cache) notFound();

  const [activeGame] = await db.select().from(games).where(eq(games.isActive, true)).limit(1);
  const inActiveGame = activeGame
    ? (await db.select().from(gameCaches).where(eq(gameCaches.cacheId, cacheId))).some(
        (gc) => gc.gameId === activeGame.id,
      )
    : false;

  const scanUrl = `${APP_URL}/scan?id=${cache.cacheToken}`;
  const qrSvg = await QRCode.toString(scanUrl, { type: 'svg', margin: 1 });

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500" aria-label="Breadcrumb">
          <a href="/admin/caches" className="hover:text-gray-700 hover:underline">Geocaches</a>
          <span className="mx-2">/</span>
          <span className="text-gray-900 font-medium">{cache.name}</span>
        </nav>

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{cache.name}</h1>
          {activeGame && (
            <span className={`mt-1 inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
              inActiveGame ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {inActiveGame ? `In game: ${activeGame.name}` : 'Not in active game'}
            </span>
          )}
        </div>

        {/* QR code + identity */}
        <section className="bg-white rounded-xl shadow p-6 flex flex-col sm:flex-row gap-6 items-center">
          <div
            className="w-44 h-44 shrink-0"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <div className="space-y-3 text-sm w-full">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Geocache Token</p>
              <p className="font-mono text-gray-800 break-all">{cache.cacheToken}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Scan URL</p>
              <p className="font-mono text-gray-500 break-all text-xs">{scanUrl}</p>
            </div>
            <a
              href="/admin/cache-qr-sheet"
              className="inline-block mt-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs font-medium"
            >
              Print all geocache QR codes →
            </a>
          </div>
        </section>

        {/* Edit Geocache Form */}
        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Edit Geocache</h2>
          <EditCacheForm
            cacheId={cache.id}
            initialName={cache.name}
            initialClue1={cache.clue1Text}
            initialClue2={cache.clue2Text}
            initialClue3={cache.clue3Text}
            currentImageUrl={cache.clue3ImageUrl ?? null}
          />
        </section>

      </div>
    </main>
  );
}
