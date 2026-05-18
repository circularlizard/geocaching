import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { games, registrationTokens, teams, caches } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export default async function ScanPage({
  searchParams,
}: {
  searchParams: { id?: string | string[] };
}) {
  const tokenId = Array.isArray(searchParams.id)
    ? searchParams.id[0]
    : searchParams.id;

  if (!tokenId) {
    return <ErrorPage />;
  }

  const [activeGame] = await db
    .select()
    .from(games)
    .where(eq(games.isActive, true))
    .limit(1);

  if (!activeGame) {
    return <ErrorPage />;
  }

  const now = new Date();
  if (activeGame.adminRecallTriggered || activeGame.gameEndTime <= now) {
    return <GameOverPage />;
  }

  const [regToken] = await db
    .select()
    .from(registrationTokens)
    .where(eq(registrationTokens.token, tokenId))
    .limit(1);

  if (regToken) {
    const [team] = await db
      .select()
      .from(teams)
      .where(
        and(
          eq(teams.registrationTokenId, regToken.id),
          eq(teams.gameId, activeGame.id),
        ),
      )
      .limit(1);

    if (team) {
      redirect(`/clue/${team.id}`);
    } else {
      redirect(`/register?token=${tokenId}`);
    }
  }

  const [cache] = await db
    .select()
    .from(caches)
    .where(eq(caches.cacheToken, tokenId))
    .limit(1);

  if (cache) {
    redirect(`/found/${tokenId}`);
  }

  return <ErrorPage />;
}

function ErrorPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-white">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="text-6xl">❓</div>
        <h1 className="text-2xl font-bold text-red-600">Code Not Recognised</h1>
        <p className="text-gray-700">
          This QR code is not recognised. Please try scanning again or ask an
          organiser for help.
        </p>
      </div>
    </main>
  );
}

function GameOverPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-white">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="text-6xl">🏁</div>
        <h1 className="text-2xl font-bold text-gray-800">Game Over</h1>
        <p className="text-gray-700">
          The game has ended. Thank you for playing — please make your way back
          to the start.
        </p>
      </div>
    </main>
  );
}
