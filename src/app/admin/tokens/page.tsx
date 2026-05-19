import { requireAdminAuth } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { registrationTokens, teams, games } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import QRCode from 'qrcode';
import PrintButton from '@/components/PrintButton';
import { AddTokenButton, DeleteTokenButton } from './TokenActions';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export default async function AdminTokensPage() {
  requireAdminAuth();

  const [activeGame] = await db
    .select()
    .from(games)
    .where(eq(games.isActive, true))
    .limit(1);

  const allTokens = await db.select().from(registrationTokens);

  const tokenData = await Promise.all(
    allTokens.map(async (token) => {
      const usedInGame = activeGame
        ? await db
            .select()
            .from(teams)
            .where(
              and(
                eq(teams.registrationTokenId, token.id),
                eq(teams.gameId, activeGame.id),
              ),
            )
            .limit(1)
        : [];
      const url = `${APP_URL}/scan?id=${token.token}`;
      const svg = await QRCode.toString(url, { type: 'svg', margin: 1 });
      return { token, used: usedInGame.length > 0, url, svg };
    }),
  );

  return (
    <main className="min-h-screen bg-white p-8 print:p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Registration Tokens</h1>
            {activeGame && (
              <p className="text-sm text-gray-500 mt-1">
                Game: <strong>{activeGame.name}</strong>
              </p>
            )}
          </div>
          <div className="flex gap-3 items-center flex-wrap">
            <AddTokenButton />
            <PrintButton />
            <a href="/admin/dashboard" className="text-blue-600 hover:underline text-sm">
              ← Dashboard
            </a>
          </div>
        </div>

        {tokenData.length === 0 && (
          <p className="text-gray-400">No registration tokens found.</p>
        )}

        <div className="grid grid-cols-2 gap-6 print:gap-4">
          {tokenData.map(({ token, used, url, svg }) => (
            <div
              key={token.id}
              className="border border-gray-300 rounded-xl p-6 text-center space-y-3 print:border-black print:rounded-none print:break-inside-avoid"
            >
              <div className="flex justify-between items-center print:hidden">
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${
                    used ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {used ? 'Used' : 'Unused'}
                </span>
                {!used && <DeleteTokenButton tokenId={token.id} />}
              </div>
              <div
                className="w-48 h-48 mx-auto"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
              <p className="font-mono text-xs text-gray-700 break-all">{token.token}</p>
              <p className="text-xs text-gray-400 break-all font-mono">{url}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
