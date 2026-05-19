import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { games, registrationTokens, teams, caches, teamSequences, gameCaches } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formErrorHtml(token: string, error: string, teamName = '', members = '') {
  const memberList = members.split(',').map(m => m.trim()).filter(Boolean);
  const memberRows = memberList.length > 0
    ? memberList.map(m => `<div class="member-row"><input type="text" name="member[]" required placeholder="Member name" value="${escapeHtml(m)}"/><button type="button" class="remove-btn" onclick="removeMember(this)" title="Remove">−</button></div>`).join('')
    : '<div class="member-row"><input type="text" name="member[]" required placeholder="Member name"/><button type="button" class="remove-btn" onclick="removeMember(this)" title="Remove">−</button></div>';

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
    input{width:100%;border:1.5px solid #d1d5db;border-radius:.5rem;padding:.75rem 1rem;font-size:1.0625rem;font-family:inherit;outline:none;transition:border-color .15s}
    input:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.15)}
    .field{margin-bottom:1.25rem}
    .req{color:#ef4444}
    .member-row{display:flex;gap:.5rem;align-items:center;margin-bottom:.5rem}
    .member-row input{flex:1}
    .member-row button{width:36px;height:36px;padding:0;font-size:1.25rem;background:#f3f4f6;border:1.5px solid #d1d5db;border-radius:.5rem;color:#374151;display:flex;align-items:center;justify-content:center;transition:all .15s;margin-top:0}
    .member-row button:hover{background:#e5e7eb;border-color:#9ca3af}
    .add-btn{width:auto;padding:.625rem 1rem;font-size:.875rem;font-weight:600;background:#fff;border:1.5px solid #d1d5db;border-radius:.5rem;color:#374151;margin-top:0;display:inline-flex;align-items:center;gap:.375rem;transition:all .15s}
    .add-btn:hover{background:#f9fafb;border-color:#9ca3af}
    .submit-btn{width:100%;background:#2563eb;color:#fff;font-weight:700;font-size:1.125rem;padding:1rem;border:none;border-radius:.5rem;cursor:pointer;margin-top:.5rem;transition:background .15s}
    .submit-btn:hover{background:#1d4ed8}
    .submit-btn:active{background:#1e40af}
    .member-label{display:flex;justify-content:space-between;align-items:center}
    .member-count{font-size:.75rem;color:#6b7280;font-weight:400}
  </style>
</head>
<body>
  <div class="card">
    <h1>Register Your Team</h1>
    <p class="subtitle">Enter your team details to begin the hunt.</p>
    <div class="error-banner">⚠️ ${escapeHtml(error)}</div>
    <form action="/api/register" method="POST" id="regForm">
      <input type="hidden" name="token" value="${escapeHtml(token)}"/>
      <div class="field">
        <label for="teamName">Team Name <span class="req">*</span></label>
        <input id="teamName" name="teamName" type="text" required placeholder="e.g. The Explorers" value="${escapeHtml(teamName)}"/>
      </div>
      <div class="field">
        <div class="member-label">
          <label>Team Members <span class="req">*</span> <span class="hint">(3–8)</span></label>
          <span class="member-count" id="memberCount">${memberList.length || 1} member${(memberList.length || 1) !== 1 ? 's' : ''}</span>
        </div>
        <div id="memberList">
          ${memberRows}
        </div>
        <button type="button" class="add-btn" onclick="addMember()">+ Add Member</button>
      </div>
      <button type="submit" class="submit-btn">Start the Hunt →</button>
    </form>
  </div>
  <script>
    function addMember() {
      const list = document.getElementById('memberList');
      const row = document.createElement('div');
      row.className = 'member-row';
      row.innerHTML = '<input type="text" name="member[]" required placeholder="Member name"/><button type="button" class="remove-btn" onclick="removeMember(this)" title="Remove">−</button>';
      list.appendChild(row);
      updateCount();
      row.querySelector('input').focus();
    }
    function removeMember(btn) {
      const rows = document.querySelectorAll('.member-row');
      if (rows.length > 1) {
        btn.parentElement.remove();
        updateCount();
      }
    }
    function updateCount() {
      const count = document.querySelectorAll('.member-row').length;
      document.getElementById('memberCount').textContent = count + ' member' + (count !== 1 ? 's' : '');
    }
    document.getElementById('regForm').addEventListener('submit', function(e) {
      const count = document.querySelectorAll('.member-row').length;
      if (count < 3) {
        e.preventDefault();
        alert('Please add at least 3 team members.');
        return false;
      }
      if (count > 8) {
        e.preventDefault();
        alert('Maximum 8 team members allowed.');
        return false;
      }
    });
    updateCount();
  </script>
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
  let memberList: string[] = [];

  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const body = await request.json();
    token = body.token;
    teamName = body.teamName;
    // Support both array and comma-separated string for JSON API
    if (Array.isArray(body.members)) {
      memberList = body.members.filter((m: string) => typeof m === 'string' && m.trim());
    } else if (typeof body.members === 'string') {
      memberList = body.members.split(',').map((m: string) => m.trim()).filter(Boolean);
    }
  } else {
    const form = await request.formData();
    token = form.get('token') as string | undefined;
    teamName = form.get('teamName') as string | undefined;
    // Get all member[] values from form
    const memberEntries = form.getAll('member[]');
    memberList = memberEntries.map((m) => String(m).trim()).filter(Boolean);
  }

  const isFormPost = !contentType.includes('application/json');
  const safeToken = token ?? '';
  const safeTeamName = teamName ?? '';
  const safeMembers = memberList.join(', ');

  if (!teamName?.trim()) {
    if (isFormPost) return htmlError(safeToken, safeTeamName, safeMembers, 'Team name is required.');
    return NextResponse.json({ error: 'Team name is required' }, { status: 422 });
  }

  if (memberList.length < 3) {
    if (isFormPost) return htmlError(safeToken, safeTeamName, safeMembers, `Please enter at least 3 team members — you entered ${memberList.length}.`);
    return NextResponse.json({ error: 'A minimum of 3 team members is required' }, { status: 422 });
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
