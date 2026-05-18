import { Given, When, Then, DataTable } from '@cucumber/cucumber';
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
import { getActiveGame } from './common.steps';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function getTeamByName(name: string) {
  const [team] = await db.select().from(teams).where(eq(teams.displayName, name)).limit(1);
  return team ?? null;
}

async function createTeamWithAllCaches(
  teamName: string,
  tokenValue: string,
  cacheIndex = 0,
) {
  const game = await getActiveGame();
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
      members: JSON.stringify(['Alice', 'Bob', 'Carol', 'Dave']),
      currentCacheIndex: cacheIndex,
    })
    .returning();

  const allCaches = await db.select().from(caches).orderBy(asc(caches.id));
  await db.insert(teamSequences).values(
    allCaches.map((c, i) => ({ teamId: team.id, cacheId: c.id, sequenceOrder: i })),
  );

  return { team, allCaches };
}

function pointsForClues(cluesUsed: number, skipped: boolean): number {
  if (skipped) return 0;
  if (cluesUsed === 1) return 5;
  if (cluesUsed === 2) return 3;
  if (cluesUsed === 3) return 1;
  return 5;
}

// ── Given steps ──────────────────────────────────────────────────────────────

Given(
  'team {string} has confirmed finding their last cache',
  async function (this: TestWorld, teamName: string) {
    const { team, allCaches } = await createTeamWithAllCaches(
      teamName,
      `COMP-TOKEN-${teamName.replace(/\s+/g, '-').toUpperCase()}`,
    );

    await db.insert(progressLogs).values(
      allCaches.map((c) => ({
        teamId: team.id,
        cacheId: c.id,
        foundTimestamp: new Date(),
        points: 5,
      })),
    );

    await db.update(teams).set({ currentCacheIndex: allCaches.length }).where(eq(teams.id, team.id));
    this.teamId = team.id;
  },
);

Given(
  'team {string} has the following cache results:',
  async function (this: TestWorld, teamName: string, dataTable: DataTable) {
    const { team, allCaches } = await createTeamWithAllCaches(
      teamName,
      `COMP-TOKEN-${teamName.replace(/\s+/g, '-').toUpperCase()}`,
    );

    const rows = dataTable.hashes() as { cache: string; clues_used: string; skipped: string }[];

    const logValues = rows.map((row) => {
      const cacheIndex = parseInt(row.cache, 10) - 1;
      const cache = allCaches[cacheIndex];
      const cluesUsed = parseInt(row.clues_used, 10);
      const skipped = row.skipped === 'true';
      const points = pointsForClues(cluesUsed, skipped);

      return {
        teamId: team.id,
        cacheId: cache.id,
        clue2RequestedTimestamp: cluesUsed >= 2 ? new Date(Date.now() - 120000) : null,
        clue3RequestedTimestamp: cluesUsed >= 3 ? new Date(Date.now() - 60000) : null,
        foundTimestamp: skipped ? null : new Date(),
        points,
        skipped,
      };
    });

    await db.insert(progressLogs).values(logValues);
    await db.update(teams).set({ currentCacheIndex: allCaches.length }).where(eq(teams.id, team.id));
    this.teamId = team.id;
  },
);

Given(
  'team {string} has a final score of {int}',
  async function (this: TestWorld, teamName: string, score: number) {
    const { team, allCaches } = await createTeamWithAllCaches(
      teamName,
      `SCORE-TOKEN-${teamName.replace(/\s+/g, '-').toUpperCase()}`,
    );

    await db.insert(progressLogs).values({
      teamId: team.id,
      cacheId: allCaches[0].id,
      foundTimestamp: new Date(),
      points: score,
    });

    await db.update(teams).set({ currentCacheIndex: 1 }).where(eq(teams.id, team.id));
    this.teamId = team.id;
  },
);

Given(
  'registration token {string} exists and is unregistered in the current game',
  async function (this: TestWorld, tokenValue: string) {
    let [existing] = await db
      .select()
      .from(registrationTokens)
      .where(eq(registrationTokens.token, tokenValue))
      .limit(1);
    if (!existing) {
      await db.insert(registrationTokens).values({ token: tokenValue });
    }
  },
);

Given(
  'team {string} is in progress and not yet completed',
  async function (this: TestWorld, teamName: string) {
    const { team } = await createTeamWithAllCaches(
      teamName,
      `PROG-TOKEN-${teamName.replace(/\s+/g, '-').toUpperCase()}`,
      0,
    );
    this.teamId = team.id;
  },
);

// ── When steps ───────────────────────────────────────────────────────────────

When(
  'the completion page for team {string} is visited',
  async function (this: TestWorld, teamName: string) {
    if (!this.teamId) {
      const team = await getTeamByName(teamName);
      this.teamId = team?.id ?? null;
    }
    this.response = await fetch(`${BASE_URL}/completion/${this.teamId}`, {
      redirect: 'follow',
    });
  },
);

// ── Then steps ───────────────────────────────────────────────────────────────

Then(
  'they see a congratulatory message',
  async function (this: TestWorld) {
    const body = await this.getBody();
    const lower = body.toLowerCase();
    if (!lower.includes('congratulation') && !lower.includes('well done')) {
      throw new Error(`Expected congratulatory message. Got: ${body.substring(0, 400)}`);
    }
  },
);

Then(
  'they see their final total score',
  async function (this: TestWorld) {
    const body = await this.getBody();
    const lower = body.toLowerCase();
    if (!lower.includes('score') && !lower.includes('points')) {
      throw new Error(`Expected score display. Got: ${body.substring(0, 400)}`);
    }
  },
);

Then(
  'they see a message to return to base',
  async function (this: TestWorld) {
    const body = await this.getBody();
    const lower = body.toLowerCase();
    if (!lower.includes('return') && !lower.includes('base')) {
      throw new Error(`Expected "return to base" message. Got: ${body.substring(0, 400)}`);
    }
  },
);

Then(
  'the final score displayed is {int}',
  async function (this: TestWorld, expectedScore: number) {
    const body = await this.getBody();
    if (!body.includes(String(expectedScore))) {
      throw new Error(
        `Expected score ${expectedScore} on completion page. Got: ${body.substring(0, 400)}`,
      );
    }
  },
);

