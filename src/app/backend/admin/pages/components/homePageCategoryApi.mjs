const HOME_SLUG = 'home'

const defaultHeaders = {
  'Content-Type': 'application/json',
}

async function requestJson(url, init = {}) {
  const response = await fetch(url, {
    credentials: 'include',
    ...init,
    headers: {
      ...defaultHeaders,
      ...(init.headers || {}),
    },
  })

  const payload = await response.json().catch(() => null)
  return { response, payload }
}

async function listHomeCandidates() {
  const { response, payload } = await requestJson('/api/admin/categories?search=home&per_page=50')
  if (!response.ok) {
    throw new Error(payload?.error || 'Unable to load pages.')
  }

  const items = Array.isArray(payload?.items) ? payload.items : []
  return items.filter((item) => item?.slug === HOME_SLUG)
}

async function createHomeCategory() {
  const { response, payload } = await requestJson('/api/admin/categories', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Home',
      slug: HOME_SLUG,
      description: 'Homepage content and layout',
    }),
  })

  if (response.ok && payload?.item) return payload.item

  if (response.status === 409) {
    const candidates = await listHomeCandidates()
    if (candidates[0]) return candidates[0]
  }

  throw new Error(payload?.error || 'Unable to create Home page.')
}

export async function ensureHomeCategory() {
  const candidates = await listHomeCandidates()
  if (candidates[0]) return candidates[0]
  return createHomeCategory()
}
