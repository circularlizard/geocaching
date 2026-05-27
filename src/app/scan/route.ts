import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { games, registrationTokens, teams, caches } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

function htmlResponse(title: string, emoji: string, heading: string, body: string, status = 200) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
  <title>QR Code Geocaching Tracker</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#fff;display:flex;min-height:100svh;align-items:center;justify-content:center;padding:2rem}
    .card{max-width:400px;width:100%;text-align:center}
    .emoji{font-size:4rem;margin-bottom:1rem}
    h1{font-size:1.5rem;font-weight:700;color:${status === 200 && heading.toLowerCase().includes('game') ? '#1f2937' : '#dc2626'};margin-bottom:.75rem}
    p{color:#374151;line-height:1.6;font-size:1.1rem}
  </style>
</head>
<body>
  <div class="card">
    <div class="emoji">${emoji}</div>
    <h1>${heading}</h1>
    <p>${body}</p>
  </div>
</body>
</html>`;
  return new NextResponse(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenId = searchParams.get('id');

  if (!tokenId) {
    return htmlResponse(
      'Error',
      '❓',
      'Code Not Recognised',
      'This QR code is not recognised. Please try scanning again or ask an organiser for help.',
    );
  }

  const [activeGame] = await db
    .select()
    .from(games)
    .where(eq(games.isActive, true))
    .limit(1);

  if (!activeGame) {
    return htmlResponse(
      'Error',
      '❓',
      'Code Not Recognised',
      'No active game found.',
    );
  }

  const now = new Date();
  if (activeGame.adminRecallTriggered || activeGame.gameEndTime <= now) {
    return htmlResponse(
      'Game Over',
      '🏁',
      'Game Over',
      'The game has ended. Thank you for playing — please make your way back to the start.',
    );
  }

  const [regToken] = await db
    .select()
    .from(registrationTokens)
    .where(eq(registrationTokens.token, tokenId))
    .limit(1);

  if (regToken) {
    const [team] = await db
      .select()
      .from(teams)
      .where(
        and(
          eq(teams.registrationTokenId, regToken.id),
          eq(teams.gameId, activeGame.id),
        ),
      )
      .limit(1);

    if (team) {
      const response = NextResponse.redirect(new URL(`/clue/${team.id}`, request.url), 307);
      response.cookies.set('geocache_team', String(team.id), {
        path: '/',
        sameSite: 'lax',
        maxAge: 86400,
        httpOnly: false,
      });
      return response;
    } else {
      return NextResponse.redirect(new URL(`/register?token=${tokenId}`, request.url), 307);
    }
  }

  const [cache] = await db
    .select()
    .from(caches)
    .where(eq(caches.cacheToken, tokenId))
    .limit(1);

  if (cache) {
    return NextResponse.redirect(new URL(`/found/${tokenId}`, request.url), 307);
  }

  return htmlResponse(
    'Error',
    '❓',
    'Code Not Recognised',
    'This QR code is not recognised. Please try scanning again or ask an organiser for help.',
  );
}
