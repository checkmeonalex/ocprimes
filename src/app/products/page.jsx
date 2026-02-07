import ProductCatalogPage from '../../components/product/catalog/ProductCatalogPage'
import { fetchProductListing } from '../../lib/catalog/product-listing'
import { fetchCategoryWithChildren } from '../../lib/catalog/categories'
import { fetchTagBySlugOrId } from '../../lib/catalog/tags'

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
  const items = await fetchProductListing({ page: 1, perPage: 10, search, tag, category })

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
  }

  return (
    <ProductCatalogPage
      products={items}
      title={title}
      subtitle={subtitle}
      listingQuery={{ category, tag, search }}
    />
  )
}
