import AccountLandingPage from '@/components/user-backend/AccountLandingPage'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const getDisplayName = (user) => {
  const fullName = user?.user_metadata?.full_name
  if (fullName) return fullName
  const email = user?.email || ''
  const [local] = email.split('@')
  return local || 'User'
}

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '')

const getDefaultDeliveryAddress = (profile) => {
  const addresses = Array.isArray(profile?.addresses)
    ? profile.addresses.filter((item) => item && typeof item === 'object')
    : []
  const preferred = addresses.find((item) => item.isDefault) || addresses[0] || null
  if (preferred) return preferred
  if (profile?.deliveryAddress && typeof profile.deliveryAddress === 'object') {
    return profile.deliveryAddress
  }
  return null
}

const getLocation = (user) => {
  const profile =
    user?.user_metadata?.profile && typeof user.user_metadata.profile === 'object'
      ? user.user_metadata.profile
      : {}
  const address = getDefaultDeliveryAddress(profile)
  const city = normalizeText(address?.city)
  const state = normalizeText(address?.state)
  if (city && state) return `${city}, ${state}`
  if (city) return city
  if (state) return state
  return 'Location not set'
}

const ROLE_LABELS = {
  admin: 'Admin',
  vendor: 'Seller',
  seller: 'Seller',
  customer: 'Customer',
}

const getDashboardAccess = async (supabase, userId) => {
  if (!userId) {
    return { shopHref: '/UserBackend/shop-access', canAccessShopDashboard: false, roleLabel: ROLE_LABELS.customer }
  }

  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('Role lookup failed for account landing:', error.message)
    return { shopHref: '/UserBackend/shop-access', canAccessShopDashboard: false, roleLabel: ROLE_LABELS.customer }
  }

  const role = String(data?.role || '').toLowerCase()
  const roleLabel = ROLE_LABELS[role] || ROLE_LABELS.customer
  if (role === 'admin' || role === 'vendor' || role === 'seller') {
    return { shopHref: '/backend/admin/dashboard', canAccessShopDashboard: true, roleLabel }
  }
  return { shopHref: '/UserBackend/shop-access', canAccessShopDashboard: false, roleLabel }
}

export default async function UserBackendHome() {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.getUser()
  const user = error ? null : data?.user || null
  const { shopHref, canAccessShopDashboard, roleLabel } = await getDashboardAccess(supabase, user?.id)

  return (
    <div className='m-0'>
      <AccountLandingPage
        displayName={getDisplayName(user)}
        email={user?.email || ''}
        location={getLocation(user)}
        isSignedIn={Boolean(user)}
        shopHref={shopHref}
        showShopAction={canAccessShopDashboard}
        bimojiCharacterId={String(user?.user_metadata?.bimoji_character || '')}
        roleLabel={roleLabel}
      />
    </div>
  )
}
