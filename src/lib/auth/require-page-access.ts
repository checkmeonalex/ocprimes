import { redirect } from 'next/navigation'
import { requireDashboardAccess } from '@/lib/auth/dashboard-access'
import { isNavKeyPublic, type ToggleableNavKey } from '@/lib/admin/page-visibility'

// Server-side gate for a page that is admin-only UNLESS an admin has marked
// its nav_key public for vendors via /admin/permissions. Use this instead of
// a bare requireDashboardAccess() call on any route whose sidebar entry
// carries adminOnly + navKey (AdminSidebar.jsx) — this is what makes the
// toggle actually enforce access, not just hide the nav link.
export async function requireAdminOrPublicPage(navKey: ToggleableNavKey, nextPath: string) {
  const { role, user } = await requireDashboardAccess(nextPath)
  if (role === 'admin') {
    return { role, user }
  }

  const isPublic = await isNavKeyPublic(navKey)
  if (!isPublic) {
    redirect('/backend/admin/dashboard')
  }

  return { role, user }
}
