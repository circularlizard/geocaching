import { db } from '@/lib/db';
import { caches, games, teams, teamSequences, progressLogs } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { cookies } from 'next/headers';
import type { Team } from '@/lib/db/schema';

export const metadata = { title: 'Geocache Found!' };

async function findTeamsExpectedAtCache(cacheId: number, gameId: number): Promise<Team[]> {
  const seqs = await db
    .select()
    .from(teamSequences)
    .where(eq(teamSequences.cacheId, cacheId));

  const result: Team[] = [];
  for (const seq of seqs) {
    const [team] = await db
      .select()
      .from(teams)
      .where(
        and(
          eq(teams.id, seq.teamId),
          eq(teams.gameId, gameId),
          eq(teams.currentCacheIndex, seq.sequenceOrder),
        ),
      )
      .limit(1);
    if (team) result.push(team);
  }
  return result;
}

export default async function FoundPage({
  params,
  searchParams,
}: {
  params: { cacheToken: string };
  searchParams: { teamId?: string };
}) {
  const { cacheToken } = params;

  const [cache] = await db
    .select()
    .from(caches)
    .where(eq(caches.cacheToken, cacheToken))
    .limit(1);

  if (!cache) {
    return <ErrorPage message="This QR code is not recognised." />;
  }

  const [activeGame] = await db
    .select()
    .from(games)
    .where(eq(games.isActive, true))
    .limit(1);

  if (!activeGame) {
    return <ErrorPage message="No active game." />;
  }

  const now = new Date();
  if (activeGame.adminRecallTriggered || activeGame.gameEndTime <= now) {
    return <ErrorPage message="The game has ended. Thank you for playing!" />;
  }

  // --- Resolve team identity ---
  // Priority 1: explicit ?teamId= from the team picker (user confirmed who they are)
  const paramTeamId = searchParams.teamId ? parseInt(searchParams.teamId, 10) : null;

  // Priority 2: geocache_team cookie (reliable only when the team is actually expected here)
  const teamCookie = cookies().get('geocache_team')?.value;
  const cookieTeamId = teamCookie ? parseInt(teamCookie, 10) : null;

  // Find all teams currently expected at this cache
  const expectedTeams = await findTeamsExpectedAtCache(cache.id, activeGame.id);
  const expectedIds = new Set(expectedTeams.map((t) => t.id));

  // Resolve the confirmed team (param takes priority, then cookie if valid for this cache)
  let confirmedTeam: Team | null = null;

  if (paramTeamId && !isNaN(paramTeamId)) {
    confirmedTeam = expectedTeams.find((t) => t.id === paramTeamId) ?? null;
    // If param ID isn't in the expected list, it might be a wrong-cache scan — handle below
    if (!confirmedTeam) {
      const [paramTeam] = await db
        .select()
        .from(teams)
        .where(and(eq(teams.id, paramTeamId), eq(teams.gameId, activeGame.id)))
        .limit(1);
      if (paramTeam) {
        return (
          <WrongCachePage teamId={paramTeam.id} />
        );
      }
    }
  } else if (cookieTeamId && !isNaN(cookieTeamId)) {
    if (expectedIds.has(cookieTeamId)) {
      // Cookie team is expected here — trust it
      confirmedTeam = expectedTeams.find((t) => t.id === cookieTeamId) ?? null;
    } else {
      // Cookie team exists but this isn't their cache — show wrong cache warning
      const [cookieTeam] = await db
        .select()
        .from(teams)
        .where(and(eq(teams.id, cookieTeamId), eq(teams.gameId, activeGame.id)))
        .limit(1);
      if (cookieTeam) {
        return <WrongCachePage teamId={cookieTeam.id} />;
      }
    }
  }

  // No confirmed team yet — show picker if multiple teams expected, or use sole expected team
  if (!confirmedTeam) {
    if (expectedTeams.length === 0) {
      return <ErrorPage message="This is not your next geocache. Scan your registration QR card to return to your current clue." />;
    }
    if (expectedTeams.length === 1) {
      confirmedTeam = expectedTeams[0];
    } else {
      // Multiple teams could be here — ask them to identify themselves
      return <TeamPicker cacheToken={cacheToken} teams={expectedTeams} />;
    }
  }

  const team = confirmedTeam;

  const [existingLog] = await db
    .select()
    .from(progressLogs)
    .where(
      and(
        eq(progressLogs.teamId, team.id),
        eq(progressLogs.cacheId, cache.id),
      ),
    )
    .limit(1);

  if (!existingLog) {
    await db.insert(progressLogs).values({
      teamId: team.id,
      cacheId: cache.id,
      foundTimestamp: new Date(),
    });
  } else if (!existingLog.foundTimestamp) {
    await db
      .update(progressLogs)
      .set({ foundTimestamp: new Date() })
      .where(eq(progressLogs.id, existingLog.id));
  }

  const potentialPoints = !existingLog
    ? 5
    : existingLog.clue3RequestedTimestamp
      ? 1
      : existingLog.clue2RequestedTimestamp
        ? 3
        : 5;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-white">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="text-6xl">🎉</div>
        <h1 className="text-3xl font-bold text-green-700">Geocache Found!</h1>
        <p className="text-lg text-gray-700">
          Well done, <span className="font-semibold">{team.displayName}</span>! You found the geocache.
        </p>
        <div className="bg-green-50 border border-green-200 rounded-lg py-3 px-4">
          <p className="text-green-800 font-semibold text-lg">
            🏆 You will earn{' '}
            <span className="text-2xl">{potentialPoints}</span>{' '}
            point{potentialPoints !== 1 ? 's' : ''} for this geocache!
          </p>
        </div>
        <p className="text-gray-600">
          Please replace the geocache box exactly as you found it, then confirm below.
        </p>

        <form action={`/api/cache/${cacheToken}/confirm`} method="post">
          <input type="hidden" name="teamId" value={team.id} />
          <button
            type="submit"
            className="w-full bg-green-600 text-white font-bold py-4 rounded-lg text-xl hover:bg-green-700 transition-colors"
          >
            ✓ I have replaced the geocache box
          </button>
        </form>
      </div>
    </main>
  );
}

function TeamPicker({ cacheToken, teams: teamList }: { cacheToken: string; teams: Team[] }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-white">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="text-6xl">👋</div>
        <h1 className="text-2xl font-bold text-gray-900">Which team are you?</h1>
        <p className="text-gray-600">Tap your team name to continue.</p>
        <div className="space-y-3">
          {teamList.map((team) => (
            <a
              key={team.id}
              href={`/found/${cacheToken}?teamId=${team.id}`}
              className="block w-full bg-blue-600 text-white font-bold py-4 rounded-lg text-lg hover:bg-blue-700 transition-colors"
            >
              {team.displayName}
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}

function WrongCachePage({ teamId }: { teamId: number }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-white">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="text-6xl">⚠️</div>
        <h1 className="text-2xl font-bold text-red-600">Wrong Geocache!</h1>
        <p className="text-gray-700">This isn&apos;t your next geocache. Head back to your current clue.</p>
        <a
          href={`/clue/${teamId}`}
          className="inline-block mt-4 w-full bg-blue-600 text-white font-bold py-4 rounded-lg text-lg hover:bg-blue-700 transition-colors"
        >
          Return to my clue →
        </a>
      </div>
    </main>
  );
}

function ErrorPage({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-white">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="text-6xl">⚠️</div>
        <h1 className="text-2xl font-bold text-red-600">Oops!</h1>
        <p className="text-gray-700">{message}</p>
      </div>
    </main>
  );
}
