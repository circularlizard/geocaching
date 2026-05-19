import { Given, When, Then } from '@cucumber/cucumber';
import { db } from '@/lib/db';
import {
  caches,
  teams,
  teamSequences,
  progressLogs,
} from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { TestWorld } from '../support/world';
import { getActiveGame } from './common.steps';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function getTeamById(teamId: number) {
  const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
  return team ?? null;
}

async function getCacheTokenForTeamPosition(teamId: number, position: number) {
  const [seq] = await db
    .select()
    .from(teamSequences)
    .where(and(eq(teamSequences.teamId, teamId), eq(teamSequences.sequenceOrder, position)))
    .limit(1);
  if (!seq) return null;

  const [cache] = await db.select().from(caches).where(eq(caches.id, seq.cacheId)).limit(1);
  return cache?.cacheToken ?? null;
}

async function getProgressLogForTeamCache(teamId: number, cacheNum: number) {
  const cacheToken = await getCacheTokenForTeamPosition(teamId, cacheNum - 1);
  if (!cacheToken) return null;
  const [cache] = await db.select().from(caches).where(eq(caches.cacheToken, cacheToken)).limit(1);
  if (!cache) return null;

  const [log] = await db
    .select()
    .from(progressLogs)
    .where(and(eq(progressLogs.teamId, teamId), eq(progressLogs.cacheId, cache.id)))
    .limit(1);
  return log ?? null;
}

// ── Given steps ──────────────────────────────────────────────────────────────

Given(
  'cache {int} in their sequence has cache location token {string}',
  async function (this: TestWorld, cacheNum: number, tokenValue: string) {
    if (!this.teamId) throw new Error('No teamId set');

    const [seq] = await db
      .select()
      .from(teamSequences)
      .where(
        and(
          eq(teamSequences.teamId, this.teamId),
          eq(teamSequences.sequenceOrder, cacheNum - 1),
        ),
      )
      .limit(1);

    if (!seq) throw new Error(`No sequence entry at position ${cacheNum - 1}`);

    await db
      .update(caches)
      .set({ cacheToken: tokenValue })
      .where(eq(caches.id, seq.cacheId));
  },
);

Given(
  'geocache {int} in their sequence has geocache location token {string}',
  async function (this: TestWorld, cacheNum: number, tokenValue: string) {
    // Alias for cache
    if (!this.teamId) throw new Error('No teamId set');

    const [seq] = await db
      .select()
      .from(teamSequences)
      .where(
        and(
          eq(teamSequences.teamId, this.teamId),
          eq(teamSequences.sequenceOrder, cacheNum - 1),
        ),
      )
      .limit(1);

    if (!seq) throw new Error(`No sequence entry at position ${cacheNum - 1}`);

    await db
      .update(caches)
      .set({ cacheToken: tokenValue })
      .where(eq(caches.id, seq.cacheId));
  },
);

Given(
  'team {string} has viewed only Clue 1 for geocache 1',
  async function (this: TestWorld, _teamName: string) {
    // No progress log entry needed — Clue 1 is always shown without a log entry
  },
);

Given(
  'team {string} has viewed only Clue 1 for cache 1',
  async function (this: TestWorld, _teamName: string) {
    // Alias for geocache - same implementation
    // No progress log entry needed — Clue 1 is always shown without a log entry
  },
);

Given(
  'a user is on the confirmation page for cache {int}',
  async function (this: TestWorld, cacheNum: number) {
    // Alias for geocache
    if (!this.teamId) throw new Error('No teamId set');
    const token = await getCacheTokenForTeamPosition(this.teamId, cacheNum - 1);
    if (!token) throw new Error(`No cache token at position ${cacheNum - 1}`);
    this.currentCacheToken = token;
    this.response = await fetch(`${BASE_URL}/found/${token}`, { redirect: 'follow' });
  },
);

Given(
  'a user is on the confirmation page for geocache {int}',
  async function (this: TestWorld, cacheNum: number) {
    if (!this.teamId) throw new Error('No teamId set');
    const token = await getCacheTokenForTeamPosition(this.teamId, cacheNum - 1);
    if (!token) throw new Error(`No cache token at position ${cacheNum - 1}`);
    this.currentCacheToken = token;
    this.response = await fetch(`${BASE_URL}/found/${token}`, { redirect: 'follow' });
  },
);

Given(
  'a user is on the confirmation page for the last cache',
  async function (this: TestWorld) {
    if (!this.teamId) throw new Error('No teamId set');
    const team = await getTeamById(this.teamId);
    if (!team) throw new Error('Team not found');
    const token = await getCacheTokenForTeamPosition(this.teamId, team.currentCacheIndex);
    if (!token) throw new Error('No token for last cache');
    this.currentCacheToken = token;
    this.response = await fetch(`${BASE_URL}/found/${token}`, { redirect: 'follow' });
  },
);

Given(
  'team {string} has requested Clue 2 for cache 1',
  async function (this: TestWorld, teamName: string) {
    // Alias for geocache
    const [team] = await db.select().from(teams).where(eq(teams.displayName, teamName)).limit(1);
    if (!team) throw new Error(`Team "${teamName}" not found`);

    const cacheToken = await getCacheTokenForTeamPosition(team.id, 0);
    if (!cacheToken) throw new Error('No cache at position 0');
    const [cache] = await db.select().from(caches).where(eq(caches.cacheToken, cacheToken)).limit(1);
    if (!cache) throw new Error('Cache not found');

    await db.insert(progressLogs).values({
      teamId: team.id,
      cacheId: cache.id,
      clue2RequestedTimestamp: new Date(),
    });
  },
);

Given(
  'team {string} has requested Clue 2 for geocache 1',
  async function (this: TestWorld, teamName: string) {
    const [team] = await db.select().from(teams).where(eq(teams.displayName, teamName)).limit(1);
    if (!team) throw new Error(`Team "${teamName}" not found`);

    const cacheToken = await getCacheTokenForTeamPosition(team.id, 0);
    if (!cacheToken) throw new Error('No cache at position 0');
    const [cache] = await db.select().from(caches).where(eq(caches.cacheToken, cacheToken)).limit(1);
    if (!cache) throw new Error('Cache not found');

    await db.insert(progressLogs).values({
      teamId: team.id,
      cacheId: cache.id,
      clue2RequestedTimestamp: new Date(),
    });
  },
);

Given(
  'team {string} has requested Clue 3 for cache 1',
  async function (this: TestWorld, teamName: string) {
    // Alias for geocache
    const [team] = await db.select().from(teams).where(eq(teams.displayName, teamName)).limit(1);
    if (!team) throw new Error(`Team "${teamName}" not found`);

    const cacheToken = await getCacheTokenForTeamPosition(team.id, 0);
    if (!cacheToken) throw new Error('No cache at position 0');
    const [cache] = await db.select().from(caches).where(eq(caches.cacheToken, cacheToken)).limit(1);
    if (!cache) throw new Error('Cache not found');

    await db.insert(progressLogs).values({
      teamId: team.id,
      cacheId: cache.id,
      clue2RequestedTimestamp: new Date(Date.now() - 60000),
      clue3RequestedTimestamp: new Date(),
    });
  },
);

Given(
  'team {string} has requested Clue 3 for geocache 1',
  async function (this: TestWorld, teamName: string) {
    const [team] = await db.select().from(teams).where(eq(teams.displayName, teamName)).limit(1);
    if (!team) throw new Error(`Team "${teamName}" not found`);

    const cacheToken = await getCacheTokenForTeamPosition(team.id, 0);
    if (!cacheToken) throw new Error('No cache at position 0');
    const [cache] = await db.select().from(caches).where(eq(caches.cacheToken, cacheToken)).limit(1);
    if (!cache) throw new Error('Cache not found');

    await db.insert(progressLogs).values({
      teamId: team.id,
      cacheId: cache.id,
      clue2RequestedTimestamp: new Date(Date.now() - 60000),
      clue3RequestedTimestamp: new Date(),
    });
  },
);

Given(
  'team {string} has already confirmed cache 1 and advanced to cache {int}',
  async function (this: TestWorld, teamName: string, _nextCacheNum: number) {
    const [team] = await db.select().from(teams).where(eq(teams.displayName, teamName)).limit(1);
    if (!team) throw new Error(`Team "${teamName}" not found`);

    const cacheToken = await getCacheTokenForTeamPosition(team.id, 0);
    if (!cacheToken) throw new Error('No cache at position 0');
    const [cache] = await db.select().from(caches).where(eq(caches.cacheToken, cacheToken)).limit(1);
    if (!cache) throw new Error('Cache not found');

    const [existing] = await db
      .select().from(progressLogs)
      .where(and(eq(progressLogs.teamId, team.id), eq(progressLogs.cacheId, cache.id)))
      .limit(1);

    if (existing) {
      await db.update(progressLogs)
        .set({ foundTimestamp: new Date(), points: 5 })
        .where(eq(progressLogs.id, existing.id));
    } else {
      await db.insert(progressLogs).values({
        teamId: team.id,
        cacheId: cache.id,
        foundTimestamp: new Date(),
        points: 5,
      });
    }

    await db.update(teams).set({ currentCacheIndex: 1 }).where(eq(teams.id, team.id));
    this.teamId = team.id;
  },
);

Given(
  'team {string} is on their last geocache in the sequence',
  async function (this: TestWorld, teamName: string) {
    const [team] = await db.select().from(teams).where(eq(teams.displayName, teamName)).limit(1);
    if (!team) throw new Error(`Team "${teamName}" not found`);

    const allSeqs = await db.select().from(teamSequences).where(eq(teamSequences.teamId, team.id));
    const lastIndex = allSeqs.length - 1;

    for (let i = 0; i < lastIndex; i++) {
      const cacheToken = await getCacheTokenForTeamPosition(team.id, i);
      if (!cacheToken) continue;
      const [cache] = await db.select().from(caches).where(eq(caches.cacheToken, cacheToken)).limit(1);
      if (!cache) continue;
      await db.insert(progressLogs).values({
        teamId: team.id,
        cacheId: cache.id,
        foundTimestamp: new Date(),
        points: 5,
      });
    }

    await db.update(teams).set({ currentCacheIndex: lastIndex }).where(eq(teams.id, team.id));
    this.teamId = team.id;
  },
);

// ── When steps ───────────────────────────────────────────────────────────────

When(
  'a user visits {string} for team {string}',
  async function (this: TestWorld, path: string, _teamName: string) {
    this.currentCacheToken = path.replace('/found/', '');
    this.response = await fetch(`${BASE_URL}${path}`, { redirect: 'follow' });
  },
);

When(
  'a user visits {string} again for team {string}',
  async function (this: TestWorld, path: string, _teamName: string) {
    this.currentCacheToken = path.replace('/found/', '');
    this.response = await fetch(`${BASE_URL}${path}`, { redirect: 'follow' });
  },
);

When(
  'they confirm they have replaced the cache box',
  async function (this: TestWorld) {
    if (!this.teamId) throw new Error('No teamId set');
    if (!this.currentCacheToken) throw new Error('No currentCacheToken set');

    this.response = await fetch(
      `${BASE_URL}/api/cache/${this.currentCacheToken}/confirm`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ teamId: this.teamId }),
        redirect: 'follow',
      },
    );
  },
);

// ── Then steps ───────────────────────────────────────────────────────────────

Then(
  'they see a confirmation page saying the cache has been found',
  async function (this: TestWorld) {
    const body = await this.getBody();
    const lower = body.toLowerCase();
    if (!lower.includes('cache found') && !lower.includes('found the cache') && !lower.includes('replace')) {
      throw new Error(`Expected confirmation page. Got: ${body.substring(0, 400)}`);
    }
  },
);

Then(
  'the found_at timestamp is recorded immediately in the progress log for cache {int}',
  async function (this: TestWorld, _cacheNum: number) {
    // Alias for geocache
    if (!this.teamId) throw new Error('No teamId set');
    const log = await getProgressLogForTeamCache(this.teamId, _cacheNum);
    if (!log?.foundTimestamp) {
      throw new Error(`found_at timestamp not set in progress log for cache ${_cacheNum}`);
    }
  },
);

Then(
  'the found_at timestamp is recorded immediately in the progress log for geocache {int}',
  async function (this: TestWorld, _cacheNum: number) {
    if (!this.teamId) throw new Error('No teamId set');
    const log = await getProgressLogForTeamCache(this.teamId, _cacheNum);
    if (!log?.foundTimestamp) {
      throw new Error(`found_at timestamp not set in progress log for geocache ${_cacheNum}`);
    }
  },
);

Then(
  'they are asked to confirm they have replaced the cache box',
  async function (this: TestWorld) {
    const body = await this.getBody();
    if (!body.toLowerCase().includes('replace')) {
      throw new Error(`Expected "replace" instruction on page. Got: ${body.substring(0, 400)}`);
    }
  },
);

Then(
  '{int} points are recorded for cache {int} in the progress log',
  async function (this: TestWorld, expectedPoints: number, cacheNum: number) {
    // Alias for geocache
    if (!this.teamId) throw new Error('No teamId set');
    const log = await getProgressLogForTeamCache(this.teamId, cacheNum);
    if (!log) throw new Error(`No progress log found for cache ${cacheNum}`);
    if (log.points !== expectedPoints) {
      throw new Error(`Expected ${expectedPoints} points but found ${log.points}`);
    }
  },
);

Then(
  '{int} points are recorded for geocache {int} in the progress log',
  async function (this: TestWorld, expectedPoints: number, cacheNum: number) {
    if (!this.teamId) throw new Error('No teamId set');
    const log = await getProgressLogForTeamCache(this.teamId, cacheNum);
    if (!log) throw new Error(`No progress log found for geocache ${cacheNum}`);
    if (log.points !== expectedPoints) {
      throw new Error(`Expected ${expectedPoints} points but found ${log.points}`);
    }
  },
);

Then(
  '{int} point is recorded for cache {int} in the progress log',
  async function (this: TestWorld, expectedPoints: number, cacheNum: number) {
    // Alias for geocache
    if (!this.teamId) throw new Error('No teamId set');
    const log = await getProgressLogForTeamCache(this.teamId, cacheNum);
    if (!log) throw new Error(`No progress log found for cache ${cacheNum}`);
    if (log.points !== expectedPoints) {
      throw new Error(`Expected ${expectedPoints} points but found ${log.points}`);
    }
  },
);

Then(
  '{int} point is recorded for geocache {int} in the progress log',
  async function (this: TestWorld, expectedPoints: number, cacheNum: number) {
    if (!this.teamId) throw new Error('No teamId set');
    const log = await getProgressLogForTeamCache(this.teamId, cacheNum);
    if (!log) throw new Error(`No progress log found for geocache ${cacheNum}`);
    if (log.points !== expectedPoints) {
      throw new Error(`Expected ${expectedPoints} points but found ${log.points}`);
    }
  },
);

Then(
  'the team\'s current cache index advances to cache {int}',
  async function (this: TestWorld, expectedCacheNum: number) {
    // Alias for geocache
    if (!this.teamId) throw new Error('No teamId set');
    const team = await getTeamById(this.teamId);
    if (!team) throw new Error('Team not found');
    const expectedIndex = expectedCacheNum - 1;
    if (team.currentCacheIndex !== expectedIndex) {
      throw new Error(
        `Expected currentCacheIndex ${expectedIndex} but got ${team.currentCacheIndex}`,
      );
    }
  },
);

Then(
  'the team\'s current geocache index advances to geocache {int}',
  async function (this: TestWorld, expectedCacheNum: number) {
    if (!this.teamId) throw new Error('No teamId set');
    const team = await getTeamById(this.teamId);
    if (!team) throw new Error('Team not found');
    const expectedIndex = expectedCacheNum - 1;
    if (team.currentCacheIndex !== expectedIndex) {
      throw new Error(
        `Expected currentCacheIndex ${expectedIndex} but got ${team.currentCacheIndex}`,
      );
    }
  },
);

Then(
  'they are redirected to the clue page showing Clue 1 for cache {int}',
  async function (this: TestWorld, _cacheNum: number) {
    // Alias for geocache
    if (!this.teamId) throw new Error('No teamId set');
    const body = await this.getBody();
    if (!body.toLowerCase().includes('clue 1')) {
      throw new Error(`Expected Clue 1 on clue page. Got: ${body.substring(0, 400)}`);
    }
  },
);

Then(
  'they are redirected to the clue page showing Clue 1 for geocache {int}',
  async function (this: TestWorld, _cacheNum: number) {
    if (!this.teamId) throw new Error('No teamId set');
    const body = await this.getBody();
    if (!body.toLowerCase().includes('clue 1')) {
      throw new Error(`Expected Clue 1 on clue page. Got: ${body.substring(0, 400)}`);
    }
  },
);

Then(
  '{int} points are recorded for the last geocache',
  async function (this: TestWorld, expectedPoints: number) {
    if (!this.teamId) throw new Error('No teamId set');
    const team = await getTeamById(this.teamId);
    if (!team) throw new Error('Team not found');
    // team.currentCacheIndex is already the 0-based position of the last completed geocache
    const log = await getProgressLogForTeamCache(this.teamId, team.currentCacheIndex);
    if (!log) throw new Error('No progress log found for last geocache');
    if (log.points !== expectedPoints) {
      throw new Error(`Expected ${expectedPoints} points but found ${log.points}`);
    }
  },
);

Then(
  'they see an error message indicating this is not their next cache',
  async function (this: TestWorld) {
    const body = await this.getBody();
    const lower = body.toLowerCase();
    if (!lower.includes('not your next') && !lower.includes('next cache')) {
      throw new Error(`Expected "not your next cache" message. Got: ${body.substring(0, 400)}`);
    }
  },
);

Then(
  'the found_at timestamp is written to the progress log before the confirmation page is submitted',
  async function (this: TestWorld) {
    if (!this.teamId) throw new Error('No teamId set');
    const log = await getProgressLogForTeamCache(this.teamId, 1);
    if (!log?.foundTimestamp) {
      throw new Error('found_at not recorded at scan time');
    }
  },
);

Then(
  'they see an error message indicating this cache has already been found',
  async function (this: TestWorld) {
    const body = await this.getBody();
    const lower = body.toLowerCase();
    if (!lower.includes('already been found') && !lower.includes('already found')) {
      throw new Error(`Expected "already found" message. Got: ${body.substring(0, 400)}`);
    }
  },
);

Given(
  'team {string} has a team session cookie set',
  async function (this: TestWorld, teamName: string) {
    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.displayName, teamName))
      .limit(1);
    if (!team) throw new Error(`Team "${teamName}" not found`);
    this.teamId = team.id;
    this.gameCookieHeader = `geocache_team=${team.id}`;
  },
);

When(
  'they scan cache token {string} which is not their current cache',
  async function (this: TestWorld, cacheToken: string) {
    const headers: Record<string, string> = {};
    if (this.gameCookieHeader) headers['Cookie'] = this.gameCookieHeader;
    this.response = await fetch(`${BASE_URL}/found/${cacheToken}`, {
      headers,
      redirect: 'manual',
    });
  },
);

Then(
  'they see a link to return to their clue page',
  async function (this: TestWorld) {
    if (!this.teamId) throw new Error('No teamId set');
    const body = await this.getBody();
    const expectedHref = `/clue/${this.teamId}`;
    if (!body.includes(expectedHref)) {
      throw new Error(
        `Expected a link to "${expectedHref}" on the wrong-cache page. Got: ${body.substring(0, 500)}`,
      );
    }
  },
);

Then(
  'they are redirected to the completion page for team {string}',
  async function (this: TestWorld, teamName: string) {
    const body = await this.getBody();
    const lower = body.toLowerCase();
    if (!lower.includes('congratulations') && !lower.includes('completed') && !lower.includes('completion')) {
      throw new Error(`Expected completion page. Got: ${body.substring(0, 400)}`);
    }
  },
);
