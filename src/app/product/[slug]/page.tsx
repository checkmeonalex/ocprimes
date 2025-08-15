'use client'
import { useEffect, useState, use } from 'react'
import { SidebarProvider, useSidebar } from '../../../context/SidebarContext'
import { productsData } from '../../../components/data/products'
import StarRating from '../../../components/product/StarRating'
import ColorOptions from '../../../components/product/ColorOptions'
import Gallery from '../../../components/product/ProductDetails/gallery'

function ProductContent({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params)
  const { isOpen } = useSidebar()

  const [isDesktop, setIsDesktop] = useState(false)
  const [product, setProduct] = useState<any>(null)
  const [selectedColor, setSelectedColor] = useState('')
  const [selectedSize, setSelectedSize] = useState('')
  const [currentImage, setCurrentImage] = useState('')

  useEffect(() => {
    // Detect desktop breakpoint
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024) // Tailwind's lg breakpoint
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const foundProduct = productsData.find(
      (p) => p.slug === resolvedParams.slug
    )
    if (foundProduct) {
      setProduct(foundProduct)
      setSelectedColor(foundProduct.colors?.[0] || '')
      setSelectedSize(foundProduct.sizes?.[0] || '')
      setCurrentImage(foundProduct.image)
    }
  }, [resolvedParams.slug])

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    )
  }

  return (
    <main
      className="min-h-screen bg-gray-50 transition-all duration-300"
      style={{
        overflowX: 'hidden',
        maxWidth: '100vw',
        marginLeft: isDesktop ? (isOpen ? '16rem' : '4rem') : '0',
      }}
    >
      <div className="p-4">
        <div className="">
          {/* Left side - Images */}
          <Gallery
            images={product.gallery}
            currentImage={currentImage}
            setCurrentImage={setCurrentImage}
            productName={product.name}
          />

          {/* Right side - Product info */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold">{product.name}</h1>
              {product.isTrending && (
                <span className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-3 py-1 rounded-full text-sm">
                  Trending
                </span>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center">
                <StarRating rating={product.rating} />
                <span className="ml-2 text-gray-600">
                  ({product.reviews} reviews)
                </span>
              </div>
              <span className="text-green-600">{product.stock} in stock</span>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-3xl font-bold">${product.price}</span>
              {product.originalPrice && (
                <span className="text-xl text-gray-500 line-through">
                  ${product.originalPrice}
                </span>
              )}
            </div>

            {product.colors && (
              <div className="space-y-2">
                <h3 className="font-medium">Colors</h3>
                <ColorOptions
                  colors={product.colors}
                  selectedColor={selectedColor}
                  setSelectedColor={setSelectedColor}
                />
              </div>
            )}

            {product.sizes && (
              <div className="space-y-2">
                <h3 className="font-medium">Sizes</h3>
                <div className="flex gap-2">
                  {product.sizes.map((size: string) => (
                    <button
                      key={size}
                      className={`px-4 py-2 border rounded-md ${
                        selectedSize === size
                          ? 'border-black bg-black text-white'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      onClick={() => setSelectedSize(size)}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button className="w-full bg-black text-white py-3 rounded-md hover:bg-gray-800 transition">
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function ProductPageWrapper(
  props: { params: Promise<{ slug: string }> }
) {
  return (
    <SidebarProvider>
      <ProductContent {...props} />
    </SidebarProvider>
  )
}
