'use client';

import { useEffect } from 'react';

export default function SetTeamCookie({ teamId }: { teamId: number }) {
  useEffect(() => {
    document.cookie = `geocache_team=${teamId}; path=/; SameSite=Lax; max-age=86400`;
  }, [teamId]);

  return null;
}
