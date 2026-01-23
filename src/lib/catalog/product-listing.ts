import { headers } from 'next/headers'

const buildProductsUrl = async ({ category, page, perPage }) => {
  const host = (await headers()).get('host') || 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  })

  if (category) {
    params.set('category', category)
  }

  return `${protocol}://${host}/api/products?${params.toString()}`
}

export const fetchProductListing = async ({
  category = '',
  page = 1,
  perPage = 12,
} = {}) => {
  const response = await fetch(await buildProductsUrl({ category, page, perPage }), {
    cache: 'no-store',
  })
  const payload = await response.json().catch(() => null)
  return Array.isArray(payload?.items) ? payload.items : []
}
