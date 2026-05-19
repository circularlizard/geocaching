'use client';

import { useState, useRef } from 'react';

interface EditCacheFormProps {
  cacheId: number;
  initialName: string;
  initialClue1: string;
  initialClue2: string;
  initialClue3: string;
  currentImageUrl: string | null;
}

export default function EditCacheForm({
  cacheId,
  initialName,
  initialClue1,
  initialClue2,
  initialClue3,
  currentImageUrl,
}: EditCacheFormProps) {
  const [name, setName] = useState(initialName);
  const [clue1, setClue1] = useState(initialClue1);
  const [clue2, setClue2] = useState(initialClue2);
  const [clue3, setClue3] = useState(initialClue3);
  const [imageUrl, setImageUrl] = useState<string | null>(currentImageUrl);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const hasChanges =
    name !== initialName ||
    clue1 !== initialClue1 ||
    clue2 !== initialClue2 ||
    clue3 !== initialClue3 ||
    previewUrl !== null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    setSaved(false);
    setError('');
  }

  function clearImage() {
    setPreviewUrl(null);
    setImageUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSaved(false);

    try {
      const updates = [];

      if (name !== initialName) {
        updates.push(
          fetch(`/api/admin/cache/${cacheId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
          })
        );
      }

      if (clue1 !== initialClue1) {
        updates.push(
          fetch(`/api/admin/cache/${cacheId}/clue`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clue: 'clue1', text: clue1 }),
          })
        );
      }

      if (clue2 !== initialClue2) {
        updates.push(
          fetch(`/api/admin/cache/${cacheId}/clue`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clue: 'clue2', text: clue2 }),
          })
        );
      }

      if (clue3 !== initialClue3) {
        updates.push(
          fetch(`/api/admin/cache/${cacheId}/clue`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clue: 'clue3', text: clue3 }),
          })
        );
      }

      const file = fileInputRef.current?.files?.[0];
      if (file) {
        const form = new FormData();
        form.append('image', file);
        updates.push(
          fetch(`/api/admin/cache/${cacheId}/upload-image`, {
            method: 'POST',
            body: form,
          }).then(async (res) => {
            const data = await res.json();
            if (res.ok && data.url) {
              setImageUrl(data.url);
              setPreviewUrl(null);
            }
            return res;
          })
        );
      }

      const results = await Promise.all(updates);
      const failed = results.filter((r) => !r.ok);

      if (failed.length > 0) {
        setError('Some changes could not be saved. Please try again.');
      } else {
        setSaved(true);
        if (!file) {
          setTimeout(() => setSaved(false), 3000);
        }
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Geocache Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <hr className="border-gray-200" />

      {/* Clues */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-900">Clues</h3>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Clue 1 <span className="text-gray-400 font-normal">(visible immediately)</span>
          </label>
          <textarea
            value={clue1}
            onChange={(e) => {
              setClue1(e.target.value);
              setSaved(false);
            }}
            rows={3}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Clue 2 <span className="text-gray-400 font-normal">(shown after team requests it)</span>
          </label>
          <textarea
            value={clue2}
            onChange={(e) => {
              setClue2(e.target.value);
              setSaved(false);
            }}
            rows={3}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Clue 3 <span className="text-gray-400 font-normal">(shown after team requests it)</span>
          </label>
          <textarea
            value={clue3}
            onChange={(e) => {
              setClue3(e.target.value);
              setSaved(false);
            }}
            rows={3}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* Image */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-900">Clue 3 Image</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Optional image shown alongside Clue 3
          </p>
        </div>

        {(previewUrl || imageUrl) && (
          <div className="relative inline-block">
            <img
              src={previewUrl || imageUrl || ''}
              alt="Clue 3 preview"
              className="max-w-sm rounded-lg border border-gray-200"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                setError('Image could not be loaded');
              }}
            />
            <button
              type="button"
              onClick={clearImage}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 flex items-center justify-center"
              title="Remove image"
            >
              ×
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="text-sm text-gray-600 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-gray-100 file:text-gray-700 file:font-medium hover:file:bg-gray-200 cursor-pointer"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={loading || !hasChanges}
          className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Saving…' : 'Save Changes'}
        </button>
        {saved && <span className="text-green-600 text-sm font-medium">✓ Saved successfully</span>}
        {error && <span className="text-red-600 text-sm">{error}</span>}
      </div>
    </form>
  );
}
