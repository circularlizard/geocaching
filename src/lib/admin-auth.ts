import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const ADMIN_COOKIE_NAME = 'admin_auth';
export const ADMIN_COOKIE_VALUE = 'authenticated';

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD ?? '';
}

export function isAdminAuthenticated(): boolean {
  const cookieStore = cookies();
  const auth = cookieStore.get(ADMIN_COOKIE_NAME);
  return auth?.value === ADMIN_COOKIE_VALUE;
}

export function requireAdminAuth(): void {
  if (!isAdminAuthenticated()) {
    redirect('/admin/login');
  }
}
