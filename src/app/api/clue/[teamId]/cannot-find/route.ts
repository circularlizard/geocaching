import { NextResponse } from 'next/server';

export async function POST(
  _request: Request,
  { params }: { params: { teamId: string } },
) {
  const { teamId } = params;
  return NextResponse.redirect(
    new URL(`/skip/${teamId}`, _request.url),
    { status: 302 },
  );
}
