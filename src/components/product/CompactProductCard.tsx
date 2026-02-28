'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { buildVendorHref } from '@/lib/catalog/vendor'

type CompactProductCardProps = {
  product: {
    id: string | number
    slug: string
    name: string
    image?: string
    price: number
    originalPrice?: number | null
    vendor?: string
    vendorSlug?: string
    vendorFont?: string
    stock?: number | null
  }
  variant?: 'fixed' | 'fluid'
}

const formatPrice = (value: number) => {
  if (!Number.isFinite(value)) return '--'
  return value.toFixed(2)
}

export const CompactProductCard = ({
  product,
  variant = 'fixed',
}: CompactProductCardProps) => {
  const router = useRouter()
  const stock = Number(product.stock || 0)
  const lowStockLabel = stock > 0 && stock < 10 ? `Only ${stock} left in stock` : ''
  const isFluid = variant === 'fluid'

  return (
    <Link
      href={`/product/${product.slug}`}
      className={`group block ${isFluid ? 'w-full' : 'min-w-[240px] max-w-[240px] flex-shrink-0'}`}
    >
      <div className='bg-white shadow-sm transition hover:shadow-md'>
        <div
          className={`border border-gray-200/80 flex flex-col ${
            isFluid ? 'w-full aspect-[3/4]' : 'w-[240px] h-[300px]'
          }`}
        >
          <div className='relative basis-[75%] flex-shrink-0 overflow-hidden rounded-none border-b border-gray-200 bg-white'>
            {product.image ? (
              <Image
                src={product.image}
                alt={product.name}
                fill
                sizes={
                  isFluid
                    ? '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px'
                    : '200px'
                }
                className='object-cover rounded-none'
              />
            ) : (
              <div className='flex h-full w-full items-center justify-center text-xs text-gray-400'>
                No image
              </div>
            )}
            {product.vendor ? (
              <div className='absolute top-2 left-2 z-10'>
                <span
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    router.push(buildVendorHref(product.vendor || '', product.vendorSlug || ''))
                  }}
                  className='text-black/80 font-light tracking-wide drop-shadow'
                  style={{
                    fontFamily: product.vendorFont || 'serif',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  {product.vendor}
                </span>
              </div>
            ) : null}
          </div>
          <div className='flex-1 px-3 pb-2 pt-2'>
            <div className='text-xs font-semibold text-gray-900 line-clamp-1'>
              {product.name}
            </div>
            <div className='mt-1 flex items-baseline gap-2'>
              <span className='text-sm font-semibold text-gray-900'>
                ${formatPrice(product.price)}
              </span>
              {product.originalPrice ? (
                <span className='text-xs text-gray-400 line-through'>
                  ${formatPrice(product.originalPrice)}
                </span>
              ) : null}
            </div>
            {lowStockLabel ? (
              <div className='mt-1 text-[11px] font-semibold text-orange-600'>
                {lowStockLabel}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  )
}

type ProductScrollContainerProps = {
  title?: string
  products: CompactProductCardProps['product'][]
}

export const ProductScrollContainer = ({ 
  title = 'Recently Viewed', 
  products 
}: ProductScrollContainerProps) => {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 220 // card width + gap
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  return (
    <div className='w-full'>
      <div className='mb-4 flex items-center justify-between'>
        <h2 className='text-lg font-semibold text-gray-900'>{title}</h2>
        <div className='flex gap-2'>
          <button
            onClick={() => scroll('left')}
            className='flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 transition hover:bg-gray-50 hover:border-gray-400'
            aria-label='Scroll left'
          >
            <ChevronLeft className='h-5 w-5' />
          </button>
          <button
            onClick={() => scroll('right')}
            className='flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 transition hover:bg-gray-50 hover:border-gray-400'
            aria-label='Scroll right'
          >
            <ChevronRight className='h-5 w-5' />
          </button>
        </div>
      </div>
      
      <div
        ref={scrollRef}
        className='flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400'
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#d1d5db #f3f4f6'
        }}
      >
        {products.map((product) => (
          <CompactProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  )
}

export default CompactProductCard
