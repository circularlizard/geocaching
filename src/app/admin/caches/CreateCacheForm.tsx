'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateCacheForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [clue1, setClue1] = useState('');
  const [clue2, setClue2] = useState('');
  const [clue3, setClue3] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/cache/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, clue1, clue2, clue3 }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to create cache');
        return;
      }
      router.refresh();
      setName('');
      setClue1('');
      setClue2('');
      setClue3('');
      setOpen(false);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 text-sm"
      >
        + New Cache
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
      <h3 className="font-semibold text-gray-800">New Cache</h3>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name / Location</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g. Oak Tree Cache"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {(['1', '2', '3'] as const).map((n) => {
        const val = n === '1' ? clue1 : n === '2' ? clue2 : clue3;
        const set = n === '1' ? setClue1 : n === '2' ? setClue2 : setClue3;
        return (
          <div key={n}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Clue {n}</label>
            <textarea
              value={val}
              onChange={(e) => set(e.target.value)}
              required
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        );
      })}
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
        >
          {loading ? 'Creating…' : 'Create Cache'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
