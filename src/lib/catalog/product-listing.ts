import { headers } from 'next/headers'

const buildProductsUrl = async ({ category, tag, vendor, page, perPage, search }) => {
  const host = (await headers()).get('host') || 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  })

  if (category) {
    params.set('category', category)
  }
  if (tag) {
    params.set('tag', tag)
  }
  if (search) {
    params.set('search', search)
  }
  if (vendor) {
    params.set('vendor', vendor)
  }

  return `${protocol}://${host}/api/products?${params.toString()}`
}

export const fetchProductListing = async ({
  category = '',
  tag = '',
  vendor = '',
  page = 1,
  perPage = 12,
  search = '',
} = {}) => {
  const response = await fetch(
    await buildProductsUrl({ category, tag, vendor, page, perPage, search }),
    {
      cache: 'no-store',
    },
  )
  const payload = await response.json().catch(() => null)
  return Array.isArray(payload?.items) ? payload.items : []
}

export const fetchProductListingPayload = async ({
  category = '',
  tag = '',
  vendor = '',
  page = 1,
  perPage = 12,
  search = '',
} = {}) => {
  const response = await fetch(
    await buildProductsUrl({ category, tag, vendor, page, perPage, search }),
    {
      cache: 'no-store',
    },
  )
  const payload = await response.json().catch(() => null)
  return {
    items: Array.isArray(payload?.items) ? payload.items : [],
    totalCount: Number(payload?.total_count) || 0,
    page: Number(payload?.page) || 1,
    pages: Number(payload?.pages) || 1,
  }
}
