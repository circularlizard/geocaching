'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AddTokenButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleAdd() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/tokens/create', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to create token');
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
    <div className="flex items-center gap-3">
      <button
        onClick={handleAdd}
        disabled={loading}
        className="px-3 py-1.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? 'Adding…' : '+ Add Token'}
      </button>
      {error && <span className="text-red-600 text-sm">{error}</span>}
    </div>
  );
}

export function DeleteTokenButton({ tokenId }: { tokenId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    if (!confirm('Delete this token? This cannot be undone.')) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/tokens/${tokenId}`, { method: 'DELETE' });
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
        title="Delete token"
      >
        {loading ? '…' : 'Delete'}
      </button>
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  );
}
