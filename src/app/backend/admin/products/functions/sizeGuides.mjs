const resolveApiErrorMessage = (result, fallback) => result?.error || result?.message || fallback

export const fetchSizeGuides = async ({ page = 1, perPage = 50, search = '' } = {}) => {
  const params = new URLSearchParams({ page: String(page), per_page: String(perPage) })
  if (search) params.set('search', search)

  const response = await fetch(`/api/admin/size-guides?${params.toString()}`, {
    credentials: 'include',
  })
  const result = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(resolveApiErrorMessage(result, 'Unable to load size guides.'))
  }
  return result?.items || []
}

export const createSizeGuide = async (payload) => {
  const response = await fetch('/api/admin/size-guides', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  const result = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(resolveApiErrorMessage(result, 'Unable to create size guide.'))
  }
  return result?.item
}

export const updateSizeGuide = async ({ id, ...updates }) => {
  const response = await fetch('/api/admin/size-guides', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ id, ...updates }),
  })
  const result = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(resolveApiErrorMessage(result, 'Unable to update size guide.'))
  }
  return result?.item
}

export const deleteSizeGuide = async (id) => {
  const response = await fetch(`/api/admin/size-guides/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  const result = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(resolveApiErrorMessage(result, 'Unable to delete size guide.'))
  }
  return result
}
