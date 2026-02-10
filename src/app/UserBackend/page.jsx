import AccountLandingPage from '@/components/user-backend/AccountLandingPage'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const getDisplayName = (user) => {
  const fullName = user?.user_metadata?.full_name
  if (fullName) return fullName
  const email = user?.email || ''
  const [local] = email.split('@')
  return local || 'User'
}

const getLocation = (user) => {
  const meta = user?.user_metadata || {}
  const city = typeof meta.city === 'string' ? meta.city.trim() : ''
  const country = typeof meta.country === 'string' ? meta.country.trim() : ''
  if (city && country) return `${city}, ${country}`
  if (country) return country
  return 'Location not set'
}

const getDashboardAccess = async (supabase, userId) => {
  if (!userId) return { shopHref: '/UserBackend/shop-access' }

  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('Role lookup failed for account landing:', error.message)
    return { shopHref: '/UserBackend/shop-access' }
  }

  const role = String(data?.role || '').toLowerCase()
  if (role === 'admin' || role === 'vendor') {
    return { shopHref: '/backend/admin/dashboard' }
  }
  return { shopHref: '/UserBackend/shop-access' }
}

export default async function UserBackendHome() {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.getUser()
  const user = error ? null : data?.user || null
  const { shopHref } = await getDashboardAccess(supabase, user?.id)

  return (
    <div className='-m-3 md:-m-4 lg:-m-5'>
      <AccountLandingPage
        displayName={getDisplayName(user)}
        email={user?.email || ''}
        location={getLocation(user)}
        isSignedIn={Boolean(user)}
        shopHref={shopHref}
      />
    </div>
  )
}
