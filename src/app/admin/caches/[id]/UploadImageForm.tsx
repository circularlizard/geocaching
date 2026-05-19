'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function UploadImageForm({ cacheId, currentImageUrl }: { cacheId: number; currentImageUrl: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentImageUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setSaved(false);
    setError('');
  }

  async function handleUpload() {
    const file = inputRef.current?.files?.[0];
    if (!file) return;
    setLoading(true);
    setError('');
    setSaved(false);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch(`/api/admin/cache/${cacheId}/upload-image`, {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Upload failed');
        return;
      }
      setPreview(data.url);
      setSaved(true);
      router.refresh();
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {preview && (
        <img
          src={preview}
          alt="Clue 3 preview"
          className="max-w-sm rounded-lg border border-gray-200"
        />
      )}
      {!preview && (
        <p className="text-sm text-gray-400">No image uploaded yet.</p>
      )}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="text-sm text-gray-600 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-gray-100 file:text-gray-700 file:font-medium hover:file:bg-gray-200 cursor-pointer"
        />
        <button
          type="button"
          onClick={handleUpload}
          disabled={loading}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Uploading…' : 'Upload'}
        </button>
        {saved && <span className="text-green-600 text-sm">Saved ✓</span>}
        {error && <span className="text-red-600 text-sm">{error}</span>}
      </div>
    </div>
  );
}
