import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getUserRoleInfoSafe } from '@/lib/auth/roles'

export async function requireDashboardAccess(nextPath = '/backend/admin/dashboard') {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`)
  }

  const roleInfo = await getUserRoleInfoSafe(supabase, data.user.id, data.user.email || '')
  if (!roleInfo.isAdmin && !roleInfo.isVendor) {
    redirect('/login?error=forbidden')
  }

  return { user: data.user, role: roleInfo.role }
}
