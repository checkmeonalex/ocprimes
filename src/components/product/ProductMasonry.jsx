'use client'
import ProductCard from './ProductCard'

const ProductMasonry = ({ products, onAddToCart }) => {
  if (!products || !Array.isArray(products)) {
    return <div>No products available</div>
  }

  return (
    <div className='grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
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

export default ProductMasonry
