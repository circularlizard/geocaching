import { Given } from '@cucumber/cucumber';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { db } from '@/lib/db';
import {
  games,
  registrationTokens,
  caches,
  gameCaches,
  teams,
  teamSequences,
  progressLogs,
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { TestWorld } from '../support/world';

export async function clearDatabase() {
  await db.delete(progressLogs);
  await db.delete(teamSequences);
  await db.delete(teams);
  await db.delete(gameCaches);
  await db.delete(caches);
  await db.delete(registrationTokens);
  await db.delete(games);
}

export async function getActiveGame() {
  const [game] = await db
    .select()
    .from(games)
    .where(eq(games.isActive, true))
    .limit(1);
  return game ?? null;
}

export const FIXTURE_CACHE_TOKENS = [
  'FIXTURE-CACHE-01', 'FIXTURE-CACHE-02', 'FIXTURE-CACHE-03', 'FIXTURE-CACHE-04',
  'FIXTURE-CACHE-05', 'FIXTURE-CACHE-06', 'FIXTURE-CACHE-07', 'FIXTURE-CACHE-08',
];

export const FIXTURE_REG_TOKENS = [
  'FIXTURE-REG-01', 'FIXTURE-REG-02', 'FIXTURE-REG-03', 'FIXTURE-REG-04',
  'FIXTURE-REG-05', 'FIXTURE-REG-06', 'FIXTURE-REG-07', 'FIXTURE-REG-08',
];

export async function seedFixtureCaches() {
  const cacheRows = FIXTURE_CACHE_TOKENS.map((token, i) => ({
    name: `Cache ${i + 1}`,
    clue1Text: `Clue 1 for cache ${i + 1}`,
    clue2Text: `Clue 2 for cache ${i + 1}`,
    clue3Text: `Clue 3 for cache ${i + 1}`,
    cacheToken: token,
  }));
  const inserted = await db.insert(caches).values(cacheRows).returning();

  const game = await getActiveGame();
  if (game) {
    await db.insert(gameCaches).values(
      inserted.map((c) => ({ gameId: game.id, cacheId: c.id })),
    );
  }

  return inserted;
}

Given(
  'the database is seeded with the standard test fixture',
  async function (this: TestWorld) {
    await clearDatabase();
    await db.insert(games).values({
      name: 'Test Game',
      gameEndTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
      cacheCount: 8,
      isActive: true,
      adminRecallTriggered: false,
    });
    await db.insert(registrationTokens).values(FIXTURE_REG_TOKENS.map((t) => ({ token: t })));
    await seedFixtureCaches();
  },
);

Given(
  'there is an active game that has not yet reached its end time',
  async function (this: TestWorld) {
    // Satisfied by the fixture: game is created with a future end time
  },
);

Given(
  'there is an active game with 8 caches',
  async function (this: TestWorld) {
    // Satisfied by the fixture: game has cacheCount=8 and 8 cache records seeded
  },
);

Given(
  'there is an active game',
  async function (this: TestWorld) {
    // Satisfied by the fixture
  },
);

Given(
  'admin recall has not been triggered',
  async function (this: TestWorld) {
    // Satisfied by the fixture: adminRecallTriggered defaults to false
  },
);

