import ProductCardList from '../../../components/product/ProductCardList'
import { fetchProductListing } from '../../../lib/catalog/product-listing'

export default async function ProductCategoryPage({ params }) {
  const category = params?.category || ''
  const items = await fetchProductListing({ category, page: 1, perPage: 12 })
  return <ProductCardList products={items} />
}
