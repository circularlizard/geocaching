import { requireAdminAuth } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { caches, games, gameCaches } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import EditClueForm from './EditClueForm';
import UploadImageForm from './UploadImageForm';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) return { title: 'Cache Details' };
  const [cache] = await db.select({ name: caches.name }).from(caches).where(eq(caches.id, id)).limit(1);
  return { title: cache ? cache.name : 'Cache Details' };
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

        {/* Header */}
        <div className="flex items-start justify-between">
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
          <a href="/admin/caches" className="text-blue-600 hover:underline text-sm mt-1">
            ← Manage Caches
          </a>
        </div>

        {/* QR code + identity */}
        <section className="bg-white rounded-xl shadow p-6 flex flex-col sm:flex-row gap-6 items-center">
          <div
            className="w-44 h-44 shrink-0"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <div className="space-y-3 text-sm w-full">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cache Token</p>
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
              Print all cache QR codes →
            </a>
          </div>
        </section>

        {/* Clues */}
        <section className="bg-white rounded-xl shadow p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-800">Clues</h2>
          <EditClueForm cacheId={cache.id} clue="clue1" initialText={cache.clue1Text} />
          <hr />
          <EditClueForm cacheId={cache.id} clue="clue2" initialText={cache.clue2Text} />
          <hr />
          <EditClueForm cacheId={cache.id} clue="clue3" initialText={cache.clue3Text} />
        </section>

        {/* Clue 3 image */}
        <section className="bg-white rounded-xl shadow p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Clue 3 Image</h2>
            <p className="text-xs text-gray-500 mt-0.5">Shown to teams only after they request the third clue.</p>
          </div>
          <UploadImageForm cacheId={cache.id} currentImageUrl={cache.clue3ImageUrl ?? null} />
        </section>

      </div>
    </main>
  );
}
