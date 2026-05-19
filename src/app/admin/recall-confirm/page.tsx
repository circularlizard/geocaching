import { requireAdminAuth } from '@/lib/admin-auth';

export default function RecallConfirmPage() {
  requireAdminAuth();

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Are you sure?</h1>
        <p className="text-gray-600">
          This will trigger a recall for all teams. Every subsequent QR scan will show a
          game-over page. This action cannot be undone.
        </p>
        <div className="flex gap-4">
          <form action="/api/admin/recall" method="POST" className="flex-1">
            <button
              type="submit"
              className="w-full px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700"
            >
              Yes, Recall All Teams
            </button>
          </form>
          <a
            href="/admin/dashboard"
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 text-center"
          >
            Cancel
          </a>
        </div>
      </div>
    </main>
  );
}
