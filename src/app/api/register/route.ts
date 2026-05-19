import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { games, registrationTokens, teams, caches, teamSequences, gameCaches } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

function formErrorHtml(token: string, error: string, teamName = '', members = '') {
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
    .error-banner{background:#fef2f2;border:1.5px solid #fca5a5;border-radius:.5rem;padding:.875rem 1rem;margin-bottom:1.25rem;color:#dc2626;font-size:.9375rem;font-weight:500}
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
    <div class="error-banner">⚠️ ${error}</div>
    <form action="/api/register" method="POST">
      <input type="hidden" name="token" value="${token}"/>
      <div class="field">
        <label for="teamName">Team Name <span class="req">*</span></label>
        <input id="teamName" name="teamName" type="text" required placeholder="e.g. The Explorers" value="${teamName.replace(/"/g, '&quot;')}"/>
      </div>
      <div class="field">
        <label for="members">Team Members <span class="req">*</span> <span class="hint">(4–8, comma-separated)</span></label>
        <textarea id="members" name="members" required placeholder="e.g. Alice, Bob, Carol, Dave">${members.replace(/</g, '&lt;')}</textarea>
      </div>
      <button type="submit">Start the Hunt →</button>
    </form>
  </div>
</body>
</html>`;
}

function htmlError(token: string, teamName: string, members: string, message: string) {
  return new NextResponse(formErrorHtml(token, message, teamName, members), {
    status: 422,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function POST(request: Request) {
  let token: string | undefined;
  let teamName: string | undefined;
  let membersRaw: string | undefined;

  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const body = await request.json();
    token = body.token;
    teamName = body.teamName;
    membersRaw = body.members;
  } else {
    const form = await request.formData();
    token = form.get('token') as string | undefined;
    teamName = form.get('teamName') as string | undefined;
    membersRaw = form.get('members') as string | undefined;
  }

  const isFormPost = !contentType.includes('application/json');
  const safeToken = token ?? '';
  const safeTeamName = teamName ?? '';
  const safeMembers = membersRaw ?? '';

  if (!teamName?.trim()) {
    if (isFormPost) return htmlError(safeToken, safeTeamName, safeMembers, 'Team name is required.');
    return NextResponse.json({ error: 'Team name is required' }, { status: 422 });
  }

  const memberList = safeMembers
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);

  if (memberList.length < 4) {
    if (isFormPost) return htmlError(safeToken, safeTeamName, safeMembers, `Please enter at least 4 team members — you entered ${memberList.length}.`);
    return NextResponse.json({ error: 'A minimum of 4 team members is required' }, { status: 422 });
  }

  if (memberList.length > 8) {
    if (isFormPost) return htmlError(safeToken, safeTeamName, safeMembers, `Maximum 8 team members allowed — you entered ${memberList.length}.`);
    return NextResponse.json({ error: 'A maximum of 8 team members is allowed' }, { status: 422 });
  }

  const [activeGame] = await db
    .select()
    .from(games)
    .where(eq(games.isActive, true))
    .limit(1);

  if (!activeGame) {
    return NextResponse.json({ error: 'No active game found' }, { status: 400 });
  }

  const [regToken] = await db
    .select()
    .from(registrationTokens)
    .where(eq(registrationTokens.token, token ?? ''))
    .limit(1);

  if (!regToken) {
    return NextResponse.json({ error: 'Invalid registration token' }, { status: 400 });
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
    return NextResponse.redirect(
      new URL(`/clue/${existingTeam.id}`, request.url),
      { status: 302 },
    );
  }

  const [team] = await db
    .insert(teams)
    .values({
      gameId: activeGame.id,
      registrationTokenId: regToken.id,
      displayName: teamName.trim(),
      members: JSON.stringify(memberList),
      currentCacheIndex: 0,
    })
    .returning();

  const assignedRows = await db
    .select({ cache: caches })
    .from(gameCaches)
    .innerJoin(caches, eq(gameCaches.cacheId, caches.id))
    .where(eq(gameCaches.gameId, activeGame.id));

  const allCaches = assignedRows.map((r) => r.cache);
  const shuffled = shuffleArray(allCaches);

  await db.insert(teamSequences).values(
    shuffled.map((c, i) => ({
      teamId: team.id,
      cacheId: c.id,
      sequenceOrder: i,
    })),
  );

  return NextResponse.redirect(new URL(`/clue/${team.id}`, request.url), {
    status: 302,
  });
}
