import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { teams } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { teamId: string } }): Promise<Metadata> {
  const teamId = parseInt(params.teamId, 10);
  if (isNaN(teamId)) return { title: 'Skip Geocache' };
  const [team] = await db.select({ displayName: teams.displayName }).from(teams).where(eq(teams.id, teamId)).limit(1);
  return { title: team ? `Skip Geocache — ${team.displayName}` : 'Skip Geocache' };
}

export default async function SkipConfirmPage({
  params,
}: {
  params: { teamId: string };
}) {
  const teamId = parseInt(params.teamId, 10);
  if (isNaN(teamId)) notFound();

  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  if (!team) notFound();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-white">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="text-6xl">❓</div>
        <h1 className="text-2xl font-bold text-gray-900">Are you sure?</h1>
        <p className="text-gray-700">
          If you cannot find the geocache, you will score <strong>0 points</strong> for this one and
          move on to the next geocache.
        </p>

        <div className="flex gap-3 pt-2">
          <a
            href={`/clue/${teamId}`}
            className="flex-1 text-center bg-gray-100 text-gray-800 font-semibold py-4 rounded-lg text-lg hover:bg-gray-200 transition-colors border border-gray-300"
          >
            Cancel
          </a>

          <form
            action={`/api/clue/${teamId}/skip-confirm`}
            method="post"
            className="flex-1"
          >
            <button
              type="submit"
              className="w-full bg-red-600 text-white font-bold py-4 rounded-lg text-lg hover:bg-red-700 transition-colors"
            >
              Confirm
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
