import { redirect } from 'next/navigation'
import { requireDashboardAccess } from '@/lib/auth/dashboard-access'
import ExtraPage from './ExtraPage'

export default async function AdminExtraRoute() {
  const { role } = await requireDashboardAccess('/backend/admin/extra')
  if (role !== 'admin') {
    redirect('/backend/admin/dashboard')
  }

  return <ExtraPage />
}
