import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { games, registrationTokens, teams, caches, teamSequences } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

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

  if (!teamName?.trim()) {
    return NextResponse.json(
      { error: 'Team name is required' },
      { status: 422 },
    );
  }

  const memberList = (membersRaw ?? '')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);

  if (memberList.length < 4) {
    return NextResponse.json(
      { error: 'A minimum of 4 team members is required' },
      { status: 422 },
    );
  }

  if (memberList.length > 8) {
    return NextResponse.json(
      { error: 'A maximum of 8 team members is allowed' },
      { status: 422 },
    );
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

  const allCaches = await db.select().from(caches);
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
