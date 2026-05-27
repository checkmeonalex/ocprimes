import CustomerAuthPage from '@/components/auth/customer/CustomerAuthPage'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

export default async function SignupPage() {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.getUser()
  const user = error ? null : data?.user || null

  if (user) {
    redirect('/account')
  }

  return (
    <Suspense fallback={null}>
      <CustomerAuthPage />
    </Suspense>
  )
}
