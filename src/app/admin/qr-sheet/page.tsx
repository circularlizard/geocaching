import { requireAdminAuth } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { registrationTokens, games } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import QRCode from 'qrcode';
import PrintButton from '@/components/PrintButton';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export default async function AdminQrSheetPage() {
  requireAdminAuth();

  const [activeGame] = await db
    .select()
    .from(games)
    .where(eq(games.isActive, true))
    .limit(1);

  const allTokens = await db.select().from(registrationTokens);

  const tokenLinks = await Promise.all(
    allTokens.map(async (t) => {
      const url = `${APP_URL}/scan?id=${t.token}`;
      const svg = await QRCode.toString(url, { type: 'svg', margin: 1 });
      return { token: t.token, url, svg };
    }),
  );

  return (
    <main className="min-h-screen bg-white p-8 print:p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between print:hidden">
          <h1 className="text-2xl font-bold text-gray-900">QR Code Print Sheet</h1>
          <PrintButton />
        </div>
        {activeGame && (
          <p className="text-gray-600 print:text-black">
            Game: <strong>{activeGame.name}</strong>
          </p>
        )}

        <div className="grid grid-cols-2 gap-6 print:gap-4">
          {tokenLinks.map(({ token, url, svg }) => (
            <div
              key={token}
              className="border border-gray-300 rounded-xl p-6 text-center space-y-3 print:border-black print:rounded-none print:break-inside-avoid"
            >
              <div
                className="w-48 h-48 mx-auto"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
              <p className="font-mono text-xs text-gray-700 break-all">{token}</p>
              <p className="text-xs text-gray-500 break-all">
                <span className="font-mono">{url}</span>
              </p>
            </div>
          ))}
        </div>

        {tokenLinks.length === 0 && (
          <p className="text-gray-400">No registration tokens found.</p>
        )}

      </div>
    </main>
  );
}
