export type RecentlyViewedItem = {
  id: string
  slug: string
  name: string
  image: string
  price: number
  originalPrice?: number | null
  stock?: number | null
  vendor?: string | null
  vendorFont?: string | null
  viewedAt: number
}

const STORAGE_KEY = 'ocprimes_recently_viewed'
const MAX_ITEMS = 30

const safeParse = (value: string | null) => {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export const getRecentlyViewed = () => {
  if (typeof window === 'undefined') return []
  const raw = window.localStorage.getItem(STORAGE_KEY)
  return safeParse(raw)
}

export const setRecentlyViewed = (items: RecentlyViewedItem[]) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export const removeRecentlyViewed = (slugs: string[]) => {
  if (!Array.isArray(slugs) || slugs.length === 0) return getRecentlyViewed()
  const existing = getRecentlyViewed()
  const toRemove = new Set(slugs)
  const next = existing.filter((entry) => !toRemove.has(entry?.slug))
  setRecentlyViewed(next)
  return next
}

export const clearRecentlyViewed = () => {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STORAGE_KEY)
}

export const addRecentlyViewed = (
  item: Omit<RecentlyViewedItem, 'viewedAt'>,
) => {
  if (!item?.id || !item?.slug) return []
  const existing = getRecentlyViewed()
  const filtered = existing.filter(
    (entry) => entry?.id !== item.id && entry?.slug !== item.slug,
  )
  const next = [
    { ...item, viewedAt: Date.now() },
    ...filtered,
  ].slice(0, MAX_ITEMS)
  setRecentlyViewed(next)
  return next
}
