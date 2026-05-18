import { Given, When, Then } from '@cucumber/cucumber';
import { db } from '@/lib/db';
import {
  teams,
  caches,
  teamSequences,
  progressLogs,
  registrationTokens,
} from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { TestWorld } from '../support/world';
import { getActiveGame } from './common.steps';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function getTeamByName(name: string) {
  const [team] = await db.select().from(teams).where(eq(teams.displayName, name)).limit(1);
  return team ?? null;
}

async function getCacheAtPosition(teamId: number, position: number) {
  const [seq] = await db
    .select()
    .from(teamSequences)
    .where(and(eq(teamSequences.teamId, teamId), eq(teamSequences.sequenceOrder, position)))
    .limit(1);
  if (!seq) return null;
  const [cache] = await db.select().from(caches).where(eq(caches.id, seq.cacheId)).limit(1);
  return cache ?? null;
}

async function createFreshTeam(teamName: string, cacheIndex = 0) {
  const token = `SKIP-TOKEN-${teamName.replace(/\s+/g, '-').toUpperCase()}`;

  let [regToken] = await db
    .select()
    .from(registrationTokens)
    .where(eq(registrationTokens.token, token))
    .limit(1);

  if (!regToken) {
    [regToken] = await db.insert(registrationTokens).values({ token }).returning();
  }

  const game = await getActiveGame();
  const allCaches = await db.select().from(caches).orderBy(caches.id);

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

  await db.insert(teamSequences).values(
    allCaches.map((c, i) => ({ teamId: team.id, cacheId: c.id, sequenceOrder: i })),
  );

  return team;
}

// ── Given steps ──────────────────────────────────────────────────────────────

Given(
  'team {string} has already requested Clue {int} for cache {int}',
  async function (this: TestWorld, teamName: string, clueNum: number, cacheNum: number) {
    const team = await getTeamByName(teamName);
    if (!team) throw new Error(`Team "${teamName}" not found`);
    this.teamId = team.id;

    const cache = await getCacheAtPosition(team.id, cacheNum - 1);
    if (!cache) throw new Error(`No cache at position ${cacheNum - 1}`);

    const [existing] = await db
      .select()
      .from(progressLogs)
      .where(and(eq(progressLogs.teamId, team.id), eq(progressLogs.cacheId, cache.id)))
      .limit(1);

    if (clueNum === 2) {
      if (existing) {
        await db.update(progressLogs)
          .set({ clue2RequestedTimestamp: new Date() })
          .where(eq(progressLogs.id, existing.id));
      } else {
        await db.insert(progressLogs).values({
          teamId: team.id,
          cacheId: cache.id,
          clue2RequestedTimestamp: new Date(),
        });
      }
    } else if (clueNum === 3) {
      if (existing) {
        await db.update(progressLogs)
          .set({
            clue2RequestedTimestamp: existing.clue2RequestedTimestamp ?? new Date(Date.now() - 60000),
            clue3RequestedTimestamp: new Date(),
          })
          .where(eq(progressLogs.id, existing.id));
      } else {
        await db.insert(progressLogs).values({
          teamId: team.id,
          cacheId: cache.id,
          clue2RequestedTimestamp: new Date(Date.now() - 60000),
          clue3RequestedTimestamp: new Date(),
        });
      }
    }
  },
);

Given(
  'team {string} has already requested Clue 3 for the last cache',
  async function (this: TestWorld, teamName: string) {
    const team = await getTeamByName(teamName);
    if (!team) throw new Error(`Team "${teamName}" not found`);
    this.teamId = team.id;

    const cache = await getCacheAtPosition(team.id, team.currentCacheIndex);
    if (!cache) throw new Error('No cache at current index');

    const [existing] = await db
      .select()
      .from(progressLogs)
      .where(and(eq(progressLogs.teamId, team.id), eq(progressLogs.cacheId, cache.id)))
      .limit(1);

    if (existing) {
      await db.update(progressLogs)
        .set({ clue3RequestedTimestamp: new Date() })
        .where(eq(progressLogs.id, existing.id));
    } else {
      await db.insert(progressLogs).values({
        teamId: team.id,
        cacheId: cache.id,
        clue2RequestedTimestamp: new Date(Date.now() - 60000),
        clue3RequestedTimestamp: new Date(),
      });
    }
  },
);

Given(
  'a user has clicked "Cannot find cache" and the confirmation prompt is showing',
  async function (this: TestWorld) {
    if (!this.teamId) throw new Error('No teamId set');
    this.response = await fetch(`${BASE_URL}/skip/${this.teamId}`, { redirect: 'follow' });
  },
);

Given(
  'a new team {string} is on cache {int} and has only requested Clue {int}',
  async function (this: TestWorld, teamName: string, _cacheNum: number, _clueNum: number) {
    const team = await createFreshTeam(teamName, _cacheNum - 1);
    this.teamId = team.id;
    // Clue 1 is always shown — no progress log needed
  },
);

Given(
  'a new team {string} is on cache {int} and has requested Clue {int} but not Clue {int}',
  async function (
    this: TestWorld,
    teamName: string,
    cacheNum: number,
    _requestedClue: number,
    _notClue: number,
  ) {
    const team = await createFreshTeam(teamName, cacheNum - 1);
    this.teamId = team.id;

    const cache = await getCacheAtPosition(team.id, cacheNum - 1);
    if (!cache) throw new Error('No cache at position');

    await db.insert(progressLogs).values({
      teamId: team.id,
      cacheId: cache.id,
      clue2RequestedTimestamp: new Date(),
    });
  },
);

// ── Then steps ───────────────────────────────────────────────────────────────

Then(
  'they see an "Are you sure?" confirmation prompt',
  async function (this: TestWorld) {
    const body = await this.getBody();
    if (!body.toLowerCase().includes('are you sure')) {
      throw new Error(`Expected "Are you sure?" prompt. Got: ${body.substring(0, 400)}`);
    }
  },
);

Then(
  'they see options to confirm or cancel',
  async function (this: TestWorld) {
    const body = await this.getBody();
    const lower = body.toLowerCase();
    if (!lower.includes('confirm') || !lower.includes('cancel')) {
      throw new Error(`Expected Confirm and Cancel options. Got: ${body.substring(0, 400)}`);
    }
  },
);

Then(
  'they remain on the clue page for cache 1',
  async function (this: TestWorld) {
    const body = await this.getBody();
    if (!body.toLowerCase().includes('clue 1')) {
      throw new Error(`Expected Clue 1 on clue page. Got: ${body.substring(0, 400)}`);
    }
  },
);

Then(
  'the progress log for cache 1 is unchanged',
  async function (this: TestWorld) {
    if (!this.teamId) throw new Error('No teamId set');
    const cache = await getCacheAtPosition(this.teamId, 0);
    if (!cache) throw new Error('No cache at position 0');

    const [log] = await db
      .select()
      .from(progressLogs)
      .where(and(eq(progressLogs.teamId, this.teamId), eq(progressLogs.cacheId, cache.id)))
      .limit(1);

    if (log?.skipped) {
      throw new Error('Progress log skipped flag was set but should be unchanged');
    }
    if (log?.points && log.points !== 0) {
      throw new Error(`Progress log points changed to ${log.points}`);
    }
  },
);

Then(
  'the skipped status is set to true for cache 1',
  async function (this: TestWorld) {
    if (!this.teamId) throw new Error('No teamId set');
    const cache = await getCacheAtPosition(this.teamId, 0);
    if (!cache) throw new Error('No cache at position 0');

    const [log] = await db
      .select()
      .from(progressLogs)
      .where(and(eq(progressLogs.teamId, this.teamId), eq(progressLogs.cacheId, cache.id)))
      .limit(1);

    if (!log?.skipped) {
      throw new Error('Expected skipped=true in progress log but got false/null');
    }
  },
);

Then(
  '0 points are recorded for the last cache',
  async function (this: TestWorld) {
    if (!this.teamId) throw new Error('No teamId set');
    const team = await db.select().from(teams).where(eq(teams.id, this.teamId)).limit(1);
    if (!team[0]) throw new Error('Team not found');

    const allSeqs = await db
      .select()
      .from(teamSequences)
      .where(eq(teamSequences.teamId, this.teamId));

    const lastSeq = allSeqs.find((s) => s.sequenceOrder === allSeqs.length - 1);
    if (!lastSeq) throw new Error('No last sequence entry');

    const [log] = await db
      .select()
      .from(progressLogs)
      .where(
        and(eq(progressLogs.teamId, this.teamId), eq(progressLogs.cacheId, lastSeq.cacheId)),
      )
      .limit(1);

    if (!log) throw new Error('No progress log for last cache');
    if (log.points !== 0) throw new Error(`Expected 0 points but got ${log.points}`);
  },
);
