export default function CompletionLoading() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-white">
      <div className="max-w-md w-full text-center space-y-6 animate-pulse">
        <div className="h-16 w-16 rounded-full bg-gray-200 mx-auto" />
        <div className="h-9 bg-gray-200 rounded w-1/2 mx-auto" />
        <div className="h-8 bg-gray-200 rounded w-2/3 mx-auto" />
        <div className="h-5 bg-gray-200 rounded w-3/4 mx-auto" />
        <div className="bg-gray-100 border border-gray-200 rounded-xl p-6 space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto" />
          <div className="h-14 bg-gray-200 rounded w-1/2 mx-auto" />
        </div>
      </div>
    </main>
  );
}
