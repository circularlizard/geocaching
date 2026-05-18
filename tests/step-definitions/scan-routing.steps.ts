import { Given, When, Then } from '@cucumber/cucumber';
import { db } from '@/lib/db';
import {
  games,
  registrationTokens,
  caches,
  teams,
} from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { TestWorld } from '../support/world';
import { getActiveGame } from './common.steps';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

Given(
  'a registration token {string} exists and has not been used in the active game',
  async function (this: TestWorld, tokenValue: string) {
    await db.insert(registrationTokens).values({ token: tokenValue });
  },
);

Given(
  'a registration token {string} exists and has already been used to register team {string} in the active game',
  async function (this: TestWorld, tokenValue: string, teamName: string) {
    const [regToken] = await db
      .insert(registrationTokens)
      .values({ token: tokenValue })
      .returning();

    const game = await getActiveGame();
    const [team] = await db
      .insert(teams)
      .values({
        gameId: game.id,
        registrationTokenId: regToken.id,
        displayName: teamName,
        members: JSON.stringify(['Member 1', 'Member 2', 'Member 3', 'Member 4']),
        currentCacheIndex: 0,
      })
      .returning();

    this.teamId = team.id;
  },
);

Given(
  'a cache location token {string} exists and is associated with cache {string}',
  async function (this: TestWorld, tokenValue: string, cacheName: string) {
    await db.insert(caches).values({
      name: cacheName,
      clue1Text: 'Clue 1',
      clue2Text: 'Clue 2',
      clue3Text: 'Clue 3',
      cacheToken: tokenValue,
    });
  },
);

Given(
  'a cache location token {string} exists',
  async function (this: TestWorld, tokenValue: string) {
    await db.insert(caches).values({
      name: 'Test Cache',
      clue1Text: 'Clue 1',
      clue2Text: 'Clue 2',
      clue3Text: 'Clue 3',
      cacheToken: tokenValue,
    });
  },
);

Given(
  'no token {string} exists in the system',
  async function (this: TestWorld, _tokenValue: string) {
    // Database was cleared in the fixture step — nothing to do
  },
);

Given(
  "the active game's end time has passed",
  async function (this: TestWorld) {
    const game = await getActiveGame();
    await db
      .update(games)
      .set({ gameEndTime: new Date(Date.now() - 60 * 60 * 1000) })
      .where(eq(games.id, game.id));
  },
);

Given(
  'admin recall has been triggered on the active game',
  async function (this: TestWorld) {
    const game = await getActiveGame();
    await db
      .update(games)
      .set({ adminRecallTriggered: true })
      .where(eq(games.id, game.id));
  },
);

When(
  'a user visits {string}',
  async function (this: TestWorld, path: string) {
    this.response = await fetch(`${BASE_URL}${path}`, { redirect: 'manual' });
  },
);

When(
  'a user visits {string} with no id parameter',
  async function (this: TestWorld, path: string) {
    this.response = await fetch(`${BASE_URL}${path}`, { redirect: 'manual' });
  },
);

Then(
  'they are redirected to {string}',
  async function (this: TestWorld, expectedPath: string) {
    const status = this.response!.status;
    const location = this.response!.headers.get('location') ?? '';

    if (![301, 302, 307, 308].includes(status)) {
      throw new Error(
        `Expected a redirect status (3xx) but got ${status}.\nBody: ${await this.response!.text()}`,
      );
    }

    if (!location.includes(expectedPath)) {
      throw new Error(
        `Expected Location to contain "${expectedPath}" but got "${location}"`,
      );
    }
  },
);

Then(
  'they are redirected to the active clue page for team {string}',
  async function (this: TestWorld, _teamName: string) {
    const status = this.response!.status;
    const location = this.response!.headers.get('location') ?? '';

    if (![301, 302, 307, 308].includes(status)) {
      throw new Error(
        `Expected a redirect status (3xx) but got ${status}.\nBody: ${await this.response!.text()}`,
      );
    }

    const expectedPath = `/clue/${this.teamId}`;
    if (!location.includes(expectedPath)) {
      throw new Error(
        `Expected Location to contain "${expectedPath}" but got "${location}"`,
      );
    }
  },
);

Then(
  'they see an error page indicating the code is not recognised',
  async function (this: TestWorld) {
    const body = await this.response!.text();
    const lower = body.toLowerCase();
    if (!lower.includes('not recognised') && !lower.includes('not recognized')) {
      throw new Error(
        `Expected error page with "not recognised" text.\nGot (first 400 chars): ${body.substring(0, 400)}`,
      );
    }
  },
);

Then(
  'they see a game-over page informing them the game has ended',
  async function (this: TestWorld) {
    const body = await this.response!.text();
    const lower = body.toLowerCase();
    if (!lower.includes('game has ended') && !lower.includes('game over')) {
      throw new Error(
        `Expected game-over page.\nGot (first 400 chars): ${body.substring(0, 400)}`,
      );
    }
  },
);
