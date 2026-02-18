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

export const fetchCategoriesData = async (): Promise<CategoriesData> => {
  try {
    const response = await fetch('/api/categories?limit=500', { cache: 'no-store' })
    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      return { categories: [] }
    }
    return {
      categories: Array.isArray(payload?.categories) ? payload.categories : [],
    }
  } catch {
    return { categories: [] }
  }
}
