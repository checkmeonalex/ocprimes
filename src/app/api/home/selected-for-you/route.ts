import type { NextRequest } from 'next/server'
import { fetchProductListingPayload } from '@/lib/catalog/product-listing'
import { getCachedTopCategories } from '@/lib/catalog/top-categories-server'
import { currentRotationSlot, seededPick, seededShuffle } from '@/lib/personalization/rotation'
import { FEED_TITLE_POOL } from '@/lib/personalization/feed-titles'
import { jsonError, jsonOk } from '@/lib/http/response'

const FEED_SIZE = 20
const MAX_PAGE_SIZE = 30
const POOL_PAGES = 2

type CategoryNode = {
  id?: string
  name?: string
  slug?: string
  subcategories?: Array<{ items?: Array<{ id?: string; name?: string; slug?: string }> }>
}

const flattenCategoryTabs = (topCategories: CategoryNode[]) => {
  if (!Array.isArray(topCategories) || topCategories.length === 0) return []

  if (topCategories.length !== 1) {
    return topCategories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug || '',
    }))
  }

  const onlyCategory = topCategories[0]
  const firstSubcategoryGroup = Array.isArray(onlyCategory?.subcategories)
    ? onlyCategory.subcategories[0]
    : null
  const childItems = Array.isArray(firstSubcategoryGroup?.items) ? firstSubcategoryGroup.items : []

  if (!childItems.length) {
    return [{ id: onlyCategory.id, name: onlyCategory.name, slug: onlyCategory.slug || '' }]
  }

  return childItems.map((child) => ({
    id: child.id,
    name: child.name,
    slug: child.slug || '',
  }))
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const page = Math.max(1, Number(searchParams.get('page')) || 1)

  if (page === 1) {
    const [pages, topCategories] = await Promise.all([
      Promise.all(
        Array.from({ length: POOL_PAGES }, (_, index) =>
          fetchProductListingPayload({ page: index + 1, perPage: MAX_PAGE_SIZE, fields: 'card' }),
        ),
      ),
      getCachedTopCategories(),
    ])

    const pool = pages.flatMap((p) => p.items)
    const allCategories = flattenCategoryTabs(topCategories)

    const slot = currentRotationSlot()
    const title = seededPick(FEED_TITLE_POOL, slot) || FEED_TITLE_POOL[0]
    const items = seededShuffle(pool, slot).slice(0, FEED_SIZE)
    const categories = seededShuffle(allCategories, slot + 1)

    return jsonOk({
      title,
      categories,
      items,
      page: 1,
      hasMore: pool.length > FEED_SIZE,
    })
  }

  const listing = await fetchProductListingPayload({ page, perPage: FEED_SIZE, fields: 'card' })
  if (!listing.items.length) {
    return jsonError('No more products.', 404)
  }

  return jsonOk({
    items: listing.items,
    page,
    hasMore: listing.hasMore,
  })
}
