import { redirect } from 'next/navigation'
import { requireDashboardAccess } from '@/lib/auth/dashboard-access'
import PermissionsPage from './PermissionsPage'

export default async function AdminPermissionsRoute() {
  const { role } = await requireDashboardAccess('/backend/admin/permissions')
  if (role !== 'admin') {
    redirect('/backend/admin/dashboard')
  }

  return <PermissionsPage />
}
