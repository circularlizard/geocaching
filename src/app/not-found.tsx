export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-white">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="text-6xl">❓</div>
        <h1 className="text-2xl font-bold text-gray-800">Page Not Found</h1>
        <p className="text-gray-700">
          This page does not exist. Please check your QR code and try again.
        </p>
        <a
          href="/"
          className="inline-block bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Go to Home
        </a>
      </div>
    </main>
  );
}
