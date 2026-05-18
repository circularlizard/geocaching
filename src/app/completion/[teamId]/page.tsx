import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { teams, progressLogs } from '@/lib/db/schema';
import { eq, sum } from 'drizzle-orm';

export default async function CompletionPage({
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

  const [{ totalPoints }] = await db
    .select({ totalPoints: sum(progressLogs.points) })
    .from(progressLogs)
    .where(eq(progressLogs.teamId, teamId));

  const score = Number(totalPoints ?? 0);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-white">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-6xl">🏆</div>
        <h1 className="text-3xl font-bold text-yellow-600">Congratulations!</h1>
        <h2 className="text-2xl font-semibold text-gray-900">{team.displayName}</h2>
        <p className="text-xl text-gray-700">
          You have completed all caches!
        </p>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <p className="text-sm text-gray-500 uppercase tracking-wide mb-1">Final Score</p>
          <p className="text-5xl font-bold text-yellow-600">{score}</p>
        </div>
        <p className="text-gray-500 text-sm">Return to the start for final rankings.</p>
      </div>
    </main>
  );
}
