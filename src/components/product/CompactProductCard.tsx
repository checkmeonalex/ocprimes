'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { buildVendorHref } from '@/lib/catalog/vendor'
import { useScreenSize } from '@/hooks/useScreenSize'
import { useUserI18n } from '@/lib/i18n/useUserI18n'

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
  theme?: 'default' | 'dark' | 'prestige'
}

export const CompactProductCard = ({
  product,
  variant = 'fixed',
  theme = 'default',
}: CompactProductCardProps) => {
  const dark = theme === 'dark'
  const prestige = theme === 'prestige'
  const router = useRouter()
  const { isMobile } = useScreenSize()
  const { formatMoney } = useUserI18n()
  const openInNewTab = !isMobile
  const stock = Number(product.stock || 0)
  const lowStockLabel = stock > 0 && stock < 10 ? `Only ${stock} left in stock` : ''
  const isFluid = variant === 'fluid'
  const fixedCardWidthClass = 'min-w-[200px] max-w-[200px] sm:min-w-[240px] sm:max-w-[240px] flex-shrink-0'
  const fixedCardFrameClass = 'w-[200px] h-[272px] sm:w-[240px] sm:h-[300px]'

  return (
    <Link
      href={`/product/${product.slug}`}
      target={openInNewTab ? '_blank' : undefined}
      rel={openInNewTab ? 'noopener noreferrer' : undefined}
      data-next-navigation='true'
      className={`group block ${isFluid ? 'w-full' : fixedCardWidthClass}`}
    >
      <div className={
        dark ? 'transition' :
        prestige ? 'bg-white border border-stone-100 transition hover:border-stone-300' :
        'bg-white shadow-sm transition hover:shadow-md'
      }>
        <div className={`flex flex-col ${isFluid ? 'w-full aspect-[3/4]' : fixedCardFrameClass} ${
          dark ? 'border border-white/10' : prestige ? '' : 'border border-gray-200/80'
        }`}>
          <div className={`relative basis-[75%] flex-shrink-0 overflow-hidden rounded-none border-b ${
            dark ? 'border-white/10 bg-white/5' :
            prestige ? 'border-stone-100 bg-[#ede9e3]' :
            'border-gray-200 bg-white'
          }`}>
            {product.image ? (
              <Image
                src={product.image}
                alt={product.name}
                fill
                sizes={
                  isFluid
                    ? '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px'
                    : '(max-width: 640px) 200px, 240px'
                }
                className='object-cover rounded-none'
              />
            ) : (
              <div className={`flex h-full w-full items-center justify-center text-xs ${
                dark ? 'text-white/30' : prestige ? 'text-stone-400' : 'text-gray-400'
              }`}>
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
                  className={
                    dark ? 'text-white/60 font-light tracking-wide' :
                    prestige ? 'text-stone-500 font-light tracking-widest' :
                    'text-black/80 font-light tracking-wide drop-shadow'
                  }
                  style={{ fontFamily: product.vendorFont || 'serif', fontSize: '12px', cursor: 'pointer' }}
                >
                  {product.vendor}
                </span>
              </div>
            ) : null}
          </div>
          <div className={`flex-1 px-3 pb-2 pt-2 ${
            dark ? 'bg-white/[0.04]' : prestige ? 'bg-white' : ''
          }`}>
            <div className={`text-xs line-clamp-1 ${
              dark ? 'font-semibold text-white' :
              prestige ? 'font-light tracking-wide text-stone-800' :
              'font-semibold text-gray-900'
            }`}>
              {product.name}
            </div>
            <div className='mt-1 flex items-baseline gap-2'>
              <span className={`text-sm ${
                dark ? 'font-semibold text-white' :
                prestige ? 'font-light text-stone-900' :
                'font-semibold text-gray-900'
              }`}>
                {formatMoney(product.price)}
              </span>
              {product.originalPrice ? (
                <span className={`text-xs line-through ${
                  dark ? 'text-white/30' : prestige ? 'text-stone-400' : 'text-gray-400'
                }`}>
                  {formatMoney(product.originalPrice)}
                </span>
              ) : null}
            </div>
            {lowStockLabel ? (
              <div className={`mt-1 text-[11px] font-semibold ${
                dark ? 'text-orange-400' : prestige ? 'text-amber-700' : 'text-orange-600'
              }`}>
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
