import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '@/lib/db';
import {
  games,
  teams,
  caches,
  teamSequences,
  progressLogs,
  registrationTokens,
} from '@/lib/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { TestWorld } from '../support/world';
import { getActiveGame, FIXTURE_CACHE_TOKENS, FIXTURE_REG_TOKENS } from './common.steps';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'test-admin-password';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function loginAsAdmin(world: TestWorld): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ password: ADMIN_PASSWORD }),
    redirect: 'manual',
  });
  const setCookie = res.headers.get('set-cookie') ?? '';
  const match = setCookie.match(/admin_auth=[^;]+/);
  if (match) world.adminCookieHeader = match[0];
}

function adminHeaders(world: TestWorld): Record<string, string> {
  const headers: Record<string, string> = {};
  if (world.adminCookieHeader) headers['Cookie'] = world.adminCookieHeader;
  return headers;
}

async function findOrCreateTeam(
  teamName: string,
  membersArr: string[],
  tokenIndex = 0,
): Promise<{ team: typeof teams.$inferSelect; allCaches: (typeof caches.$inferSelect)[] }> {
  const game = await getActiveGame();

  const [existing] = await db
    .select()
    .from(teams)
    .where(and(eq(teams.displayName, teamName), eq(teams.gameId, game.id)))
    .limit(1);

  const allCaches = await db.select().from(caches).orderBy(asc(caches.id));

  if (existing) {
    if (membersArr.length > 0) {
      await db
        .update(teams)
        .set({ members: JSON.stringify(membersArr) })
        .where(eq(teams.id, existing.id));
    }
    return { team: existing, allCaches };
  }

  const tokenValue = FIXTURE_REG_TOKENS[tokenIndex] ?? `DASH-TOKEN-${tokenIndex}`;
  let [regToken] = await db
    .select()
    .from(registrationTokens)
    .where(eq(registrationTokens.token, tokenValue))
    .limit(1);
  if (!regToken) {
    [regToken] = await db.insert(registrationTokens).values({ token: tokenValue }).returning();
  }

  const [team] = await db
    .insert(teams)
    .values({
      gameId: game.id,
      registrationTokenId: regToken.id,
      displayName: teamName,
      members: JSON.stringify(membersArr.length > 0 ? membersArr : ['Member 1', 'Member 2', 'Member 3', 'Member 4']),
      currentCacheIndex: 0,
    })
    .returning();

  await db.insert(teamSequences).values(
    allCaches.map((c, i) => ({ teamId: team.id, cacheId: c.id, sequenceOrder: i })),
  );

  return { team, allCaches };
}

async function getTeamForDashboard(teamName: string) {
  const game = await getActiveGame();
  const [team] = await db
    .select()
    .from(teams)
    .where(and(eq(teams.displayName, teamName), eq(teams.gameId, game.id)))
    .limit(1);
  return team ?? null;
}

// ── Given steps ───────────────────────────────────────────────────────────────

Given(
  'the following teams are registered in the active game:',
  async function (this: TestWorld, dataTable: DataTable) {
    const rows = dataTable.hashes() as { 'team name': string; members: string }[];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const membersArr = row.members.split(',').map((m) => m.trim());
      await findOrCreateTeam(row['team name'], membersArr, i);
    }
  },
);

Given(
  'team {string} is registered with members {string}',
  async function (this: TestWorld, teamName: string, membersStr: string) {
    const membersArr = membersStr.split(',').map((m) => m.trim());
    const { team } = await findOrCreateTeam(teamName, membersArr, 0);
    this.teamId = team.id;
  },
);

Given(
  'team {string} has completed {int} caches and is currently on cache {int}',
  async function (this: TestWorld, teamName: string, _completed: number, currentCache: number) {
    const { team } = await findOrCreateTeam(teamName, [], 0);
    const newIndex = currentCache - 1;
    await db.update(teams).set({ currentCacheIndex: newIndex }).where(eq(teams.id, team.id));
    this.teamId = team.id;
  },
);

Given(
  'team {string} has a current score of {int}',
  async function (this: TestWorld, teamName: string, score: number) {
    const { team, allCaches } = await findOrCreateTeam(teamName, [], 0);
    await db.insert(progressLogs).values({
      teamId: team.id,
      cacheId: allCaches[0].id,
      foundTimestamp: new Date(),
      points: score,
    });
    this.teamId = team.id;
  },
);

Given(
  'team {string} found cache {int} at {string}',
  async function (this: TestWorld, teamName: string, cacheNumber: number, timestampStr: string) {
    const { team, allCaches } = await findOrCreateTeam(teamName, [], 0);

    const sequence = await db
      .select()
      .from(teamSequences)
      .where(eq(teamSequences.teamId, team.id))
      .orderBy(asc(teamSequences.sequenceOrder));

    const seqEntry = sequence[cacheNumber - 1];
    if (!seqEntry) throw new Error(`No sequence entry for cache ${cacheNumber}`);

    const [existing] = await db
      .select()
      .from(progressLogs)
      .where(and(eq(progressLogs.teamId, team.id), eq(progressLogs.cacheId, seqEntry.cacheId)))
      .limit(1);

    if (existing) {
      await db
        .update(progressLogs)
        .set({ foundTimestamp: new Date(timestampStr), points: 5 })
        .where(eq(progressLogs.id, existing.id));
    } else {
      await db.insert(progressLogs).values({
        teamId: team.id,
        cacheId: seqEntry.cacheId,
        foundTimestamp: new Date(timestampStr),
        points: 5,
      });
    }

    await db
      .update(teams)
      .set({ currentCacheIndex: cacheNumber })
      .where(eq(teams.id, team.id));

    this.teamId = team.id;
  },
);

Given(
  'team {string} skipped cache {int}',
  async function (this: TestWorld, teamName: string, cacheNumber: number) {
    const { team } = await findOrCreateTeam(teamName, [], 0);

    const sequence = await db
      .select()
      .from(teamSequences)
      .where(eq(teamSequences.teamId, team.id))
      .orderBy(asc(teamSequences.sequenceOrder));

    const seqEntry = sequence[cacheNumber - 1];
    if (!seqEntry) throw new Error(`No sequence entry for cache ${cacheNumber}`);

    const [existing] = await db
      .select()
      .from(progressLogs)
      .where(and(eq(progressLogs.teamId, team.id), eq(progressLogs.cacheId, seqEntry.cacheId)))
      .limit(1);

    if (existing) {
      await db
        .update(progressLogs)
        .set({ skipped: true, points: 0 })
        .where(eq(progressLogs.id, existing.id));
    } else {
      await db.insert(progressLogs).values({
        teamId: team.id,
        cacheId: seqEntry.cacheId,
        skipped: true,
        points: 0,
      });
    }

    await db
      .update(teams)
      .set({ currentCacheIndex: cacheNumber })
      .where(eq(teams.id, team.id));

    this.teamId = team.id;
  },
);

Given('the admin is on the dashboard', async function (this: TestWorld) {
  await loginAsAdmin(this);
  this.response = await fetch(`${BASE_URL}/admin/dashboard`, {
    headers: adminHeaders(this),
    redirect: 'follow',
  });
});

Given(
  'the admin has clicked "Recall All Teams" and the confirmation prompt is showing',
  async function (this: TestWorld) {
    await loginAsAdmin(this);
    this.response = await fetch(`${BASE_URL}/admin/recall-confirm`, {
      headers: adminHeaders(this),
      redirect: 'follow',
    });
  },
);

Given(
  'the active game has {int} registration tokens and only {int} have been used to register teams',
  async function (this: TestWorld, totalTokens: number, usedTokens: number) {
    await db.delete(progressLogs);
    await db.delete(teamSequences);
    await db.delete(teams);
    await db.delete(registrationTokens);

    const allCaches = await db.select().from(caches).orderBy(asc(caches.id));

    const tokenRows: (typeof registrationTokens.$inferSelect)[] = [];
    for (let i = 0; i < totalTokens; i++) {
      const tokenValue = `SLOT-TOKEN-${i + 1}`;
      const [tok] = await db.insert(registrationTokens).values({ token: tokenValue }).returning();
      tokenRows.push(tok);
    }

    const game = await getActiveGame();
    for (let i = 0; i < usedTokens; i++) {
      const [team] = await db
        .insert(teams)
        .values({
          gameId: game.id,
          registrationTokenId: tokenRows[i].id,
          displayName: `Slot Team ${i + 1}`,
          members: JSON.stringify(['A', 'B', 'C', 'D']),
          currentCacheIndex: 0,
        })
        .returning();

      if (allCaches.length > 0) {
        await db.insert(teamSequences).values(
          allCaches.map((c, j) => ({ teamId: team.id, cacheId: c.id, sequenceOrder: j })),
        );
      }
    }
  },
);

// ── When steps ────────────────────────────────────────────────────────────────

When(
  'the admin visits {string}',
  async function (this: TestWorld, path: string) {
    this.response = await fetch(`${BASE_URL}${path}`, {
      headers: adminHeaders(this),
      redirect: 'follow',
    });
  },
);

When('the admin is on the dashboard page', async function (this: TestWorld) {
  await loginAsAdmin(this);
  this.response = await fetch(`${BASE_URL}/admin/dashboard`, {
    headers: adminHeaders(this),
    redirect: 'follow',
  });
});


When('they confirm the recall', async function (this: TestWorld) {
  this.response = await fetch(`${BASE_URL}/api/admin/recall`, {
    method: 'POST',
    headers: adminHeaders(this),
    redirect: 'follow',
  });
});


When('the admin dashboard is viewed', async function (this: TestWorld) {
  await loginAsAdmin(this);
  this.response = await fetch(`${BASE_URL}/admin/dashboard`, {
    headers: adminHeaders(this),
    redirect: 'follow',
  });
});

// ── Then steps ────────────────────────────────────────────────────────────────

Then(
  'they see the admin navigation bar with links to all sections',
  async function (this: TestWorld) {
    const body = await this.getBody();
    if (!body.includes('aria-label="Admin navigation"')) {
      throw new Error('Admin navigation bar not found in page HTML');
    }
    const sections = ['Dashboard', 'Game Setup', 'Caches', 'Team QRs'];
    for (const section of sections) {
      if (!body.includes(section)) {
        throw new Error(`Navigation link "${section}" not found in admin nav`);
      }
    }
  },
);

Then(
  'they see {string} listed on the dashboard',
  async function (this: TestWorld, teamName: string) {
    const body = await this.getBody();
    if (!body.includes(teamName)) {
      throw new Error(`Expected "${teamName}" on dashboard. Got: ${body.substring(0, 500)}`);
    }
  },
);

Then(
  'the entry for {string} shows members {string}',
  async function (this: TestWorld, _teamName: string, membersStr: string) {
    const body = await this.getBody();
    const members = membersStr.split(',').map((m) => m.trim());
    for (const member of members) {
      if (!body.includes(member)) {
        throw new Error(`Expected member "${member}" in dashboard. Got: ${body.substring(0, 500)}`);
      }
    }
  },
);

Then(
  'the entry for {string} shows they are on cache {int} of {int}',
  async function (this: TestWorld, _teamName: string, currentCache: number, totalCaches: number) {
    const body = await this.getBody();
    const expected = `Cache ${currentCache} of ${totalCaches}`;
    if (!body.includes(expected)) {
      throw new Error(`Expected "${expected}" on dashboard. Got: ${body.substring(0, 500)}`);
    }
  },
);

Then(
  'the entry for {string} shows a score of {int}',
  async function (this: TestWorld, _teamName: string, score: number) {
    const body = await this.getBody();
    if (!body.includes(String(score))) {
      throw new Error(`Expected score ${score} on dashboard. Got: ${body.substring(0, 500)}`);
    }
  },
);

Then(
  'the entry for {string} shows found timestamp {string} for cache {int}',
  async function (this: TestWorld, _teamName: string, timestamp: string, _cacheNumber: number) {
    const body = await this.getBody();
    if (!body.includes(timestamp)) {
      throw new Error(
        `Expected timestamp "${timestamp}" on dashboard. Got: ${body.substring(0, 500)}`,
      );
    }
  },
);

Then(
  'the entry for {string} shows cache {int} as skipped',
  async function (this: TestWorld, _teamName: string, _cacheNumber: number) {
    const body = await this.getBody();
    if (!body.toLowerCase().includes('skipped')) {
      throw new Error(`Expected "Skipped" on dashboard. Got: ${body.substring(0, 500)}`);
    }
  },
);

Then(
  'the page refreshes its data automatically at regular intervals without a full page reload',
  async function (this: TestWorld) {
    const body = await this.getBody();
    if (!body.includes('data-auto-refresh')) {
      throw new Error(
        `Expected auto-refresh indicator on dashboard. Got: ${body.substring(0, 500)}`,
      );
    }
  },
);

Then(
  'the admin_recall_triggered flag is set to true on the active game',
  async function (this: TestWorld) {
    const game = await getActiveGame();
    if (!game) throw new Error('No active game found');
    if (!game.adminRecallTriggered) {
      throw new Error('Expected adminRecallTriggered to be true, but it is false');
    }
  },
);

Then(
  'any subsequent QR scan by any team results in a game-over page',
  async function (this: TestWorld) {
    const cacheToken = FIXTURE_CACHE_TOKENS[0];
    const res = await fetch(`${BASE_URL}/scan?id=${cacheToken}`, { redirect: 'follow' });
    const body = await res.text();
    const lower = body.toLowerCase();
    if (!lower.includes('game over') && !lower.includes('game has ended') && !lower.includes('recall')) {
      throw new Error(`Expected game-over page after recall. Got: ${body.substring(0, 500)}`);
    }
  },
);

Then(
  'the admin_recall_triggered flag remains false',
  async function (this: TestWorld) {
    const game = await getActiveGame();
    if (!game) throw new Error('No active game found');
    if (game.adminRecallTriggered) {
      throw new Error('Expected adminRecallTriggered to remain false, but it is true');
    }
  },
);

Then('the game continues normally', async function (this: TestWorld) {
  const game = await getActiveGame();
  if (!game) throw new Error('No active game found');
  if (game.adminRecallTriggered) {
    throw new Error('Expected game to continue normally but adminRecallTriggered is true');
  }
});

Then(
  'they see {int} registered teams',
  async function (this: TestWorld, count: number) {
    const body = await this.getBody();
    const expected = `${count} registered team`;
    if (!body.includes(expected)) {
      throw new Error(`Expected "${expected}" on dashboard. Got: ${body.substring(0, 500)}`);
    }
  },
);

Then(
  'they see {int} unregistered token slot',
  async function (this: TestWorld, count: number) {
    const body = await this.getBody();
    const expected = `${count} unregistered token slot`;
    if (!body.includes(expected)) {
      throw new Error(`Expected "${expected}" on dashboard. Got: ${body.substring(0, 500)}`);
    }
  },
);

Then(
  'both {string} and {string} are shown as joint winners with {int} points',
  async function (this: TestWorld, team1: string, team2: string, points: number) {
    const body = await this.getBody();
    if (!body.includes(team1)) {
      throw new Error(`Expected "${team1}" in joint winners. Got: ${body.substring(0, 500)}`);
    }
    if (!body.includes(team2)) {
      throw new Error(`Expected "${team2}" in joint winners. Got: ${body.substring(0, 500)}`);
    }
    if (!body.includes(String(points))) {
      throw new Error(`Expected ${points} points in joint winners. Got: ${body.substring(0, 500)}`);
    }
    if (!body.toLowerCase().includes('joint') && !body.toLowerCase().includes('winner')) {
      throw new Error(`Expected joint winners banner. Got: ${body.substring(0, 500)}`);
    }
  },
);
