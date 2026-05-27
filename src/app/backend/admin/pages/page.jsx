import { redirect } from 'next/navigation'
import { requireDashboardAccess } from '@/lib/auth/dashboard-access'
import PagesIndexPage from './PagesIndexPage'

export default async function AdminPagesPage() {
  const { role } = await requireDashboardAccess('/backend/admin/pages')
  if (role !== 'admin') {
    redirect('/backend/admin/dashboard')
  }

  return <PagesIndexPage />
}
