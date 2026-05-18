import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { caches } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { ADMIN_COOKIE_NAME, ADMIN_COOKIE_VALUE } from '@/lib/admin-auth';
import { randomUUID } from 'crypto';

function isAuthed(request: Request): boolean {
  const cookie = request.headers.get('cookie') ?? '';
  return cookie.includes(`${ADMIN_COOKIE_NAME}=${ADMIN_COOKIE_VALUE}`);
}

async function uploadToStorage(
  filename: string,
  arrayBuffer: ArrayBuffer,
  mimeType: string,
): Promise<string> {
  const endpoint = process.env.MINIO_ENDPOINT;
  const accessKey = process.env.MINIO_ACCESS_KEY;
  const secretKey = process.env.MINIO_SECRET_KEY;
  const bucket = process.env.MINIO_BUCKET ?? 'geocache';

  if (endpoint && accessKey && secretKey) {
    try {
      const url = `${endpoint}/${bucket}/${filename}`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': mimeType,
          'Content-Length': String(arrayBuffer.byteLength),
        },
        body: arrayBuffer,
      });
      if (res.ok) return url;
    } catch {
      // fall through to placeholder
    }
  }

  return `/clue3-images/${filename}`;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  if (!isAuthed(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cacheId = parseInt(params.id, 10);

  const form = await request.formData();
  const file = form.get('image') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
  }

  const ext = file.name.split('.').pop() ?? 'jpg';
  const filename = `clue3-${cacheId}-${randomUUID().slice(0, 8)}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const imageUrl = await uploadToStorage(filename, arrayBuffer, file.type || 'image/jpeg');

  const [updated] = await db
    .update(caches)
    .set({ clue3ImageUrl: imageUrl })
    .where(eq(caches.id, cacheId))
    .returning();

  return NextResponse.json({ cache: updated, url: imageUrl }, { status: 200 });
}
