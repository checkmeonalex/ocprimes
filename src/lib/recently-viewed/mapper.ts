import type { RecentlyViewedItem } from '@/lib/recently-viewed/storage'

export const toProductCardItem = (item: RecentlyViewedItem) => ({
  id: item.id,
  slug: item.slug,
  name: item.name,
  vendor: item.vendor || 'OCPRIMES',
  vendorFont: item.vendorFont || 'Georgia, serif',
  shortDescription: '',
  fullDescription: '',
  price: Number(item.price) || 0,
  originalPrice: item.originalPrice ?? null,
  rating: 0,
  reviews: 0,
  colors: [],
  sizes: [],
  isTrending: false,
  isPortrait: false,
  image: item.image,
  gallery: item.image ? [item.image] : [],
  stock: Number(item.stock) || 0,
  tags: [],
  variations: [],
})
