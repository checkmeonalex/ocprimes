interface CategoryItem {
  id: string
  name: string
  slug?: string
  image?: string
  badge?: string
}

interface Subcategory {
  id: string
  name: string
  slug?: string
  hasArrow: boolean
  items?: CategoryItem[]
}

interface Category {
  id: string
  name: string
  slug?: string
  hasArrow: boolean
  subcategories: Subcategory[]
}

export interface CategoriesData {
  categories: Category[]
}

const buildFallbackCategories = () => [
  {
    id: 'fallback-all',
    name: 'All',
    slug: 'all',
    hasArrow: true,
    subcategories: [
      {
        id: 'fallback-popular',
        name: 'Popular',
        slug: 'popular',
        hasArrow: true,
        items: [
          {
            id: 'fallback-shoes',
            name: 'Shoes',
            slug: 'shoes',
            image:
              'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=400&fit=crop&crop=center',
            badge: 'Hot',
          },
          {
            id: 'fallback-brash',
            name: 'Brash',
            slug: 'brash',
            image:
              'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop&crop=center',
          },
          {
            id: 'fallback-bag',
            name: 'Bag',
            slug: 'bag',
            image:
              'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop&crop=center',
          },
          {
            id: 'fallback-tshirt',
            name: 'T-Shirt',
            slug: 't-shirt',
            image:
              'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop&crop=center',
            badge: 'New',
          },
        ],
      },
    ],
  },
]

export const fetchCategoriesData = async () => {
  try {
    const response = await fetch('/api/categories?limit=500', { cache: 'no-store' })
    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      return {
        categories: buildFallbackCategories(),
      }
    }
    return {
      categories: Array.isArray(payload?.categories) ? payload.categories : [],
    }
  } catch (_error) {
    return {
      categories: buildFallbackCategories(),
    }
  }
}
