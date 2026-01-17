'use client'
import ProductCard from './ProductCard'
import MasonryGrid from './MasonryGrid'

const ProductMasonry = ({ products, onAddToCart }) => {
  if (!products || !Array.isArray(products)) {
    return <div>No products available</div>
  }

  return (
    <MasonryGrid>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onAddToCart={onAddToCart}
        />
      ))}
    </MasonryGrid>
  )
}

export default ProductMasonry
