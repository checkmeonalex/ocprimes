import { requireAdminOrPublicPage } from '@/lib/auth/require-page-access'
import CategoryTreePage from '../components/CategoryTreePage'

export default async function AdminCategoriesPage() {
  await requireAdminOrPublicPage('categories', '/backend/admin/categories')
  return <CategoryTreePage />
}
