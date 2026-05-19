export default function ClueLoading() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-6 bg-white">
      <div className="max-w-md w-full space-y-6 animate-pulse">
        <div className="border-b pb-4 flex justify-between items-start">
          <div className="h-8 bg-gray-200 rounded w-1/2" />
          <div className="h-7 bg-gray-200 rounded w-24" />
        </div>
        <div className="space-y-2">
          <div className="h-5 bg-gray-200 rounded w-1/4" />
          <div className="h-6 bg-gray-200 rounded w-full" />
          <div className="h-6 bg-gray-200 rounded w-5/6" />
        </div>
        <div className="space-y-3 pt-2">
          <div className="h-14 bg-gray-200 rounded w-full" />
        </div>
      </div>
    </main>
  );
}
