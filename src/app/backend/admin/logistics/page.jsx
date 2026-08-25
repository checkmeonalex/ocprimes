import { requireAdminOrPublicPage } from '@/lib/auth/require-page-access'
import LogisticsPage from '../LogisticsPage'

export default async function AdminLogisticsRoutePage() {
  await requireAdminOrPublicPage('logistics', '/backend/admin/logistics')
  return <LogisticsPage />
}
