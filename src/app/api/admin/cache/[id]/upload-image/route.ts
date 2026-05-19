import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { caches } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { ADMIN_COOKIE_NAME, ADMIN_COOKIE_VALUE } from '@/lib/admin-auth';
import { randomUUID } from 'crypto';
import * as Minio from 'minio';

function isAuthed(request: Request): boolean {
  const cookie = request.headers.get('cookie') ?? '';
  return cookie.includes(`${ADMIN_COOKIE_NAME}=${ADMIN_COOKIE_VALUE}`);
}

async function uploadToStorage(
  filename: string,
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  const endpointRaw = process.env.MINIO_ENDPOINT;
  const accessKey = process.env.MINIO_ACCESS_KEY;
  const secretKey = process.env.MINIO_SECRET_KEY;
  const bucket = process.env.MINIO_BUCKET ?? 'geocache';

  if (!endpointRaw || !accessKey || !secretKey) {
    throw new Error('MinIO environment variables are not configured');
  }

  const endpointUrl = new URL(endpointRaw);
  const client = new Minio.Client({
    endPoint: endpointUrl.hostname,
    port: endpointUrl.port ? parseInt(endpointUrl.port, 10) : undefined,
    useSSL: endpointUrl.protocol === 'https:',
    accessKey,
    secretKey,
  });

  const exists = await client.bucketExists(bucket);
  if (!exists) {
    await client.makeBucket(bucket);
    await client.setBucketPolicy(
      bucket,
      JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucket}/*`],
          },
        ],
      }),
    );
  }

  await client.putObject(bucket, filename, buffer, buffer.length, { 'Content-Type': mimeType });

  return `${endpointRaw}/${bucket}/${filename}`;
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
  const buffer = Buffer.from(arrayBuffer);

  let imageUrl: string;
  try {
    imageUrl = await uploadToStorage(filename, buffer, file.type || 'image/jpeg');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const [updated] = await db
    .update(caches)
    .set({ clue3ImageUrl: imageUrl })
    .where(eq(caches.id, cacheId))
    .returning();

  return NextResponse.json({ cache: updated, url: imageUrl }, { status: 200 });
}
