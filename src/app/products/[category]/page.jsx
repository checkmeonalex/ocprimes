import ProductCatalogPage from '../../../components/product/catalog/ProductCatalogPage'
import { fetchProductListing } from '../../../lib/catalog/product-listing'
import { fetchCategoryWithChildren } from '../../../lib/catalog/categories'
import { fetchHotspotLayoutsByCategory } from '../../../lib/catalog/hotspot'
import { fetchLogoGridByCategory } from '../../../lib/catalog/logo-grid'

export const dynamic = 'force-dynamic'

const toReadableName = (value = '') =>
  String(value || '')
    .trim()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')

export default async function ProductCategoryPage({ params }) {
  const resolvedParams = await params
  const category = resolvedParams?.category || ''
  const items = await fetchProductListing({ category, page: 1, perPage: 10 })
  const { parent, children } = await fetchCategoryWithChildren(category)
  const hotspotLayouts = parent?.id
    ? await fetchHotspotLayoutsByCategory(parent.id)
    : []
  const logoGrid = parent?.id ? await fetchLogoGridByCategory(parent.id) : null
  return (
    <ProductCatalogPage
      products={items}
      parentCategory={parent}
      childCategories={children}
      hotspotLayouts={hotspotLayouts}
      logoGrid={logoGrid}
      title={parent?.name || toReadableName(category)}
      subtitle={String(parent?.description || '').trim()}
      listingQuery={{ category }}
    />
  )
}
