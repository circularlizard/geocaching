'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateGameForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [endTime, setEndTime] = useState('');
  const [cacheCount, setCacheCount] = useState('8');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/game/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, endTime, cacheCount: Number(cacheCount) }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to create game');
        return;
      }
      router.refresh();
      setName('');
      setEndTime('');
      setCacheCount('8');
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Game Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g. Spring Hunt 2026"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
        <input
          type="datetime-local"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Number of Caches</label>
        <input
          type="number"
          min="1"
          max="20"
          value={cacheCount}
          onChange={(e) => setCacheCount(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? 'Creating…' : 'Create Game'}
      </button>
    </form>
  );
}
