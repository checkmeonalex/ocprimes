import { requireAdminOrPublicPage } from '@/lib/auth/require-page-access'
import ExtraPage from './ExtraPage'

export default async function AdminExtraRoute() {
  await requireAdminOrPublicPage('extra', '/backend/admin/extra')
  return <ExtraPage />
}
