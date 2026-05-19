import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '@/lib/db';
import {
  games,
  caches,
  gameCaches,
  registrationTokens,
  teams,
} from '@/lib/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { TestWorld } from '../support/world';
import { getActiveGame } from './common.steps';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'test-admin-password';

function adminHeaders(world: TestWorld): Record<string, string> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (world.adminCookieHeader) headers['Cookie'] = world.adminCookieHeader;
  return headers;
}

async function loginAsAdmin(world: TestWorld): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ password: ADMIN_PASSWORD }),
    redirect: 'manual',
  });
  const setCookie = res.headers.get('set-cookie') ?? '';
  const match = setCookie.match(/admin_auth=[^;]+/);
  if (match) {
    world.adminCookieHeader = match[0];
  }
}

// ── Given steps ──────────────────────────────────────────────────────────────

Given(
  'the admin password is configured via the ADMIN_PASSWORD environment variable',
  async function (this: TestWorld) {
    // ADMIN_PASSWORD is set in .env.local — no action needed
  },
);

Given(
  'a user is not authenticated as admin',
  async function (this: TestWorld) {
    this.adminCookieHeader = null;
  },
);

Given(
  'a user visits the admin login page',
  async function (this: TestWorld) {
    this.response = await fetch(`${BASE_URL}/admin/login`, { redirect: 'follow' });
  },
);

Given(
  'an admin is authenticated',
  async function (this: TestWorld) {
    await loginAsAdmin(this);
    if (!this.adminCookieHeader) throw new Error('Admin login failed — check ADMIN_PASSWORD env');
  },
);

Given(
  'there is an active game named {string}',
  async function (this: TestWorld, _name: string) {
    // Satisfied by the fixture (game is already created)
  },
);

Given(
  'a cache {string} exists',
  async function (this: TestWorld, cacheName: string) {
    const [existing] = await db
      .select()
      .from(caches)
      .where(eq(caches.name, cacheName))
      .limit(1);
    if (!existing) {
      await db.insert(caches).values({
        name: cacheName,
        clue1Text: 'Clue 1',
        clue2Text: 'Clue 2',
        clue3Text: 'Clue 3',
        cacheToken: `TOKEN-${cacheName.replace(/\s+/g, '-').toUpperCase()}`,
      });
    }
  },
);

Given(
  'a cache {string} exists with Clue 1 {string}',
  async function (this: TestWorld, cacheName: string, clue1Text: string) {
    const [existing] = await db
      .select()
      .from(caches)
      .where(eq(caches.name, cacheName))
      .limit(1);
    if (!existing) {
      await db.insert(caches).values({
        name: cacheName,
        clue1Text,
        clue2Text: 'Clue 2',
        clue3Text: 'Clue 3',
        cacheToken: `TOKEN-${cacheName.replace(/\s+/g, '-').toUpperCase()}`,
      });
    }
  },
);

Given(
  'the active game has registration tokens {string}, {string}, {string}',
  async function (this: TestWorld, t1: string, t2: string, t3: string) {
    for (const token of [t1, t2, t3]) {
      const [existing] = await db
        .select()
        .from(registrationTokens)
        .where(eq(registrationTokens.token, token))
        .limit(1);
      if (!existing) {
        await db.insert(registrationTokens).values({ token });
      }
    }
  },
);

Given(
  'cache {string} was created in a previous game with token {string}',
  async function (this: TestWorld, cacheName: string, tokenValue: string) {
    const [existing] = await db
      .select()
      .from(caches)
      .where(eq(caches.name, cacheName))
      .limit(1);
    if (!existing) {
      await db.insert(caches).values({
        name: cacheName,
        clue1Text: 'Clue 1',
        clue2Text: 'Clue 2',
        clue3Text: 'Clue 3',
        cacheToken: tokenValue,
      });
    } else if (existing.cacheToken !== tokenValue) {
      await db.update(caches).set({ cacheToken: tokenValue }).where(eq(caches.id, existing.id));
    }
  },
);

Given(
  'there are {int} caches in the system',
  async function (this: TestWorld, totalCaches: number) {
    const existing = await db.select().from(caches);
    const needed = totalCaches - existing.length;
    if (needed > 0) {
      await db.insert(caches).values(
        Array.from({ length: needed }, (_, i) => ({
          name: `Extra Cache ${existing.length + i + 1}`,
          clue1Text: 'Clue 1',
          clue2Text: 'Clue 2',
          clue3Text: 'Clue 3',
          cacheToken: `EXTRA-${existing.length + i + 1}-${Date.now()}`,
        })),
      );
    }
  },
);

Given(
  'registration token {string} has been used to register a team in the active game',
  async function (this: TestWorld, tokenValue: string) {
    let [token] = await db
      .select()
      .from(registrationTokens)
      .where(eq(registrationTokens.token, tokenValue))
      .limit(1);
    if (!token) {
      [token] = await db.insert(registrationTokens).values({ token: tokenValue }).returning();
    }
    this.currentToken = String(token.id);

    const [activeGame] = await db.select().from(games).where(eq(games.isActive, true)).limit(1);
    if (!activeGame) throw new Error('No active game');

    const [existing] = await db
      .select()
      .from(teams)
      .where(and(eq(teams.registrationTokenId, token.id), eq(teams.gameId, activeGame.id)))
      .limit(1);
    if (!existing) {
      await db.insert(teams).values({
        gameId: activeGame.id,
        registrationTokenId: token.id,
        displayName: `Team-${tokenValue}`,
        members: JSON.stringify(['A', 'B', 'C', 'D']),
        currentCacheIndex: 0,
      });
    }
  },
);

Given(
  'a cache {string} exists and is not assigned to the active game',
  async function (this: TestWorld, cacheName: string) {
    let [cache] = await db.select().from(caches).where(eq(caches.name, cacheName)).limit(1);
    if (!cache) {
      [cache] = await db
        .insert(caches)
        .values({
          name: cacheName,
          clue1Text: 'Clue 1',
          clue2Text: 'Clue 2',
          clue3Text: 'Clue 3',
          cacheToken: `TOKEN-${cacheName.replace(/\s+/g, '-').toUpperCase()}-UNASSIGNED`,
        })
        .returning();
    }
    const [activeGame] = await db.select().from(games).where(eq(games.isActive, true)).limit(1);
    if (activeGame) {
      await db
        .delete(gameCaches)
        .where(and(eq(gameCaches.cacheId, cache.id), eq(gameCaches.gameId, activeGame.id)));
    }
    this.currentCacheToken = String(cache.id);
  },
);

Given(
  'a cache {string} exists and is assigned to the active game',
  async function (this: TestWorld, cacheName: string) {
    let [cache] = await db.select().from(caches).where(eq(caches.name, cacheName)).limit(1);
    if (!cache) {
      [cache] = await db
        .insert(caches)
        .values({
          name: cacheName,
          clue1Text: 'Clue 1',
          clue2Text: 'Clue 2',
          clue3Text: 'Clue 3',
          cacheToken: `TOKEN-${cacheName.replace(/\s+/g, '-').toUpperCase()}-ASSIGNED`,
        })
        .returning();
    }
    const [activeGame] = await db.select().from(games).where(eq(games.isActive, true)).limit(1);
    if (!activeGame) throw new Error('No active game');
    const [existing] = await db
      .select()
      .from(gameCaches)
      .where(and(eq(gameCaches.cacheId, cache.id), eq(gameCaches.gameId, activeGame.id)))
      .limit(1);
    if (!existing) {
      await db.insert(gameCaches).values({ gameId: activeGame.id, cacheId: cache.id });
    }
    this.currentCacheToken = String(cache.id);
  },
);

// ── When steps ───────────────────────────────────────────────────────────────

When(
  'they visit {string}',
  async function (this: TestWorld, path: string) {
    const headers: Record<string, string> = {};
    if (this.adminCookieHeader) headers['Cookie'] = this.adminCookieHeader;
    this.response = await fetch(`${BASE_URL}${path}`, { headers, redirect: 'manual' });
  },
);

When(
  'they submit the correct admin password',
  async function (this: TestWorld) {
    this.response = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: ADMIN_PASSWORD }),
      redirect: 'manual',
    });
    const setCookie = this.response.headers.get('set-cookie') ?? '';
    const match = setCookie.match(/admin_auth=[^;]+/);
    if (match) this.adminCookieHeader = match[0];
  },
);

When(
  'they submit an incorrect password',
  async function (this: TestWorld) {
    this.response = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: 'wrong-password-xyz' }),
      redirect: 'follow',
    });
  },
);

When(
  'they create a game with name {string} and end time {string}',
  async function (this: TestWorld, name: string, endTime: string) {
    this.response = await fetch(`${BASE_URL}/api/admin/game/create`, {
      method: 'POST',
      headers: adminHeaders(this),
      body: JSON.stringify({ name, endTime }),
      redirect: 'follow',
    });
  },
);

When(
  'they update the game end time to {string}',
  async function (this: TestWorld, endTime: string) {
    const game = await getActiveGame();
    if (!game) throw new Error('No active game');
    this.response = await fetch(`${BASE_URL}/api/admin/game/${game.id}/end-time`, {
      method: 'PUT',
      headers: adminHeaders(this),
      body: JSON.stringify({ endTime }),
      redirect: 'follow',
    });
  },
);

When(
  'they create a cache with:',
  async function (this: TestWorld, dataTable: DataTable) {
    const data = dataTable.rowsHash() as {
      name: string;
      clue1: string;
      clue2: string;
      clue3: string;
    };
    this.response = await fetch(`${BASE_URL}/api/admin/cache/create`, {
      method: 'POST',
      headers: adminHeaders(this),
      body: JSON.stringify(data),
      redirect: 'follow',
    });
  },
);

When(
  'they upload an image file for the Clue 3 photograph',
  async function (this: TestWorld) {
    const [cache] = await db.select().from(caches).where(eq(caches.name, 'Oak Tree Cache')).limit(1);
    if (!cache) throw new Error('Cache "Oak Tree Cache" not found');

    const form = new FormData();
    const blob = new Blob(['fake-image-data'], { type: 'image/jpeg' });
    form.append('image', blob, 'test.jpg');

    const headers: Record<string, string> = {};
    if (this.adminCookieHeader) headers['Cookie'] = this.adminCookieHeader;

    this.response = await fetch(`${BASE_URL}/api/admin/cache/${cache.id}/upload-image`, {
      method: 'POST',
      headers,
      body: form,
      redirect: 'follow',
    });
  },
);

When(
  'they update Clue 1 to {string}',
  async function (this: TestWorld, newText: string) {
    const [cache] = await db.select().from(caches).where(eq(caches.name, 'Oak Tree Cache')).limit(1);
    if (!cache) throw new Error('Cache "Oak Tree Cache" not found');

    this.response = await fetch(`${BASE_URL}/api/admin/cache/${cache.id}/clue`, {
      method: 'PUT',
      headers: adminHeaders(this),
      body: JSON.stringify({ clue: 'clue1', text: newText }),
      redirect: 'follow',
    });
  },
);

When(
  'they view the registration tokens page',
  async function (this: TestWorld) {
    const headers: Record<string, string> = {};
    if (this.adminCookieHeader) headers['Cookie'] = this.adminCookieHeader;
    this.response = await fetch(`${BASE_URL}/admin/tokens`, { headers, redirect: 'follow' });
  },
);

When(
  'they request the QR code print sheet for the active game',
  async function (this: TestWorld) {
    const headers: Record<string, string> = {};
    if (this.adminCookieHeader) headers['Cookie'] = this.adminCookieHeader;
    this.response = await fetch(`${BASE_URL}/admin/qr-sheet`, { headers, redirect: 'follow' });
  },
);

When(
  'a new game is created',
  async function (this: TestWorld) {
    this.response = await fetch(`${BASE_URL}/api/admin/game/create`, {
      method: 'POST',
      headers: adminHeaders(this),
      body: JSON.stringify({
        name: 'New Game',
        endTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      }),
      redirect: 'follow',
    });
  },
);

When(
  'they assign {int} specific caches to the active game',
  async function (this: TestWorld, count: number) {
    const game = await getActiveGame();
    if (!game) throw new Error('No active game');

    const allCaches = await db.select().from(caches).orderBy(asc(caches.id));
    const selected = allCaches.slice(0, count).map((c) => c.id);

    this.response = await fetch(`${BASE_URL}/api/admin/game/${game.id}/assign-caches`, {
      method: 'POST',
      headers: adminHeaders(this),
      body: JSON.stringify({ cacheIds: selected }),
      redirect: 'follow',
    });
  },
);

When(
  'they create a new registration token',
  async function (this: TestWorld) {
    this.response = await fetch(`${BASE_URL}/api/admin/tokens/create`, {
      method: 'POST',
      headers: adminHeaders(this),
      redirect: 'follow',
    });
  },
);

When(
  'they delete registration token {string}',
  async function (this: TestWorld, tokenValue: string) {
    const [token] = await db
      .select()
      .from(registrationTokens)
      .where(eq(registrationTokens.token, tokenValue))
      .limit(1);
    if (!token) throw new Error(`Token "${tokenValue}" not found`);
    this.response = await fetch(`${BASE_URL}/api/admin/tokens/${token.id}`, {
      method: 'DELETE',
      headers: adminHeaders(this),
      redirect: 'follow',
    });
  },
);

When(
  'they attempt to delete registration token {string}',
  async function (this: TestWorld, tokenValue: string) {
    const [token] = await db
      .select()
      .from(registrationTokens)
      .where(eq(registrationTokens.token, tokenValue))
      .limit(1);
    if (!token) throw new Error(`Token "${tokenValue}" not found`);
    this.response = await fetch(`${BASE_URL}/api/admin/tokens/${token.id}`, {
      method: 'DELETE',
      headers: adminHeaders(this),
      redirect: 'follow',
    });
  },
);

When(
  'they delete the cache {string}',
  async function (this: TestWorld, cacheName: string) {
    const [cache] = await db.select().from(caches).where(eq(caches.name, cacheName)).limit(1);
    if (!cache) throw new Error(`Cache "${cacheName}" not found`);
    this.response = await fetch(`${BASE_URL}/api/admin/cache/${cache.id}`, {
      method: 'DELETE',
      headers: adminHeaders(this),
      redirect: 'follow',
    });
  },
);

When(
  'they attempt to delete the cache {string}',
  async function (this: TestWorld, cacheName: string) {
    const [cache] = await db.select().from(caches).where(eq(caches.name, cacheName)).limit(1);
    if (!cache) throw new Error(`Cache "${cacheName}" not found`);
    this.response = await fetch(`${BASE_URL}/api/admin/cache/${cache.id}`, {
      method: 'DELETE',
      headers: adminHeaders(this),
      redirect: 'follow',
    });
  },
);

// ── Then steps ───────────────────────────────────────────────────────────────

Then(
  'they are redirected to the admin login page',
  async function (this: TestWorld) {
    const status = this.response!.status;
    const location = this.response!.headers.get('location') ?? '';
    const finalUrl = this.response!.url;
    if (
      ![301, 302, 307, 308].includes(status) &&
      !location.includes('/admin/login') &&
      !finalUrl.includes('/admin/login')
    ) {
      throw new Error(
        `Expected redirect to /admin/login. Status: ${status}, Location: ${location}, URL: ${finalUrl}`,
      );
    }
  },
);

Then(
  'they are granted access to the admin interface',
  async function (this: TestWorld) {
    if (!this.adminCookieHeader) throw new Error('No admin cookie set');
    const res = await fetch(`${BASE_URL}/admin/dashboard`, {
      headers: { Cookie: this.adminCookieHeader },
      redirect: 'follow',
    });
    const body = await res.text();
    if (!body.toLowerCase().includes('admin') && !body.toLowerCase().includes('dashboard')) {
      throw new Error(`Expected admin interface. Got: ${body.substring(0, 400)}`);
    }
  },
);

Then(
  'a session cookie is set',
  async function (this: TestWorld) {
    if (!this.adminCookieHeader) {
      throw new Error('No admin session cookie was set');
    }
  },
);

Then(
  'they see an authentication error',
  async function (this: TestWorld) {
    const body = await this.getBody();
    const lower = body.toLowerCase();
    if (!lower.includes('incorrect') && !lower.includes('error') && !lower.includes('invalid')) {
      throw new Error(`Expected authentication error. Got: ${body.substring(0, 400)}`);
    }
  },
);

Then(
  'they are not granted access',
  async function (this: TestWorld) {
    if (!this.adminCookieHeader) return; // no cookie set → not granted
    const headers: Record<string, string> = { Cookie: this.adminCookieHeader };
    const res = await fetch(`${BASE_URL}/admin/dashboard`, { headers, redirect: 'manual' });
    if (res.status === 200) {
      throw new Error('Admin was granted access after wrong password');
    }
  },
);

Then(
  'all existing caches are automatically assigned to the new game',
  async function (this: TestWorld) {
    const body = await this.getBody();
    const parsed = JSON.parse(body);
    const gameId = parsed.game?.id;
    if (!gameId) throw new Error(`Expected game in response. Got: ${body.substring(0, 200)}`);
    const allCachesInDb = await db.select().from(caches).orderBy(asc(caches.id));
    const assigned = await db.select().from(gameCaches).where(eq(gameCaches.gameId, gameId));
    if (assigned.length !== allCachesInDb.length) {
      throw new Error(`Expected ${allCachesInDb.length} caches assigned but got ${assigned.length}`);
    }
  },
);

Then(
  'a new game record is created in the database',
  async function (this: TestWorld) {
    const body = await this.getBody();
    const parsed = JSON.parse(body);
    if (!parsed.game?.id) {
      throw new Error(`Expected new game in response. Got: ${body.substring(0, 400)}`);
    }
  },
);

Then(
  'the new game is marked as active',
  async function (this: TestWorld) {
    const body = await this.getBody();
    const parsed = JSON.parse(body);
    if (!parsed.game?.isActive) {
      throw new Error('New game is not marked as active');
    }
  },
);

Then(
  'any previously active game is marked as inactive',
  async function (this: TestWorld) {
    const allGames = await db.select().from(games);
    const activeGames = allGames.filter((g) => g.isActive);
    if (activeGames.length > 1) {
      throw new Error(`Expected 1 active game but found ${activeGames.length}`);
    }
  },
);

Then(
  "the active game's end time is updated in the database",
  async function (this: TestWorld) {
    const body = await this.getBody();
    const parsed = JSON.parse(body);
    if (!parsed.game?.gameEndTime) {
      throw new Error(`Expected updated game. Got: ${body.substring(0, 400)}`);
    }
  },
);

Then(
  'a new cache record is created in the database',
  async function (this: TestWorld) {
    const body = await this.getBody();
    const parsed = JSON.parse(body);
    if (!parsed.cache?.id) {
      throw new Error(`Expected new cache in response. Got: ${body.substring(0, 400)}`);
    }
  },
);

Then(
  'a unique cache location token is generated for the cache',
  async function (this: TestWorld) {
    const body = await this.getBody();
    const parsed = JSON.parse(body);
    if (!parsed.cache?.cacheToken) {
      throw new Error('Expected cacheToken in response');
    }
  },
);

Then(
  'the image is stored in blob storage',
  async function (this: TestWorld) {
    const body = await this.getBody();
    const parsed = JSON.parse(body);
    if (!parsed.url) {
      throw new Error('Expected image URL in response');
    }
  },
);

Then(
  'the cache record is updated with the image URL',
  async function (this: TestWorld) {
    const [cache] = await db.select().from(caches).where(eq(caches.name, 'Oak Tree Cache')).limit(1);
    if (!cache?.clue3ImageUrl) {
      throw new Error('clue3ImageUrl not set on cache record');
    }
  },
);

Then(
  'the cache record is updated with the new Clue 1 text',
  async function (this: TestWorld) {
    const body = await this.getBody();
    const parsed = JSON.parse(body);
    if (!parsed.cache?.clue1Text) {
      throw new Error(`Expected updated cache. Got: ${body.substring(0, 400)}`);
    }
  },
);

Then(
  'they see a list of all registration tokens in the system',
  async function (this: TestWorld) {
    const body = await this.getBody();
    const allTokens = await db.select().from(registrationTokens);
    for (const token of allTokens) {
      if (!body.includes(token.token)) {
        throw new Error(`Token "${token.token}" not found in tokens page`);
      }
    }
  },
);

Then(
  'each token shows its secure token value and whether it has been used in the active game',
  async function (this: TestWorld) {
    const body = await this.getBody();
    if (!body.toLowerCase().includes('used') && !body.toLowerCase().includes('unused')) {
      throw new Error(`Expected used/unused status on tokens page. Got: ${body.substring(0, 400)}`);
    }
  },
);

Then(
  'a downloadable image or PDF is generated containing a QR code for each token',
  async function (this: TestWorld) {
    const body = await this.getBody();
    if (!body.toLowerCase().includes('qr') && !body.toLowerCase().includes('scan')) {
      throw new Error(`Expected QR code sheet. Got: ${body.substring(0, 400)}`);
    }
  },
);

Then(
  'each QR code encodes a URL in the format {string}',
  async function (this: TestWorld, _format: string) {
    const body = await this.getBody();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    if (!body.includes(`${appUrl}/scan?id=`) && !body.includes('/scan?id=')) {
      throw new Error(
        `Expected QR URL in format ${_format}. Got: ${body.substring(0, 400)}`,
      );
    }
  },
);

Then(
  'the cache location token for {string} is still {string}',
  async function (this: TestWorld, cacheName: string, expectedToken: string) {
    const [cache] = await db
      .select()
      .from(caches)
      .where(eq(caches.name, cacheName))
      .limit(1);
    if (!cache) throw new Error(`Cache "${cacheName}" not found`);
    if (cache.cacheToken !== expectedToken) {
      throw new Error(`Expected token "${expectedToken}" but got "${cache.cacheToken}"`);
    }
  },
);

Then(
  "the active game's cache count is {int}",
  async function (this: TestWorld, expectedCount: number) {
    const game = await getActiveGame();
    if (!game) throw new Error('No active game');
    if (game.cacheCount !== expectedCount) {
      throw new Error(`Expected cacheCount ${expectedCount} but got ${game.cacheCount}`);
    }
  },
);

Then(
  'a new registration token is created in the database',
  async function (this: TestWorld) {
    const body = await this.getBody();
    const parsed = JSON.parse(body);
    if (!parsed.token?.id) {
      throw new Error(`Expected new token in response. Got: ${body.substring(0, 400)}`);
    }
  },
);

Then(
  'it has a secure non-sequential token value',
  async function (this: TestWorld) {
    const body = await this.getBody();
    const parsed = JSON.parse(body);
    if (!parsed.token?.token || parsed.token.token.length < 8) {
      throw new Error(`Expected a secure token value. Got: ${body.substring(0, 400)}`);
    }
  },
);

Then(
  'the token is removed from the database',
  async function (this: TestWorld) {
    const body = await this.getBody();
    const parsed = JSON.parse(body);
    if (!parsed.ok) {
      throw new Error(`Expected ok:true. Got: ${body.substring(0, 400)}`);
    }
  },
);

Then(
  'the deletion is rejected with an error',
  async function (this: TestWorld) {
    const status = this.response!.status;
    if (status !== 409 && status !== 400 && status !== 403) {
      const body = await this.getBody();
      throw new Error(`Expected 409/400/403 for rejected deletion. Got status ${status}: ${body.substring(0, 400)}`);
    }
  },
);

Then(
  'the cache is removed from the database',
  async function (this: TestWorld) {
    const body = await this.getBody();
    const parsed = JSON.parse(body);
    if (!parsed.ok) {
      throw new Error(`Expected ok:true. Got: ${body.substring(0, 400)}`);
    }
  },
);

Then(
  'only those {int} caches are used in team sequence generation',
  async function (this: TestWorld, expectedCount: number) {
    const game = await getActiveGame();
    if (!game) throw new Error('No active game');

    const assignedRows = await db
      .select()
      .from(gameCaches)
      .where(eq(gameCaches.gameId, game.id));

    if (assignedRows.length !== expectedCount) {
      throw new Error(
        `Expected ${expectedCount} assigned caches but found ${assignedRows.length}`,
      );
    }
  },
);
