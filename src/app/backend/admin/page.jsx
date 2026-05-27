import { requireDashboardAccess } from '@/lib/auth/dashboard-access'
import { redirect } from 'next/navigation'

export default async function DashboardDemoLandingPage() {
  await requireDashboardAccess('/backend/admin')
  redirect('/backend/admin/dashboard')
}
