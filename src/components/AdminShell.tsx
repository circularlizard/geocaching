'use client';

import { usePathname } from 'next/navigation';
import AdminNav from './AdminNav';

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showNav = pathname !== '/admin/login';

  return (
    <>
      <AdminNav />
      <div className={showNav ? 'pt-14' : ''}>{children}</div>
    </>
  );
}
