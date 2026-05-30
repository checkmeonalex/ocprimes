import CustomerAuthPage from '@/components/auth/customer/CustomerAuthPage'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { resolveSafeNextPath } from '@/lib/auth/navigation'

export default async function LoginPage({ searchParams }) {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.getUser()
  const user = error ? null : data?.user || null

  if (user) {
    const params = await searchParams
    const next = resolveSafeNextPath(params?.next)
    redirect(next || '/account')
  }

  return (
    <Suspense fallback={null}>
      <CustomerAuthPage />
    </Suspense>
  )
}
