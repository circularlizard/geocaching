'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type CacheItem = { id: number; name: string; assigned: boolean };

export default function AssignCachesForm({ gameId, caches }: { gameId: number; caches: CacheItem[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(
    new Set(caches.filter((c) => c.assigned).map((c) => c.id)),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSaved(false);
  }

  async function handleSave() {
    setLoading(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/game/${gameId}/assign-caches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cacheIds: Array.from(selected) }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to save');
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="divide-y border rounded-lg overflow-hidden">
        {caches.map((c) => (
          <label key={c.id} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={selected.has(c.id)}
              onChange={() => toggle(c.id)}
              className="h-4 w-4 accent-blue-600"
            />
            <span className="text-sm text-gray-800">{c.name}</span>
          </label>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={loading || selected.size === 0}
          className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
        >
          {loading ? 'Saving…' : `Save (${selected.size} geocaches)`}
        </button>
        {saved && <span className="text-green-600 text-sm">Saved ✓</span>}
        {error && <span className="text-red-600 text-sm">{error}</span>}
      </div>
    </div>
  );
}
