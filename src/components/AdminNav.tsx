'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Scoreboard' },
  { href: '/admin/setup', label: 'Game Setup' },
  { href: '/admin/caches', label: 'Geocaches' },
  { href: '/admin/tokens', label: 'Team QRs' },
];

export default function AdminNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (pathname === '/admin/login') return null;

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  return (
    <nav
      className="fixed top-0 inset-x-0 z-50 h-14 bg-[#363e78] text-white print:hidden"
      aria-label="Admin navigation"
    >
      <div className="flex items-center h-14 px-4 max-w-6xl mx-auto gap-2">
        <a
          href="/admin/dashboard"
          className="font-bold text-sm shrink-0 text-white hover:text-gray-300 mr-4 flex items-center gap-2 h-full"
        >
          <img
            src="/borestane-shield.svg"
            alt=""
            className="h-8 w-auto"
          />
          Bore Stane Geocache
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center h-full gap-1 flex-1">
          {NAV_ITEMS.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                isActive(href)
                  ? 'bg-white text-gray-900'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              {label}
            </a>
          ))}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden ml-auto p-2 rounded hover:bg-gray-700 text-xl leading-none"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden bg-[#2d3468] border-t border-[#4a5290] px-4 py-3 space-y-1">
          {NAV_ITEMS.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive(href)
                  ? 'bg-white text-gray-900'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              {label}
            </a>
          ))}
        </div>
      )}
    </nav>
  );
}
