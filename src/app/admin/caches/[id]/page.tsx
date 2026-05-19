import { requireAdminAuth } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { caches } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import EditClueForm from './EditClueForm';
import UploadImageForm from './UploadImageForm';

export default async function AdminCacheEditPage({ params }: { params: { id: string } }) {
  requireAdminAuth();

  const cacheId = parseInt(params.id, 10);
  const [cache] = await db.select().from(caches).where(eq(caches.id, cacheId)).limit(1);

  if (!cache) notFound();

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{cache.name}</h1>
            <p className="text-xs font-mono text-gray-400 mt-1">Token: {cache.cacheToken}</p>
          </div>
          <a href="/admin/caches" className="text-blue-600 hover:underline text-sm">
            ← Manage Caches
          </a>
        </div>

        <section className="bg-white rounded-xl shadow p-6 space-y-6">
          <h2 className="text-xl font-semibold text-gray-800">Edit Clues</h2>
          <EditClueForm cacheId={cache.id} clue="clue1" initialText={cache.clue1Text} />
          <EditClueForm cacheId={cache.id} clue="clue2" initialText={cache.clue2Text} />
          <EditClueForm cacheId={cache.id} clue="clue3" initialText={cache.clue3Text} />
        </section>

        <section className="bg-white rounded-xl shadow p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Clue 3 Image</h2>
          <UploadImageForm cacheId={cache.id} currentImageUrl={cache.clue3ImageUrl ?? null} />
        </section>
      </div>
    </main>
  );
}
