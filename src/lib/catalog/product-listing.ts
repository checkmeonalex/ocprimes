import { headers } from 'next/headers'

const buildProductsUrl = async ({ category, tag, vendor, page, perPage, search, cursor, fields }) => {
  const host = (await headers()).get('host') || 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const params = new URLSearchParams()

  if (cursor) {
    params.set('cursor', String(cursor))
  } else {
    params.set('page', String(page))
  }
  params.set('per_page', String(perPage))
  params.set('fields', fields || 'full')

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
  cursor = '',
  fields = 'full',
} = {}) => {
  const response = await fetch(
    await buildProductsUrl({ category, tag, vendor, page, perPage, search, cursor, fields }),
    {
      next: { revalidate: 60 },
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
  cursor = '',
  fields = 'full',
} = {}) => {
  const response = await fetch(
    await buildProductsUrl({ category, tag, vendor, page, perPage, search, cursor, fields }),
    {
      next: { revalidate: 60 },
    },
  )
  const payload = await response.json().catch(() => null)
  return {
    items: Array.isArray(payload?.items) ? payload.items : [],
    totalCount: Number(payload?.total_count) || 0,
    page: Number(payload?.page) || 1,
    pages: Number(payload?.pages) || 1,
    nextCursor: String(payload?.next_cursor || '').trim(),
    hasMore: Boolean(payload?.has_more),
  }
}
