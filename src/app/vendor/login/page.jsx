import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getUserRoleInfoSafe } from '@/lib/auth/roles'
import SellerLoginPage from '@/components/auth/seller/SellerLoginPage'

export default async function VendorLoginPage() {
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

  return (
    <Suspense fallback={null}>
      <SellerLoginPage />
    </Suspense>
  )
}
