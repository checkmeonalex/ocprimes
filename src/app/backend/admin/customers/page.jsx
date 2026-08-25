import { requireAdminOrPublicPage } from '@/lib/auth/require-page-access'
import CustomersPage from '../customer/CustomersPage'

export default async function DashboardDemoCustomersPage() {
  await requireAdminOrPublicPage('customers', '/backend/admin/customers')
  return <CustomersPage />
}
