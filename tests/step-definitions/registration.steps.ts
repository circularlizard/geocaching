import { Given, When, Then } from '@cucumber/cucumber';
import { db } from '@/lib/db';
import {
  games,
  registrationTokens,
  teams,
  teamSequences,
} from '@/lib/db/schema';
import { eq, and, count } from 'drizzle-orm';
import { TestWorld } from '../support/world';
import { getActiveGame } from './common.steps';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function registerTeamViaApi(
  world: TestWorld,
  tokenValue: string,
  teamName: string,
  membersStr: string,
): Promise<Response> {
  return fetch(`${BASE_URL}/api/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: tokenValue, teamName, members: membersStr }),
    redirect: 'manual',
  });
}

// ── Given steps ──────────────────────────────────────────────────────────────

Given(
  'registration token {string} has not been used in the active game',
  async function (this: TestWorld, tokenValue: string) {
    const existing = await db
      .select()
      .from(registrationTokens)
      .where(eq(registrationTokens.token, tokenValue))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(registrationTokens).values({ token: tokenValue });
    }
  },
);

Given(
  'registration token {string} has already been used to register team {string} in the active game',
  async function (this: TestWorld, tokenValue: string, teamName: string) {
    const [regToken] = await db
      .insert(registrationTokens)
      .values({ token: tokenValue })
      .onConflictDoNothing()
      .returning();

    const game = await getActiveGame();

    let token = regToken;
    if (!token) {
      const [found] = await db
        .select()
        .from(registrationTokens)
        .where(eq(registrationTokens.token, tokenValue))
        .limit(1);
      token = found;
    }

    const [team] = await db
      .insert(teams)
      .values({
        gameId: game.id,
        registrationTokenId: token.id,
        displayName: teamName,
        members: JSON.stringify(['Member 1', 'Member 2', 'Member 3', 'Member 4']),
        currentCacheIndex: 0,
      })
      .returning();

    this.teamId = team.id;
  },
);

Given(
  'team {string} is registered with token {string}',
  async function (this: TestWorld, teamName: string, tokenValue: string) {
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

    const res = await registerTeamViaApi(
      this,
      tokenValue,
      teamName,
      'Alice, Bob, Carol, Dave',
    );
    this.response = res;

    const location = res.headers.get('location') ?? '';
    const idMatch = location.match(/\/clue\/(\d+)/);
    if (idMatch) this.teamId = parseInt(idMatch[1], 10);
  },
);

Given(
  'a new game has been created',
  async function (this: TestWorld) {
    await db
      .update(games)
      .set({ isActive: false })
      .where(eq(games.isActive, true));

    await db.insert(games).values({
      name: 'New Game',
      gameEndTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
      cacheCount: 8,
      isActive: true,
      adminRecallTriggered: false,
    });
    // Caches are global and were already seeded — no need to re-insert
  },
);

Given(
  'registration token {string} was used in a previous game but not in the new active game',
  async function (this: TestWorld, _tokenValue: string) {
    // The token already exists from the fixture; it was linked to the old game
    // The new active game has no team using it — no action needed
  },
);

// ── When steps ───────────────────────────────────────────────────────────────

When(
  'they submit the registration form with team name {string} and members {string}',
  async function (this: TestWorld, teamName: string, membersStr: string) {
    const token = this.currentToken ?? '';
    this.teamId = null;
    this.response = await registerTeamViaApi(this, token, teamName, membersStr);
  },
);

When(
  'they submit the registration form with no team name and members {string}',
  async function (this: TestWorld, membersStr: string) {
    const token = this.currentToken ?? '';
    this.teamId = null;
    this.response = await registerTeamViaApi(this, token, '', membersStr);
  },
);

// ── Then steps ───────────────────────────────────────────────────────────────

Then(
  'a new team {string} is created in the database linked to the active game',
  async function (this: TestWorld, teamName: string) {
    const game = await getActiveGame();
    const [team] = await db
      .select()
      .from(teams)
      .where(
        and(eq(teams.displayName, teamName), eq(teams.gameId, game.id)),
      )
      .limit(1);

    if (!team) {
      throw new Error(`No team named "${teamName}" found in the active game`);
    }
    this.teamId = team.id;
  },
);

Then(
  'the team is assigned a unique randomised sequence of all {int} caches',
  async function (this: TestWorld, expectedCount: number) {
    if (!this.teamId) throw new Error('No teamId set in world');

    const seqs = await db
      .select()
      .from(teamSequences)
      .where(eq(teamSequences.teamId, this.teamId));

    if (seqs.length !== expectedCount) {
      throw new Error(
        `Expected ${expectedCount} sequence entries but found ${seqs.length}`,
      );
    }

    const orders = seqs.map((s) => s.sequenceOrder).sort((a, b) => a - b);
    const expected = Array.from({ length: expectedCount }, (_, i) => i);
    if (JSON.stringify(orders) !== JSON.stringify(expected)) {
      throw new Error(`Sequence orders are not a permutation of 0..${expectedCount - 1}: ${orders}`);
    }
  },
);

Then(
  'the clue page shows Clue 1 for their first cache',
  async function (this: TestWorld) {
    if (!this.teamId) throw new Error('No teamId set in world');

    const res = await fetch(`${BASE_URL}/clue/${this.teamId}`);
    const body = await res.text();

    if (!body.toLowerCase().includes('clue 1')) {
      throw new Error(
        `Expected clue page to show "Clue 1" but got: ${body.substring(0, 400)}`,
      );
    }
  },
);

Then(
  'they see a registration form requesting a team name and team members',
  async function (this: TestWorld) {
    const body = await this.response!.text();
    const lower = body.toLowerCase();
    if (!lower.includes('team name') || !lower.includes('team member')) {
      throw new Error(
        `Expected registration form with team name and members fields.\nGot: ${body.substring(0, 400)}`,
      );
    }
  },
);

Then(
  'they see a validation error indicating a minimum of {int} team members is required',
  async function (this: TestWorld, _min: number) {
    const body = await this.response!.text();
    if (!body.toLowerCase().includes('minimum')) {
      throw new Error(
        `Expected "minimum" in error response. Got: ${body.substring(0, 400)}`,
      );
    }
  },
);

Then(
  'they see a validation error indicating a maximum of {int} team members is allowed',
  async function (this: TestWorld, _max: number) {
    const body = await this.response!.text();
    if (!body.toLowerCase().includes('maximum')) {
      throw new Error(
        `Expected "maximum" in error response. Got: ${body.substring(0, 400)}`,
      );
    }
  },
);

Then(
  'they see a validation error indicating a team name is required',
  async function (this: TestWorld) {
    const body = await this.response!.text();
    if (!body.toLowerCase().includes('team name')) {
      throw new Error(
        `Expected "team name" in error response. Got: ${body.substring(0, 400)}`,
      );
    }
  },
);

Then(
  'no team is created in the database',
  async function (this: TestWorld) {
    const [{ value }] = await db.select({ value: count() }).from(teams);
    if (value > 0) {
      throw new Error(`Expected 0 teams in the database but found ${value}`);
    }
  },
);

Then(
  'the registration form is not shown',
  async function (this: TestWorld) {
    const status = this.response!.status;
    if ([301, 302, 307, 308].includes(status)) return;

    const body = await this.response!.text();
    if (body.toLowerCase().includes('register your team')) {
      throw new Error('Registration form was shown but should not have been');
    }
  },
);

Then(
  'the cache sequence for team {string} is not identical to the cache sequence for team {string}',
  async function (this: TestWorld, teamAName: string, teamBName: string) {
    const [teamA] = await db
      .select()
      .from(teams)
      .where(eq(teams.displayName, teamAName))
      .limit(1);
    const [teamB] = await db
      .select()
      .from(teams)
      .where(eq(teams.displayName, teamBName))
      .limit(1);

    if (!teamA || !teamB) {
      throw new Error(`Could not find teams "${teamAName}" and/or "${teamBName}"`);
    }

    const seqA = await db
      .select()
      .from(teamSequences)
      .where(eq(teamSequences.teamId, teamA.id));
    const seqB = await db
      .select()
      .from(teamSequences)
      .where(eq(teamSequences.teamId, teamB.id));

    const orderA = seqA.sort((a, b) => a.sequenceOrder - b.sequenceOrder).map((s) => s.cacheId);
    const orderB = seqB.sort((a, b) => a.sequenceOrder - b.sequenceOrder).map((s) => s.cacheId);

    if (JSON.stringify(orderA) === JSON.stringify(orderB)) {
      throw new Error('Team sequences are identical — randomisation may not be working');
    }
  },
);

Then(
  'their cache sequence contains each of the {int} game caches exactly once',
  async function (this: TestWorld, expectedCount: number) {
    if (!this.teamId) throw new Error('No teamId set in world');

    const seqs = await db
      .select()
      .from(teamSequences)
      .where(eq(teamSequences.teamId, this.teamId));

    const cacheIds = seqs.map((s) => s.cacheId);
    const uniqueIds = new Set(cacheIds);

    if (cacheIds.length !== expectedCount) {
      throw new Error(
        `Expected sequence of length ${expectedCount}, got ${cacheIds.length}`,
      );
    }

    if (uniqueIds.size !== expectedCount) {
      throw new Error(
        `Sequence contains duplicate cache IDs: ${cacheIds}`,
      );
    }
  },
);

Then(
  'they see the registration form',
  async function (this: TestWorld) {
    const body = await this.response!.text();
    if (!body.toLowerCase().includes('register')) {
      throw new Error(`Expected registration form. Got: ${body.substring(0, 400)}`);
    }
  },
);

Then(
  'a new team registration is created linked to the new active game',
  async function (this: TestWorld) {
    const token = this.currentToken ?? '';
    const res = await fetch(`${BASE_URL}/api/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, teamName: 'Test Team', members: 'Alice, Bob, Carol, Dave' }),
      redirect: 'manual',
    });

    const status = res.status;
    if (![301, 302, 307, 308].includes(status)) {
      throw new Error(
        `Expected redirect after registration but got ${status}: ${await res.text()}`,
      );
    }

    const game = await getActiveGame();
    const [{ value }] = await db
      .select({ value: count() })
      .from(teams)
      .where(eq(teams.gameId, game.id));

    if (value === 0) {
      throw new Error('Expected a team linked to the new active game but found none');
    }
  },
);
