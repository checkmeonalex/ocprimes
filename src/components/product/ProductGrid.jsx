'use client'
import ProductCard from './ProductCard'
import MasonryGrid from './MasonryGrid'

const CUSTOM_GAP_CLASS_PATTERN = /(^|\s)(?:[a-z]+:)*gap(?:-[xy])?-[^\s]+/;

const ProductGrid = ({
  products,
  onAddToCart,
  className = '',
  masonry = false,
}) => {
  if (!products || !Array.isArray(products)) {
    return <div>No products available</div>
  }

  const baseGapClass = CUSTOM_GAP_CLASS_PATTERN.test(className) ? '' : 'gap-6'

  if (masonry) {
    return (
      <MasonryGrid
        className={`product-grid-masonry ${className}`.trim()}
        gap='12px'
        mobileGap='8px'
        itemGap='12px'
        mobileItemGap='8px'
      >
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onAddToCart={onAddToCart}
            className='mb-0 break-inside-avoid'
          />
        ))}
      </MasonryGrid>
    )
  }

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
