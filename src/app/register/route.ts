import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { registrationTokens, teams, games } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

function formHtml(token: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
  <title>Register Your Team — QR Code Geocaching Tracker</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#fff;display:flex;min-height:100svh;align-items:center;justify-content:center;padding:1.5rem}
    .card{max-width:480px;width:100%}
    h1{font-size:1.75rem;font-weight:700;color:#111827;text-align:center;margin-bottom:.5rem}
    .subtitle{color:#6b7280;text-align:center;margin-bottom:1.5rem;font-size:1rem}
    label{display:block;font-size:.875rem;font-weight:600;color:#374151;margin-bottom:.375rem}
    .hint{font-weight:400;color:#6b7280}
    input,textarea{width:100%;border:1.5px solid #d1d5db;border-radius:.5rem;padding:.75rem 1rem;font-size:1.0625rem;font-family:inherit;outline:none;transition:border-color .15s}
    input:focus,textarea:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.15)}
    textarea{resize:vertical;min-height:80px}
    .field{margin-bottom:1.25rem}
    .req{color:#ef4444}
    button{width:100%;background:#2563eb;color:#fff;font-weight:700;font-size:1.125rem;padding:1rem;border:none;border-radius:.5rem;cursor:pointer;margin-top:.5rem;transition:background .15s}
    button:hover{background:#1d4ed8}
    button:active{background:#1e40af}
  </style>
</head>
<body>
  <div class="card">
    <h1>Register Your Team</h1>
    <p class="subtitle">Enter your team details to begin the hunt.</p>
    <form action="/api/register" method="POST">
      <input type="hidden" name="token" value="${token}"/>
      <div class="field">
        <label for="teamName">Team Name <span class="req">*</span></label>
        <input id="teamName" name="teamName" type="text" required placeholder="e.g. The Explorers"/>
      </div>
      <div class="field">
        <label for="members">Team Members <span class="req">*</span> <span class="hint">(4–8, comma-separated)</span></label>
        <textarea id="members" name="members" required placeholder="e.g. Alice, Bob, Carol, Dave"></textarea>
      </div>
      <button type="submit">Start the Hunt →</button>
    </form>
  </div>
</body>
</html>`;
}

function errorHtml(message: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
  <title>Registration Error — QR Code Geocaching Tracker</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#fff;display:flex;min-height:100svh;align-items:center;justify-content:center;padding:2rem}
    .card{max-width:400px;width:100%;text-align:center}
    .emoji{font-size:4rem;margin-bottom:1rem}
    h1{font-size:1.5rem;font-weight:700;color:#dc2626;margin-bottom:.75rem}
    p{color:#374151;font-size:1.0625rem;line-height:1.6}
  </style>
</head>
<body>
  <div class="card">
    <div class="emoji">❌</div>
    <h1>Registration Error</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawToken = searchParams.get('token');
  const tokenValue = Array.isArray(rawToken) ? rawToken[0] : rawToken;

  if (!tokenValue) {
    return new NextResponse(errorHtml('Invalid registration link. No token provided.'), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const [activeGame] = await db
    .select()
    .from(games)
    .where(eq(games.isActive, true))
    .limit(1);

  if (!activeGame) {
    return new NextResponse(errorHtml('No active game found.'), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const [regToken] = await db
    .select()
    .from(registrationTokens)
    .where(eq(registrationTokens.token, tokenValue))
    .limit(1);

  if (!regToken) {
    return new NextResponse(errorHtml('Registration token not found.'), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const [existingTeam] = await db
    .select()
    .from(teams)
    .where(
      and(
        eq(teams.registrationTokenId, regToken.id),
        eq(teams.gameId, activeGame.id),
      ),
    )
    .limit(1);

  if (existingTeam) {
    return NextResponse.redirect(new URL(`/clue/${existingTeam.id}`, request.url), 307);
  }

  return new NextResponse(formHtml(tokenValue), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
