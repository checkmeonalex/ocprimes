'use client'
import ProductCard from './ProductCard'

const CUSTOM_GAP_CLASS_PATTERN = /(^|\s)(?:[a-z]+:)*gap(?:-[xy])?-[^\s]+/;

const ProductGrid = ({ products, onAddToCart, className = '' }) => {
  if (!products || !Array.isArray(products)) {
    return <div>No products available</div>
  }

  const baseGapClass = CUSTOM_GAP_CLASS_PATTERN.test(className) ? '' : 'gap-6'

  return (
    <div className={`grid ${baseGapClass} ${className}`.trim()}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onAddToCart={onAddToCart}
        />
      ))}
    </div>
  )
}

export default ProductGrid
