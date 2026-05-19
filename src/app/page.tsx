export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-white">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-6xl">🗺️</div>
        <h1 className="text-3xl font-bold text-gray-900">QR Code Geocaching Tracker</h1>
        <p className="text-gray-600 text-lg leading-relaxed">
          Scan a QR code to begin or resume your team's hunt.
        </p>
        <p className="text-sm text-gray-400">
          Admin?{' '}
          <a href="/admin" className="text-blue-600 underline hover:text-blue-800">
            Go to admin panel
          </a>
        </p>
      </div>
    </main>
  );
}
