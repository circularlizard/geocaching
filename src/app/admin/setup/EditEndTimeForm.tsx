'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function EditEndTimeForm({ gameId, currentEndTime }: { gameId: number; currentEndTime: string }) {
  const router = useRouter();
  const [endTime, setEndTime] = useState(currentEndTime);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/game/${gameId}/end-time`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endTime }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to update');
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
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
        <input
          type="datetime-local"
          value={endTime}
          onChange={(e) => { setEndTime(e.target.value); setSaved(false); }}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Saving…' : 'Update'}
      </button>
      {saved && <span className="text-green-600 text-sm">Saved ✓</span>}
      {error && <span className="text-red-600 text-sm">{error}</span>}
    </form>
  );
}
