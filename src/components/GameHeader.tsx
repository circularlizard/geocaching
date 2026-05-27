export default function GameHeader() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 h-14 bg-[#363e78] text-white print:hidden flex items-center px-4">
      <a
        href="/"
        className="flex items-center gap-2 font-bold text-sm text-white hover:text-blue-200 transition-colors"
      >
        <img src="/borestane-shield.svg" alt="" className="h-8 w-auto" />
        Bore Stane Geocache
      </a>
    </header>
  );
}
