import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import { db } from '@/lib/db';
import {
  teams,
  caches,
  teamSequences,
  progressLogs,
  registrationTokens,
} from '@/lib/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { TestWorld } from '../support/world';
import { getActiveGame, FIXTURE_CACHE_TOKENS } from './common.steps';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function getTeamByName(name: string) {
  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.displayName, name))
    .limit(1);
  return team ?? null;
}

async function createTeamWithSequence(
  teamName: string,
  tokenValue: string,
  cacheIndex = 0,
) {
  let [regToken] = await db
    .select()
    .from(registrationTokens)
    .where(eq(registrationTokens.token, tokenValue))
    .limit(1);

  if (!regToken) {
    [regToken] = await db
      .insert(registrationTokens)
      .values({ token: tokenValue })
      .returning();
  }

  const game = await getActiveGame();

  const [team] = await db
    .insert(teams)
    .values({
      gameId: game.id,
      registrationTokenId: regToken.id,
      displayName: teamName,
      members: JSON.stringify(['Alice', 'Bob', 'Carol', 'Dave']),
      currentCacheIndex: cacheIndex,
    })
    .returning();

  const allCaches = await db
    .select()
    .from(caches)
    .orderBy(asc(caches.id));

  await db.insert(teamSequences).values(
    allCaches.map((c, i) => ({
      teamId: team.id,
      cacheId: c.id,
      sequenceOrder: i,
    })),
  );

  return team;
}

async function getProgressLog(teamId: number, cacheId: number) {
  const [log] = await db
    .select()
    .from(progressLogs)
    .where(
      and(
        eq(progressLogs.teamId, teamId),
        eq(progressLogs.cacheId, cacheId),
      ),
    )
    .limit(1);
  return log ?? null;
}

async function getCurrentCacheForTeam(teamId: number, cacheIndex: number) {
  const [seq] = await db
    .select()
    .from(teamSequences)
    .where(
      and(
        eq(teamSequences.teamId, teamId),
        eq(teamSequences.sequenceOrder, cacheIndex),
      ),
    )
    .limit(1);

  if (!seq) return null;

  const [cache] = await db
    .select()
    .from(caches)
    .where(eq(caches.id, seq.cacheId))
    .limit(1);

  return cache ?? null;
}

// ── Given steps ──────────────────────────────────────────────────────────────

Given(
  'team {string} is registered and on cache {int} of their sequence',
  async function (this: TestWorld, teamName: string, cacheNum: number) {
    const token = `TOKEN-${teamName.replace(/\s+/g, '-').toUpperCase()}`;
    const team = await createTeamWithSequence(teamName, token, cacheNum - 1);
    this.teamId = team.id;
  },
);

Given(
  'cache {int} in their sequence has:',
  async function (this: TestWorld, cacheNum: number, dataTable: DataTable) {
    if (!this.teamId) throw new Error('No teamId set — register team first');

    const data = dataTable.rowsHash() as {
      clue1?: string;
      clue2?: string;
      clue3?: string;
      clue3_image?: string;
    };

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
      .set({
        ...(data.clue1 ? { clue1Text: data.clue1 } : {}),
        ...(data.clue2 ? { clue2Text: data.clue2 } : {}),
        ...(data.clue3 ? { clue3Text: data.clue3 } : {}),
        ...(data.clue3_image ? { clue3ImageUrl: data.clue3_image } : {}),
      })
      .where(eq(caches.id, seq.cacheId));
  },
);

Given(
  'a user is on the clue page for team {string}',
  async function (this: TestWorld, teamName: string) {
    if (!this.teamId) {
      const team = await getTeamByName(teamName);
      this.teamId = team?.id ?? null;
    }
    this.response = await fetch(`${BASE_URL}/clue/${this.teamId}`, {
      redirect: 'follow',
    });
  },
);

Given(
  'team {string} has already requested Clue 2 for their current cache',
  async function (this: TestWorld, teamName: string) {
    const team = await getTeamByName(teamName);
    if (!team) throw new Error(`Team "${teamName}" not found`);

    const currentCache = await getCurrentCacheForTeam(team.id, team.currentCacheIndex);
    if (!currentCache) throw new Error('No current cache found');

    await db.insert(progressLogs).values({
      teamId: team.id,
      cacheId: currentCache.id,
      clue2RequestedTimestamp: new Date(),
    });
  },
);

Given(
  'team {string} has already requested Clue 2 but not Clue 3',
  async function (this: TestWorld, teamName: string) {
    const team = await getTeamByName(teamName);
    if (!team) throw new Error(`Team "${teamName}" not found`);

    const currentCache = await getCurrentCacheForTeam(team.id, team.currentCacheIndex);
    if (!currentCache) throw new Error('No current cache found');

    await db.insert(progressLogs).values({
      teamId: team.id,
      cacheId: currentCache.id,
      clue2RequestedTimestamp: new Date(),
    });
  },
);

Given(
  'team {string} has already requested Clue 3 for their current cache',
  async function (this: TestWorld, teamName: string) {
    const team = await getTeamByName(teamName);
    if (!team) throw new Error(`Team "${teamName}" not found`);

    const currentCache = await getCurrentCacheForTeam(team.id, team.currentCacheIndex);
    if (!currentCache) throw new Error('No current cache found');

    const existing = await getProgressLog(team.id, currentCache.id);
    if (existing) {
      await db
        .update(progressLogs)
        .set({ clue3RequestedTimestamp: new Date() })
        .where(eq(progressLogs.id, existing.id));
    } else {
      await db.insert(progressLogs).values({
        teamId: team.id,
        cacheId: currentCache.id,
        clue2RequestedTimestamp: new Date(Date.now() - 60000),
        clue3RequestedTimestamp: new Date(),
      });
    }
  },
);

Given(
  'team {string} has just confirmed finding cache 1 and advanced to cache 2',
  async function (this: TestWorld, teamName: string) {
    const team = await getTeamByName(teamName);
    if (!team) throw new Error(`Team "${teamName}" not found`);

    const firstCache = await getCurrentCacheForTeam(team.id, 0);
    if (!firstCache) throw new Error('No first cache found');

    await db.insert(progressLogs).values({
      teamId: team.id,
      cacheId: firstCache.id,
      foundTimestamp: new Date(),
      points: 5,
    });

    await db
      .update(teams)
      .set({ currentCacheIndex: 1 })
      .where(eq(teams.id, team.id));

    this.teamId = team.id;
  },
);

Given(
  'team {string} has found {int} caches using {int} clue each \\({int} points total\\)',
  async function (this: TestWorld, teamName: string, numCaches: number, _cluesEach: number, _totalPoints: number) {
    const team = await getTeamByName(teamName);
    if (!team) throw new Error(`Team "${teamName}" not found`);

    const logs = [];
    for (let i = 0; i < numCaches; i++) {
      const cache = await getCurrentCacheForTeam(team.id, i);
      if (!cache) throw new Error(`Sequence entry ${i} not found`);
      logs.push({ teamId: team.id, cacheId: cache.id, foundTimestamp: new Date(), points: 5 });
    }

    await db.insert(progressLogs).values(logs);
    await db
      .update(teams)
      .set({ currentCacheIndex: numCaches })
      .where(eq(teams.id, team.id));

    this.teamId = team.id;
  },
);

// ── When steps ───────────────────────────────────────────────────────────────

When(
  'a user visits the clue page for team {string}',
  async function (this: TestWorld, teamName: string) {
    if (!this.teamId) {
      const team = await getTeamByName(teamName);
      this.teamId = team?.id ?? null;
    }
    this.response = await fetch(`${BASE_URL}/clue/${this.teamId}`, {
      redirect: 'follow',
    });
  },
);

When(
  'they click {string}',
  async function (this: TestWorld, buttonLabel: string) {
    if (!this.teamId) throw new Error('No teamId set in world');

    const lowerLabel = buttonLabel.toLowerCase();

    if (lowerLabel.includes('request next clue')) {
      this.response = await fetch(
        `${BASE_URL}/api/clue/${this.teamId}/request-next`,
        { method: 'POST', redirect: 'follow' },
      );
    } else if (lowerLabel.includes('cannot find')) {
      this.response = await fetch(
        `${BASE_URL}/api/clue/${this.teamId}/cannot-find`,
        { method: 'POST', redirect: 'follow' },
      );
    } else if (lowerLabel === 'cancel') {
      this.response = await fetch(`${BASE_URL}/clue/${this.teamId}`, { redirect: 'follow' });
    } else if (lowerLabel === 'confirm') {
      this.response = await fetch(
        `${BASE_URL}/api/clue/${this.teamId}/skip-confirm`,
        { method: 'POST', redirect: 'follow' },
      );
    } else {
      throw new Error(`Unknown button: "${buttonLabel}"`);
    }
  },
);

// ── Then steps ───────────────────────────────────────────────────────────────

Then(
  'they see the team name {string}',
  async function (this: TestWorld, teamName: string) {
    const body = await this.getBody();
    if (!body.includes(teamName)) {
      throw new Error(`Expected team name "${teamName}" in page. Got: ${body.substring(0, 400)}`);
    }
  },
);

Then(
  'they see the current score',
  async function (this: TestWorld) {
    const body = await this.getBody();
    if (!body.toLowerCase().includes('score')) {
      throw new Error(`Expected "score" in page. Got: ${body.substring(0, 400)}`);
    }
  },
);

Then(
  'they see Clue {int} text {string}',
  async function (this: TestWorld, _clueNum: number, clueText: string) {
    const body = await this.getBody();
    if (!body.includes(clueText)) {
      throw new Error(
        `Expected clue text "${clueText}" in page. Got: ${body.substring(0, 600)}`,
      );
    }
  },
);

Then(
  'they see Clue {int} for cache {int}',
  async function (this: TestWorld, clueNum: number, cacheNum: number) {
    if (!this.teamId) throw new Error('No teamId set');
    const cache = await getCurrentCacheForTeam(this.teamId, cacheNum - 1);
    if (!cache) throw new Error(`No cache at position ${cacheNum}`);

    const body = await this.getBody();
    const clueText = clueNum === 1 ? cache.clue1Text : clueNum === 2 ? cache.clue2Text : cache.clue3Text;

    if (!body.includes(clueText)) {
      throw new Error(
        `Expected clue ${clueNum} text "${clueText}" in page. Got: ${body.substring(0, 400)}`,
      );
    }
  },
);

Then(
  'they do not see Clue {int}',
  async function (this: TestWorld, clueNum: number) {
    const body = await this.getBody();
    const marker = `Clue ${clueNum}`;
    const markerLower = marker.toLowerCase();
    if (body.toLowerCase().includes(`<h2`) && body.toLowerCase().includes(markerLower)) {
      const h2Match = body.match(/<h2[^>]*>[^<]*clue\s+\d[^<]*/gi) ?? [];
      const hasClue = h2Match.some((h) => h.toLowerCase().includes(markerLower));
      if (hasClue) {
        throw new Error(`Expected NOT to see "${marker}" heading in page`);
      }
    }
  },
);

Then(
  'they see a {string} button',
  async function (this: TestWorld, buttonLabel: string) {
    const body = await this.getBody();
    if (!body.includes(buttonLabel)) {
      throw new Error(
        `Expected button "${buttonLabel}" in page. Got: ${body.substring(0, 600)}`,
      );
    }
  },
);

Then(
  'they do not see a {string} button',
  async function (this: TestWorld, buttonLabel: string) {
    const body = await this.getBody();
    if (body.includes(buttonLabel)) {
      throw new Error(`Expected NOT to see button "${buttonLabel}" in page`);
    }
  },
);

Then(
  'the clue{int}_requested_at timestamp is recorded for this cache in the progress log',
  async function (this: TestWorld, clueNum: number) {
    if (!this.teamId) throw new Error('No teamId set');

    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, this.teamId))
      .limit(1);

    const currentCache = await getCurrentCacheForTeam(team.id, team.currentCacheIndex);
    if (!currentCache) throw new Error('No current cache');

    const log = await getProgressLog(team.id, currentCache.id);
    if (!log) throw new Error('No progress log found');

    const ts =
      clueNum === 2
        ? log.clue2RequestedTimestamp
        : clueNum === 3
          ? log.clue3RequestedTimestamp
          : null;

    if (!ts) {
      throw new Error(`clue${clueNum}_requested_at is not set in progress log`);
    }
  },
);

Then(
  'they see the Clue 3 image',
  async function (this: TestWorld) {
    const body = await this.getBody();
    if (!body.includes('<img')) {
      throw new Error(`Expected an <img> element for Clue 3 image. Got: ${body.substring(0, 400)}`);
    }
  },
);

Then(
  'the displayed score is {int}',
  async function (this: TestWorld, expectedScore: number) {
    const body = await this.getBody();
    const scoreMatch = body.match(/Score:\s*<span[^>]*>(\d+)<\/span>/);
    const displayed = scoreMatch ? parseInt(scoreMatch[1], 10) : null;

    if (displayed !== expectedScore) {
      throw new Error(
        `Expected score ${expectedScore} but displayed score is ${displayed}. Body: ${body.substring(0, 400)}`,
      );
    }
  },
);

Then(
  'they see a game-over message informing them the game has ended',
  async function (this: TestWorld) {
    const body = await this.getBody();
    const lower = body.toLowerCase();
    if (!lower.includes('game has ended') && !lower.includes('game over')) {
      throw new Error(
        `Expected game-over message. Got: ${body.substring(0, 400)}`,
      );
    }
  },
);
