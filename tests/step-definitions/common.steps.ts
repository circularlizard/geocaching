import { Given } from '@cucumber/cucumber';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { db } from '@/lib/db';
import {
  games,
  registrationTokens,
  caches,
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
  },
);

Given(
  'there is an active game that has not yet reached its end time',
  async function (this: TestWorld) {
    // Satisfied by the fixture: game is created with a future end time
  },
);

Given(
  'admin recall has not been triggered',
  async function (this: TestWorld) {
    // Satisfied by the fixture: adminRecallTriggered defaults to false
  },
);
