import ProductCatalogPage from '../../components/product/catalog/ProductCatalogPage'
import { fetchProductListingPayload } from '../../lib/catalog/product-listing'
import { fetchCategoryWithChildren } from '../../lib/catalog/categories'
import { fetchTagBySlugOrId } from '../../lib/catalog/tags'

export const dynamic = 'force-dynamic'

const toReadableName = (value = '') =>
  String(value || '')
    .trim()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')

export default async function ProductsPage({ searchParams }) {
  const resolvedParams = await searchParams
  const search = String(resolvedParams?.search || '').trim()
  const tag = String(resolvedParams?.tag || '').trim()
  const category = String(resolvedParams?.category || '').trim()
  const vendor = String(resolvedParams?.vendor || '').trim()
  const listing = await fetchProductListingPayload({
    page: 1,
    perPage: 10,
    search,
    tag,
    category,
    vendor,
    fields: 'card',
  })
  const items = listing.items

  let title = 'Products'
  let subtitle = ''

  if (search) {
    title = search
  } else if (tag) {
    const tagMeta = await fetchTagBySlugOrId(tag)
    title = String(tagMeta?.name || toReadableName(tag))
    subtitle = String(tagMeta?.description || '').trim()
  } else if (category) {
    const { parent } = await fetchCategoryWithChildren(category)
    title = String(parent?.name || toReadableName(category))
    subtitle = String(parent?.description || '').trim()
  } else if (vendor) {
    title = toReadableName(vendor)
    subtitle = `Explore items from ${title}`
  }

  return (
    <ProductCatalogPage
      products={items}
      title={title}
      subtitle={subtitle}
      listingQuery={{ category, tag, search, vendor }}
      initialNextCursor={listing.nextCursor}
      initialHasMore={listing.hasMore}
    />
  )
}
