import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getUserRoleInfoSafe } from '@/lib/auth/roles'
import SellerSignupPage from '@/components/auth/seller/SellerSignupPage'

export default async function SellerSignupRoute() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data } = await supabase.auth.getUser()
    if (data?.user) {
      const role = await getUserRoleInfoSafe(supabase, data.user.id, data.user.email || '')
      if (role.isVendor || role.isAdmin) {
        redirect('/backend/admin/dashboard')
      }
    }
  } catch {
    // not authenticated — render the page normally
  }

  return <SellerSignupPage />
}
