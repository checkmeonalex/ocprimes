'use client'
import ProductCard from './ProductCard'

const ProductGrid = ({ products, onAddToCart, className = '' }) => {
  if (!products || !Array.isArray(products)) {
    return <div>No products available</div>
  }

  return (
    <div className={`grid gap-6 ${className}`}>
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
