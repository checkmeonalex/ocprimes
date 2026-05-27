import { requireDashboardAccess } from '@/lib/auth/dashboard-access'
import DashboardPage from '../DashboardPage';

export default async function DashboardDemoDashboardPage() {
  await requireDashboardAccess('/backend/admin/dashboard')
  return <DashboardPage />;
}
