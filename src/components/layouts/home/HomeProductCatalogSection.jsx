import ProductCardList from '@/components/product/ProductCardList'
import { fetchCategoryWithChildren } from '@/lib/catalog/categories'
import { fetchProductListing } from '@/lib/catalog/product-listing'

const DEFAULT_TITLE = 'Fashion Collection'
const DEFAULT_SUBTITLE = 'Discover our latest trends and bestsellers'

const clampLimit = (value) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 12
  return Math.min(30, Math.max(1, Math.floor(parsed)))
}

export default async function HomeProductCatalogSection({ categorySlug = 'home' }) {
  const { parent } = await fetchCategoryWithChildren(categorySlug)

  const mode = String(parent?.home_catalog_filter_mode || 'none')
  const categoryId = parent?.home_catalog_category_id || ''
  const tagId = parent?.home_catalog_tag_id || ''
  const perPage = clampLimit(parent?.home_catalog_limit || 12)

  const shouldFetchByCategory = mode === 'category' && Boolean(categoryId)
  const shouldFetchByTag = mode === 'tag' && Boolean(tagId)

  const products =
    shouldFetchByCategory || shouldFetchByTag
      ? await fetchProductListing({
          page: 1,
          perPage,
          category: shouldFetchByCategory ? categoryId : '',
          tag: shouldFetchByTag ? tagId : '',
        })
      : []

  return (
    <ProductCardList
      products={products}
      useSeedFallback={false}
      title={parent?.home_catalog_title || DEFAULT_TITLE}
      subtitle={parent?.home_catalog_description || DEFAULT_SUBTITLE}
    />
  )
}
