import { requireAdminOrPublicPage } from '@/lib/auth/require-page-access'
import PagesIndexPage from './PagesIndexPage'

export default async function AdminPagesPage() {
  await requireAdminOrPublicPage('pages', '/backend/admin/pages')
  return <PagesIndexPage />
}
