export const metadata = { title: 'Admin Login' };

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const hasError = Boolean(searchParams.error);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50">
      <div className="max-w-sm w-full space-y-6">
        <h1 className="text-2xl font-bold text-center text-gray-900">Admin Login</h1>

        {hasError && (
          <p className="text-red-600 text-sm text-center bg-red-50 border border-red-200 rounded p-3">
            Incorrect password. Please try again.
          </p>
        )}

        <form action="/api/admin/login" method="post" className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Admin Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Login
          </button>
        </form>
      </div>
    </main>
  );
}
