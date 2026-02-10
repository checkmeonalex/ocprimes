import ProductCatalogPage from '@/components/product/catalog/ProductCatalogPage'
import { fetchProductListing } from '@/lib/catalog/product-listing'
import { fetchBrandBySlugOrId } from '@/lib/catalog/brands'

const toReadableName = (value = '') =>
  String(value || '')
    .trim()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')

export default async function VendorPage({ params }) {
  const vendorSlug = String(params?.slug || '').trim()
  const items = await fetchProductListing({ vendor: vendorSlug, page: 1, perPage: 10 })
  const vendorMeta = vendorSlug ? await fetchBrandBySlugOrId(vendorSlug) : null

  const vendorName = String(vendorMeta?.name || toReadableName(vendorSlug) || 'Vendor')
  const subtitle = String(vendorMeta?.description || '').trim() || `Explore items from ${vendorName}.`

  return (
    <ProductCatalogPage
      products={items}
      title={vendorName}
      subtitle={subtitle}
      listingQuery={{ vendor: vendorSlug }}
    />
  )
}
