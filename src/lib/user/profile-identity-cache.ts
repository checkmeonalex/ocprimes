const CACHE_KEY = 'ocp_admin_profile_identity_v1'
const CACHE_TTL_MS = 1000 * 60 * 30
export const PROFILE_IDENTITY_CACHE_UPDATED_EVENT = 'ocp-admin-profile-identity-updated'

const safeString = (value) => (typeof value === 'string' ? value.trim() : '')

const fallbackNameFromEmail = (email) => {
  const normalized = safeString(email)
  if (!normalized.includes('@')) return ''
  return normalized.split('@')[0]
}

export const toProfileIdentity = (payload) => {
  const profile = payload?.profile && typeof payload.profile === 'object' ? payload.profile : {}
  const firstName = safeString(profile?.firstName)
  const lastName = safeString(profile?.lastName)
  const joined = `${firstName} ${lastName}`.trim()
  const email = safeString(payload?.email) || safeString(profile?.contactInfo?.email)

  const displayName =
    safeString(profile?.displayName) ||
    safeString(profile?.authorName) ||
    safeString(profile?.nickname) ||
    joined ||
    fallbackNameFromEmail(email) ||
    'Admin User'

  return {
    displayName,
    email,
    storeLogoUrl:
      safeString(payload?.store_logo_url) ||
      safeString(profile?.storeLogoUrl) ||
      safeString(profile?.store_logo_url),
    avatarUrl: safeString(payload?.avatar_url),
  }
}

export const getProfileIdentityImageUrl = (identity) =>
  safeString(identity?.storeLogoUrl) || safeString(identity?.avatarUrl)

export const getProfileIdentityInitials = (displayName) => {
  const normalized = safeString(displayName)
  if (!normalized) return 'AU'
  const parts = normalized.split(/\s+/).filter(Boolean)
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase() || 'AU'
}

export const readProfileIdentityCache = () => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const expiresAt = Number(parsed?.expiresAt || 0)
    if (!expiresAt || Date.now() > expiresAt) {
      window.localStorage.removeItem(CACHE_KEY)
      return null
    }
    const data = parsed?.data && typeof parsed.data === 'object' ? parsed.data : null
    if (!data) return null
    return toProfileIdentity({
      profile: {
        displayName: data.displayName,
        storeLogoUrl: data.storeLogoUrl,
      },
      email: data.email,
      avatar_url: data.avatarUrl,
      store_logo_url: data.storeLogoUrl,
    })
  } catch {
    return null
  }
}

export const writeProfileIdentityCache = (identity) => {
  if (typeof window === 'undefined') return
  try {
    const next = {
      displayName: safeString(identity?.displayName) || 'Admin User',
      email: safeString(identity?.email),
      storeLogoUrl: safeString(identity?.storeLogoUrl),
      avatarUrl: safeString(identity?.avatarUrl),
    }
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        data: next,
        expiresAt: Date.now() + CACHE_TTL_MS,
      }),
    )
    window.dispatchEvent(new CustomEvent(PROFILE_IDENTITY_CACHE_UPDATED_EVENT, { detail: next }))
  } catch {
    // ignore storage errors
  }
}

export const clearProfileIdentityCache = () => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(CACHE_KEY)
    window.dispatchEvent(new CustomEvent(PROFILE_IDENTITY_CACHE_UPDATED_EVENT, { detail: null }))
  } catch {
    // ignore storage errors
  }
}
