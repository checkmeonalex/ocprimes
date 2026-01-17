import ProductListingPage from '../../../components/product/ProductListingPage'

export default function ProductCategoryPage({ params }) {
  return <ProductListingPage initialCategorySlug={params.category} />
}
