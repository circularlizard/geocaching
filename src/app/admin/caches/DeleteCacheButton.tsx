'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteCacheButton({ cacheId }: { cacheId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    if (!confirm('Delete this cache? This cannot be undone.')) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/cache/${cacheId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to delete');
        return;
      }
      router.refresh();
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleDelete}
        disabled={loading}
        className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
        title="Delete cache"
      >
        {loading ? '…' : 'Delete'}
      </button>
      {error && <p className="text-red-600 text-xs mt-1 max-w-48">{error}</p>}
    </div>
  );
}
