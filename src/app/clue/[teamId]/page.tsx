import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { teams, caches, teamSequences } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export default async function CluePage({
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

  const [currentSequence] = await db
    .select()
    .from(teamSequences)
    .where(
      and(
        eq(teamSequences.teamId, team.id),
        eq(teamSequences.sequenceOrder, team.currentCacheIndex),
      ),
    )
    .limit(1);

  if (!currentSequence) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-white">
        <div className="max-w-md w-full text-center space-y-4">
          <h1 className="text-2xl font-bold text-gray-800">All caches complete!</h1>
        </div>
      </main>
    );
  }

  const [cache] = await db
    .select()
    .from(caches)
    .where(eq(caches.id, currentSequence.cacheId))
    .limit(1);

  if (!cache) notFound();

  const members: string[] = JSON.parse(team.members);

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-6 bg-white">
      <div className="max-w-md w-full space-y-6">
        <div className="border-b pb-4">
          <h1 className="text-2xl font-bold text-gray-900">{team.displayName}</h1>
          <p className="text-sm text-gray-500">
            {members.join(', ')} &mdash; Cache {team.currentCacheIndex + 1} of{' '}
            {/* total shown in Phase 3 */}
          </p>
        </div>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-blue-700 uppercase tracking-wide">
            Clue 1
          </h2>
          <p className="text-xl text-gray-800 leading-relaxed">{cache.clue1Text}</p>
        </section>
      </div>
    </main>
  );
}
