'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface AutoRefreshProps {
  intervalMs?: number;
}

export default function AutoRefresh({ intervalMs = 10000 }: AutoRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return <span data-auto-refresh="true" className="sr-only" />;
}
