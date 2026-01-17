'use client'
import { useEffect, useRef, useState, use } from 'react'
import Image from 'next/image'
import { productsData } from '../../../components/data/products'
import StarRating from '../../../components/product/StarRating'
import Gallery from '../../../components/product/ProductDetails/gallery'
import Breadcrumb from '../../../components/Breadcrumb'
import ShippingInfoCard from '../../../components/product/ShippingInfoCard'
import AboutStoreCard from '../../../components/product/AboutStoreCard'
import CustomerReviews from '../../../components/product/CustomerReviews'
import {
  customerReviewsByProductId,
  customerReviewsData,
} from '../../../components/data/customerReviews'

function ProductContent({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params)

  const [product, setProduct] = useState<any>(null)
  const [selectedColor, setSelectedColor] = useState('')
  const [selectedSize, setSelectedSize] = useState('')
  const [currentImage, setCurrentImage] = useState('')
  const [activeTab, setActiveTab] = useState('details')
  const [showFloatingCart, setShowFloatingCart] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [selectedVariation, setSelectedVariation] = useState<any>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showSeeMore, setShowSeeMore] = useState(false)
  const addToCartRef = useRef<HTMLDivElement | null>(null)
  const galleryMainRef = useRef<HTMLDivElement | null>(null)
  const sectionRef = useRef<HTMLDivElement | null>(null)
  const rightColumnRef = useRef<HTMLDivElement | null>(null)
  const rightPinRef = useRef<HTMLDivElement | null>(null)
  const rightSpacerRef = useRef<HTMLDivElement | null>(null)
  const productNameRef = useRef<HTMLHeadingElement | null>(null)
  const autoScrollArmedRef = useRef(true)
  const leftColumnRef = useRef<HTMLDivElement | null>(null)
  const leftTopSentinelRef = useRef<HTMLDivElement | null>(null)
  const descriptionRef = useRef<HTMLParagraphElement | null>(null)

  useEffect(() => {
    const foundProduct = productsData.find(
      (p) => p.slug === resolvedParams.slug
    )
    if (foundProduct) {
      setProduct(foundProduct)
      setSelectedColor(foundProduct.colors?.[0] || '')
      setSelectedSize(foundProduct.sizes?.[0] || '')
      setCurrentImage(foundProduct.image)
      setSelectedVariation(foundProduct.variations?.[0] || null)
    }
  }, [resolvedParams.slug])

  useEffect(() => {
    const updateIsMobile = () => setIsMobile(window.innerWidth < 1024)
    updateIsMobile()
    window.addEventListener('resize', updateIsMobile)
    return () => window.removeEventListener('resize', updateIsMobile)
  }, [])

  useEffect(() => {
    if (!isMobile || !addToCartRef.current) {
      setShowFloatingCart(false)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowFloatingCart(entry.intersectionRatio < 0.6)
      },
      { threshold: [0, 0.6, 1] }
    )

    observer.observe(addToCartRef.current)
    return () => observer.disconnect()
  }, [isMobile])

  useEffect(() => {
    if (isMobile) return
    if (!product) return

    const sectionEl = sectionRef.current
    const pinEl = rightPinRef.current
    const spacerEl = rightSpacerRef.current
    const rightCol = rightColumnRef.current
    if (!sectionEl || !pinEl || !spacerEl || !rightCol) return

    let frameId = 0
    const headerOffset = 96

    const update = () => {
      const scrollY = window.scrollY
      const sectionRect = sectionEl.getBoundingClientRect()
      const rightRect = rightCol.getBoundingClientRect()
      const sectionTop = sectionRect.top + scrollY
      const sectionBottom = sectionRect.bottom + scrollY
      const pinHeight = pinEl.offsetHeight
      const maxTop = Math.max(0, sectionBottom - pinHeight - sectionTop)
      const shouldPin = scrollY + headerOffset >= sectionTop
      const shouldUnpinBottom =
        scrollY + headerOffset >= sectionBottom - pinHeight

      spacerEl.style.height = `${pinHeight}px`
      rightCol.style.minHeight = `${pinHeight}px`

      if (!shouldPin) {
        pinEl.style.position = 'absolute'
        pinEl.style.top = '0px'
        pinEl.style.left = '0px'
        pinEl.style.width = '100%'
        pinEl.style.zIndex = '1'
        return
      }

      if (shouldUnpinBottom) {
        pinEl.style.position = 'absolute'
        pinEl.style.top = `${maxTop}px`
        pinEl.style.left = '0px'
        pinEl.style.width = '100%'
        pinEl.style.zIndex = '1'
        return
      }

      pinEl.style.position = 'fixed'
      pinEl.style.top = `${headerOffset}px`
      pinEl.style.left = `${rightRect.left}px`
      pinEl.style.width = `${rightRect.width}px`
      pinEl.style.zIndex = '10'
    }

    const onScroll = () => {
      if (frameId) return
      frameId = window.requestAnimationFrame(() => {
        frameId = 0
        update()
      })
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frameId) window.cancelAnimationFrame(frameId)
    }
  }, [isMobile, product])

  useEffect(() => {
    if (isMobile) return
    const target = productNameRef.current
    const sentinel = leftTopSentinelRef.current
    if (!target || !sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && autoScrollArmedRef.current) {
          autoScrollArmedRef.current = false
          target.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
        if (!entry.isIntersecting) {
          autoScrollArmedRef.current = true
        }
      },
      { threshold: 1 }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [isMobile, product])

  useEffect(() => {
    if (!product) {
      setShowSeeMore(false)
      return
    }

    if (activeTab !== 'details') {
      setShowSeeMore(false)
      return
    }

    const description =
      product.fullDescription ||
      product.shortDescription ||
      `Elevate your ${product.category.toLowerCase()} collection with the ${
        product.name
      }. Crafted with comfort and durability in mind, this piece balances style and everyday performance.`

    let animationFrame: number | null = null

    const measureOverflow = () => {
      if (!descriptionRef.current) {
        setShowSeeMore(false)
        return
      }

      const el = descriptionRef.current
      const hasOverflow = el.scrollHeight > el.clientHeight + 1
      setShowSeeMore(hasOverflow)
    }

    animationFrame = window.requestAnimationFrame(measureOverflow)
    window.addEventListener('resize', measureOverflow)

    return () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame)
      }
      window.removeEventListener('resize', measureOverflow)
    }
  }, [activeTab, product])

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    )
  }

  const discountPercentage = product.originalPrice
    ? Math.round(
        ((product.originalPrice - product.price) / product.originalPrice) * 100
      )
    : null

  const shortDescription = product.shortDescription ?? ''
  const fullDescription = product.fullDescription ?? ''
  const stockRemaining = product.stockRemaining ?? product.stock ?? 0
  const sku = product.sku || 'N/A'
  const material = product.material || 'Premium Mixed Materials'
  const dimensions = product.dimensions || '10 x 6 x 3 in'
  const shippingEstimate = product.shippingEstimate || 'Ships in 3-5 business days'
  const tags = product.tags || []
  const activePrice = selectedVariation?.price ?? product.price
  const activeOriginalPrice =
    selectedVariation?.originalPrice ?? product.originalPrice
  const activeImage = selectedVariation?.image || currentImage
  const sizeRange = product.sizes?.length ? product.sizes.join(', ') : 'One size'
  const categorySlug = encodeURIComponent(product.category.toLowerCase())

  const tabs = [
    {
      id: 'details',
      label: 'Product Details',
      content: fullDescription,
    },
    {
      id: 'packaging',
      label: 'Packaging',
      content: 'Ships in protective packaging with extra padding to keep it safe in transit.',
    },
    {
      id: 'shipping',
      label: 'Shipping Information',
      content: `${shippingEstimate}. Express options available at checkout.`,
    },
  ]
  const activeTabData = tabs.find((tab) => tab.id === activeTab)

  return (
    <div className='min-h-screen flex'>
      <div className='flex-1 min-w-0'>
        <main className='lg:pl-16 min-h-screen bg-[#f7f7f5] overflow-x-hidden w-full'>
          <div className='main-container py-10'>
            <div className='mb-6'>
              <Breadcrumb
                items={[
                  { label: 'Catalogue', href: '/' },
                  { label: product.category, href: `/category/${categorySlug}` },
                  { label: product.name },
                ]}
                rightAction={{
                  label: 'Report This Product',
                  icon: (
                    <svg
                      className='h-4 w-4'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={1.8}
                        d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
                      />
                    </svg>
                  ),
                }}
              />
            </div>
            <div className='bg-white rounded-2xl shadow-sm border border-gray-100'>
              <div
                ref={sectionRef}
                className='grid lg:grid-cols-[640px_1fr] lg:items-stretch'
              >
                {/* Left side - Images */}
                <div ref={leftColumnRef} className='space-y-6 lg:pr-6'>
                  <div ref={leftTopSentinelRef} className='h-px w-full' />
                  <Gallery
                    images={product.gallery}
                    currentImage={activeImage}
                    setCurrentImage={setCurrentImage}
                    productName={product.name}
                    badgeText={
                      discountPercentage ? `-${discountPercentage}%` : null
                    }
                    mainImageRef={galleryMainRef}
                  />
                  <CustomerReviews
                    data={
                      customerReviewsByProductId[product.id] ||
                      customerReviewsData
                    }
                  />
                </div>

                {/* Right side - Product info */}
                <div
                  ref={rightColumnRef}
                  className='relative p-6 border-t border-gray-100 lg:border-t-0 lg:border-l'
                >
                  <div ref={rightSpacerRef} />
                  <div
                    ref={rightPinRef}
                    className='space-y-6 no-scrollbar'
                    style={
                      isMobile
                        ? undefined
                        : {
                            height: 'calc(100vh - 96px)',
                            overflowY: 'auto',
                          }
                    }
                  >
                  <div className='flex items-center justify-between'>
                    <span className='text-xs font-semibold uppercase tracking-wide bg-gray-100 text-gray-700 px-3 py-1 rounded-full'>
                      {product.category}
                    </span>
                    <button className='flex items-center gap-2 text-xs font-medium text-gray-600 border border-gray-200 px-3 py-2 rounded-full hover:bg-gray-50 transition'>
                      <svg
                        className='h-4 w-4'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={1.8}
                          d='M12 3v12m0-12l-4 4m4-4l4 4M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6'
                        />
                      </svg>
                      Share
                    </button>
                  </div>

                  <div className='space-y-3'>
                    <h1
                      ref={productNameRef}
                      className='text-3xl font-semibold text-gray-900 font-serif'
                    >
                      {product.name}
                    </h1>
                    <div className='flex items-center gap-3 text-sm text-gray-600'>
                      <div className='flex items-center gap-2'>
                        <StarRating rating={product.rating} />
                        <span className='font-medium text-gray-800'>
                          {product.rating}
                        </span>
                      </div>
                      <span>{product.reviews} reviews</span>
                      <span className='text-green-600'>
                        {stockRemaining} in stock
                      </span>
                    </div>
                    <p className='text-sm text-gray-600 leading-relaxed'>
                      {shortDescription}
                    </p>
                    <div className='text-xs text-gray-500'>SKU: {sku}</div>
                    {tags.length > 0 && (
                      <div className='flex flex-wrap gap-2 pt-1'>
                        {tags.map((tag: string) => (
                          <span
                            key={tag}
                            className='text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600'
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className='flex items-center gap-4'>
                    <span className='text-3xl font-semibold text-gray-900'>
                      ${activePrice}
                    </span>
                    {activeOriginalPrice && (
                      <span className='text-lg text-gray-400 line-through'>
                        ${activeOriginalPrice}
                      </span>
                    )}
                    {discountPercentage && (
                      <span className='text-xs font-semibold text-white bg-red-500 px-2.5 py-1 rounded-full'>
                        {discountPercentage}% off
                      </span>
                    )}
                  </div>

                  <div ref={addToCartRef} className='flex items-center gap-3'>
                    <button className='flex-1 bg-amber-400 text-gray-900 font-semibold py-3 rounded-full hover:bg-amber-300 transition'>
                      Add to Cart
                    </button>
                    <button
                      type='button'
                      className='w-11 h-11 rounded-full border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 transition'
                    >
                      <svg
                        className='h-5 w-5'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={1.8}
                          d='M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z'
                        />
                      </svg>
                    </button>
                  </div>

                  <div className='border-t border-gray-200 pt-3 space-y-3'>
                    {product.variations?.length > 0 && (
                      <div className='space-y-2'>
                        <div className='text-sm font-semibold text-gray-900'>
                          Variations
                        </div>
                        <div className='grid grid-cols-4 gap-2 sm:grid-cols-5 lg:grid-cols-6'>
                          {product.variations.map((variation: any) => {
                            const isSelected =
                              selectedVariation?.id === variation.id
                            return (
                              <button
                                key={variation.id}
                                type='button'
                                onClick={() => {
                                  setSelectedVariation(variation)
                                  setCurrentImage(variation.image)
                                }}
                                className={`text-left border rounded-lg p-0.5 transition ${
                                  isSelected
                                    ? 'border-blue-500 ring-2 ring-blue-200'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <div className='w-full aspect-[4/5] rounded-md overflow-hidden bg-gray-100 relative'>
                                  <Image
                                    src={variation.image}
                                    alt={variation.label}
                                    fill
                                    sizes='(min-width: 1024px) 12rem, 30vw'
                                    className='object-cover'
                                  />
                                </div>
                                <div className='pt-0.5 text-[8px] text-gray-700 truncate'>
                                  {variation.label}
                                </div>
                                <div className='text-[9px] font-semibold text-gray-900'>
                                  ${variation.price}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    {product.sizes && (
                      <div className='space-y-2'>
                        <div className='text-sm font-semibold text-gray-900'>
                          Sizes
                        </div>
                        <div className='flex flex-wrap gap-2'>
                          {product.sizes.map((size: string) => (
                            <button
                              key={size}
                              className={`px-3 py-1.5 border rounded-full text-xs ${
                                selectedSize === size
                                  ? 'border-gray-900 bg-gray-900 text-white'
                                  : 'border-gray-300 hover:border-gray-400 text-gray-700'
                              }`}
                              onClick={() => setSelectedSize(size)}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className='bg-gray-100 rounded-full p-1 flex items-center gap-2 text-xs'>
                      {tabs.map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`flex-1 px-3 py-2 rounded-full transition ${
                            activeTab === tab.id
                              ? 'bg-white shadow-sm text-gray-900 font-semibold'
                              : 'text-gray-600'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                    <div className='relative'>
                      <p
                        ref={descriptionRef}
                        className={`text-sm text-gray-600 leading-relaxed ${
                          activeTab === 'details'
                            ? 'max-h-24 overflow-hidden'
                            : ''
                        }`}
                      >
                        {activeTabData?.content}
                      </p>
                      {showSeeMore && (
                        <>
                          <div className='pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white to-transparent' />
                          <div className='mt-2 flex justify-center'>
                            <button
                              onClick={() => setShowDetailsModal(true)}
                              className='text-xs font-semibold text-gray-800 hover:text-gray-900 transition'
                            >
                              See more &gt;
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    <div className='grid gap-3 sm:grid-cols-2'>
                      <div className='border border-gray-200 rounded-xl p-4 text-sm'>
                        <div className='font-semibold text-gray-900 mb-2'>
                          Size & Fit
                        </div>
                        <div className='flex justify-between text-gray-600'>
                          <span>Range</span>
                          <span>{sizeRange}</span>
                        </div>
                        <div className='flex justify-between text-gray-600 mt-2'>
                          <span>Dimensions</span>
                          <span>{dimensions}</span>
                        </div>
                      </div>
                      <div className='border border-gray-200 rounded-xl p-4 text-sm'>
                        <div className='font-semibold text-gray-900 mb-2'>
                          Material
                        </div>
                        <div className='flex justify-between text-gray-600'>
                          <span>Material</span>
                          <span>{material}</span>
                        </div>
                        <div className='flex justify-between text-gray-600 mt-2'>
                          <span>Shipping</span>
                          <span>{shippingEstimate}</span>
                        </div>
                      </div>
                    </div>

                  <ShippingInfoCard shippingEstimate={shippingEstimate} />
                  <AboutStoreCard
                    vendor={product.vendor}
                    rating={product.vendorRating}
                    followers={product.vendorFollowers}
                    soldCount={product.vendorSoldCount}
                    itemsCount={product.vendorItemsCount}
                    badge={product.vendorBadge}
                    avatarUrl={product.image}
                  />
                  </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {showFloatingCart && (
        <div className='lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 px-4 py-3 shadow-[0_-6px_20px_rgba(0,0,0,0.08)]'>
          <div className='flex items-center gap-3'>
            <div className='text-sm text-gray-600'>
              <div className='text-xs uppercase tracking-wide text-gray-400'>
                Price
              </div>
              <div className='text-lg font-semibold text-gray-900'>
                ${product.price}
              </div>
            </div>
            <button className='flex-1 bg-amber-400 text-gray-900 font-semibold py-3 rounded-full hover:bg-amber-300 transition'>
              Add to Cart
            </button>
          </div>
        </div>
      )}

      {showDetailsModal && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowDetailsModal(false)
            }
          }}
        >
          <div className='w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl'>
            <div className='flex items-center justify-between'>
              <h3 className='text-lg font-semibold text-gray-900'>
                {activeTabData?.label}
              </h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className='rounded-full p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition'
                aria-label='Close'
              >
                ✕
              </button>
            </div>
            <p className='mt-4 text-sm text-gray-600 leading-relaxed whitespace-pre-line'>
              {activeTabData?.content}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProductPageWrapper(
  props: { params: Promise<{ slug: string }> }
) {
  return <ProductContent {...props} />
}
