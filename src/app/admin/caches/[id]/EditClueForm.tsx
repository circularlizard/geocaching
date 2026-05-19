'use client';

import { useState } from 'react';

export default function EditClueForm({
  cacheId,
  clue,
  initialText,
}: {
  cacheId: number;
  clue: 'clue1' | 'clue2' | 'clue3';
  initialText: string;
}) {
  const [text, setText] = useState(initialText);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/cache/${cacheId}/clue`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clue, text }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to update');
        return;
      }
      setSaved(true);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  const label = clue === 'clue1' ? 'Clue 1' : clue === 'clue2' ? 'Clue 2' : 'Clue 3';

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setSaved(false); }}
        rows={3}
        required
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Save'}
        </button>
        {saved && <span className="text-green-600 text-sm">Saved ✓</span>}
        {error && <span className="text-red-600 text-sm">{error}</span>}
      </div>
    </form>
  );
}
