import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { registrationTokens, teams, games } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formHtml(token: string, errorMessage = '') {
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
    .add-btn:disabled{opacity:.5;cursor:not-allowed}
    .submit-btn{width:100%;background:#2563eb;color:#fff;font-weight:700;font-size:1.125rem;padding:1rem;border:none;border-radius:.5rem;cursor:pointer;margin-top:.5rem;transition:background .15s}
    .submit-btn:hover{background:#1d4ed8}
    .submit-btn:active{background:#1e40af}
    .error-banner{background:#fef2f2;border:1.5px solid #fca5a5;border-radius:.5rem;padding:.875rem 1rem;margin-bottom:1.25rem;color:#dc2626;font-size:.9375rem;font-weight:500}
    .member-label{display:flex;justify-content:space-between;align-items:center}
    .member-count{font-size:.75rem;color:#6b7280;font-weight:400}
  </style>
</head>
<body>
  <div class="card">
    <h1>Register Your Team</h1>
    <p class="subtitle">Enter your team details to begin the hunt.</p>
    ${errorMessage ? `<div class="error-banner">⚠️ ${escapeHtml(errorMessage)}</div>` : ''}
    <form action="/api/register" method="POST" id="regForm">
      <input type="hidden" name="token" value="${token}"/>
      <div class="field">
        <label for="teamName">Team Name <span class="req">*</span></label>
        <input id="teamName" name="teamName" type="text" required placeholder="e.g. The Explorers"/>
      </div>
      <div class="field">
        <div class="member-label">
          <label>Team Members <span class="req">*</span> <span class="hint">(3–8)</span></label>
          <span class="member-count" id="memberCount">1 member</span>
        </div>
        <div id="memberList">
          <div class="member-row">
            <input type="text" name="member[]" required placeholder="Member name"/>
          </div>
        </div>
        <button type="button" class="add-btn" id="addBtn" onclick="addMember()">+ Add Member</button>
      </div>
      <button type="submit" class="submit-btn">Start the Hunt →</button>
    </form>
  </div>
  <script>
    const MAX_MEMBERS = 8;
    const MIN_MEMBERS = 3;

    function addMember() {
      const list = document.getElementById('memberList');
      const currentCount = list.querySelectorAll('.member-row').length;
      if (currentCount >= MAX_MEMBERS) {
        alert('Maximum ' + MAX_MEMBERS + ' team members allowed.');
        return;
      }
      const row = document.createElement('div');
      row.className = 'member-row';
      row.innerHTML = '<input type="text" name="member[]" required placeholder="Member name"/><button type="button" class="remove-btn" onclick="removeMember(this)" title="Remove">−</button>';
      list.appendChild(row);
      updateUI();
      row.querySelector('input').focus();
    }
    function removeMember(btn) {
      const rows = document.querySelectorAll('.member-row');
      if (rows.length > 1) {
        btn.parentElement.remove();
        updateUI();
      }
    }
    function updateUI() {
      const rows = document.querySelectorAll('.member-row');
      const count = rows.length;
      const addBtn = document.getElementById('addBtn');

      document.getElementById('memberCount').textContent = count + ' member' + (count !== 1 ? 's' : '');

      addBtn.disabled = count >= MAX_MEMBERS;

      rows.forEach((row, index) => {
        let removeBtn = row.querySelector('.remove-btn');
        if (count === 1) {
          if (removeBtn) removeBtn.remove();
        } else {
          if (!removeBtn) {
            removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'remove-btn';
            removeBtn.title = 'Remove';
            removeBtn.innerHTML = '−';
            removeBtn.onclick = function() { removeMember(this); };
            row.appendChild(removeBtn);
          }
        }
      });
    }
    document.getElementById('regForm').addEventListener('submit', function(e) {
      const count = document.querySelectorAll('.member-row').length;
      if (count < MIN_MEMBERS) {
        e.preventDefault();
        alert('Please add at least ' + MIN_MEMBERS + ' team members.');
        return false;
      }
      if (count > MAX_MEMBERS) {
        e.preventDefault();
        alert('Maximum ' + MAX_MEMBERS + ' team members allowed.');
        return false;
      }
    });
    updateUI();
  </script>
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

  return new NextResponse(formHtml(tokenValue, ''), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
