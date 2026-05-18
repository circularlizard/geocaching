import { redirect } from 'next/navigation';
import { isAdminAuthenticated } from '@/lib/admin-auth';

export default function AdminRootPage() {
  if (isAdminAuthenticated()) {
    redirect('/admin/dashboard');
  } else {
    redirect('/admin/login');
  }
}
