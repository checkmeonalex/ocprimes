import ProductCardList from '../../components/product/ProductCardList'
import { fetchProductListing } from '../../lib/catalog/product-listing'

export default async function ProductsPage() {
  const items = await fetchProductListing({ page: 1, perPage: 12 })
  return <ProductCardList products={items} />
}
