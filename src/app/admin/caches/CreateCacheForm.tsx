'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateCacheForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [clue1, setClue1] = useState('');
  const [clue2, setClue2] = useState('');
  const [clue3, setClue3] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  }

  function clearImage() {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function resetForm() {
    setName('');
    setClue1('');
    setClue2('');
    setClue3('');
    clearImage();
  }

  async function handleSubmit(e: React.FormEvent, andAnother: boolean) {
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

      const { cache } = await res.json();

      if (selectedFile && cache?.id) {
        const form = new FormData();
        form.append('image', selectedFile);
        const uploadRes = await fetch(`/api/admin/cache/${cache.id}/upload-image`, {
          method: 'POST',
          body: form,
        });
        if (!uploadRes.ok) {
          const uploadData = await uploadRes.json();
          console.warn('Image upload failed:', uploadData.error);
        }
      }

      router.refresh();
      resetForm();

      if (!andAnother) {
        setOpen(false);
      }
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
    <form className="bg-white border border-gray-200 rounded-xl p-6 space-y-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 text-lg">Create New Cache</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Cache Name / Location
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Oak Tree Cache"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Clue 1 <span className="text-gray-400 font-normal">— Getting there</span>
            </label>
            <textarea
              value={clue1}
              onChange={(e) => setClue1(e.target.value)}
              required
              rows={3}
              placeholder="Directions to the general area..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Clue 2 <span className="text-gray-400 font-normal">— Close up</span>
            </label>
            <textarea
              value={clue2}
              onChange={(e) => setClue2(e.target.value)}
              required
              rows={3}
              placeholder="More specific location hints..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Clue 3 <span className="text-gray-400 font-normal">— Final hint (text + optional image)</span>
          </label>
          <textarea
            value={clue3}
            onChange={(e) => setClue3(e.target.value)}
            required
            rows={2}
            placeholder="Final description of exactly where the cache is hidden..."
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          />

          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Clue 3 Photo (optional)
            </label>
            <div className="flex items-start gap-4 flex-wrap">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="text-sm text-gray-600 file:mr-3 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-gray-100 file:text-gray-700 file:font-medium hover:file:bg-gray-200 cursor-pointer"
              />
              {previewUrl && (
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-24 w-24 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={clearImage}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 flex items-center justify-center"
                    aria-label="Remove image"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="button"
          onClick={(e) => handleSubmit(e, false)}
          disabled={loading}
          className="px-5 py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {loading ? 'Creating…' : 'Create Cache'}
        </button>
        <button
          type="button"
          onClick={(e) => handleSubmit(e, true)}
          disabled={loading}
          className="px-5 py-2.5 bg-green-100 text-green-700 font-semibold rounded-lg hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {loading ? 'Creating…' : 'Create & Add Another'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={loading}
          className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
