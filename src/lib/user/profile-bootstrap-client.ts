type UserProfilePayload = Record<string, any> | null

const BOOTSTRAP_CACHE_TTL_MS = 30_000

let cachedPayload: UserProfilePayload = null
let cachedAt = 0
let inFlightRequest: Promise<UserProfilePayload> | null = null

const isCacheFresh = () =>
  Boolean(cachedPayload && Date.now() - cachedAt < BOOTSTRAP_CACHE_TTL_MS)

const storePayload = (payload: UserProfilePayload) => {
  cachedPayload = payload
  cachedAt = payload ? Date.now() : 0
}

const fetchUserProfile = async (): Promise<UserProfilePayload> => {
  const response = await fetch('/api/user/profile', {
    method: 'GET',
    cache: 'no-store',
    credentials: 'include',
  })

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      storePayload(null)
    }
    return null
  }

  const payload = await response.json().catch(() => null)
  if (!payload || typeof payload !== 'object') {
    return null
  }
  storePayload(payload)
  return payload
}

export const loadUserProfileBootstrap = async ({
  force = false,
}: {
  force?: boolean
} = {}): Promise<UserProfilePayload> => {
  if (!force && isCacheFresh()) {
    return cachedPayload
  }

  if (!force && inFlightRequest) {
    return inFlightRequest
  }

  const request = fetchUserProfile()
    .catch(() => null)
    .finally(() => {
      if (inFlightRequest === request) {
        inFlightRequest = null
      }
    })

  inFlightRequest = request
  return request
}

export const primeUserProfileBootstrap = (payload: UserProfilePayload) => {
  if (!payload || typeof payload !== 'object') return
  storePayload(payload)
}

export const invalidateUserProfileBootstrap = () => {
  storePayload(null)
  inFlightRequest = null
}
