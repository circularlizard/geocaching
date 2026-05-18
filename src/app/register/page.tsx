import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { registrationTokens, teams, games } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: { token?: string | string[] };
}) {
  const tokenValue = Array.isArray(searchParams.token)
    ? searchParams.token[0]
    : searchParams.token;

  if (!tokenValue) {
    return <ErrorPage message="Invalid registration link. No token provided." />;
  }

  const [activeGame] = await db
    .select()
    .from(games)
    .where(eq(games.isActive, true))
    .limit(1);

  if (!activeGame) {
    return <ErrorPage message="No active game found." />;
  }

  const [regToken] = await db
    .select()
    .from(registrationTokens)
    .where(eq(registrationTokens.token, tokenValue))
    .limit(1);

  if (!regToken) {
    return <ErrorPage message="Registration token not found." />;
  }

  const [existingTeam] = await db
    .select()
    .from(teams)
    .where(
      and(
        eq(teams.registrationTokenId, regToken.id),
        eq(teams.gameId, activeGame.id),
      ),
    )
    .limit(1);

  if (existingTeam) {
    redirect(`/clue/${existingTeam.id}`);
  }

  return <RegistrationForm token={tokenValue} />;
}

function RegistrationForm({ token }: { token: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-white">
      <div className="max-w-md w-full space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 text-center">Register Your Team</h1>
        <p className="text-gray-600 text-center">Enter your team details to begin the hunt.</p>

        <form
          id="registration-form"
          className="space-y-4"
          action="/api/register"
          method="POST"
          data-token={token}
        >
          <input type="hidden" name="token" value={token} />

          <div>
            <label htmlFor="teamName" className="block text-sm font-medium text-gray-700 mb-1">
              Team Name <span className="text-red-500">*</span>
            </label>
            <input
              id="teamName"
              name="teamName"
              type="text"
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. The Explorers"
            />
          </div>

          <div>
            <label htmlFor="members" className="block text-sm font-medium text-gray-700 mb-1">
              Team Members <span className="text-red-500">*</span>
              <span className="text-gray-500 font-normal"> (4–8, comma-separated)</span>
            </label>
            <textarea
              id="members"
              name="members"
              required
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Alice, Bob, Carol, Dave"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-bold py-4 rounded-lg text-xl hover:bg-blue-700 active:bg-blue-800 transition-colors"
          >
            Start the Hunt →
          </button>
        </form>
      </div>
    </main>
  );
}

function ErrorPage({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-white">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="text-6xl">❌</div>
        <h1 className="text-2xl font-bold text-red-600">Registration Error</h1>
        <p className="text-gray-700">{message}</p>
      </div>
    </main>
  );
}
