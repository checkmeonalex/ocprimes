// data/categoriesMenuData.ts

interface CategoryItem {
  id: string
  name: string
  image?: string
  badge?: string
}

interface Subcategory {
  id: string
  name: string
  hasArrow: boolean
  items?: CategoryItem[]
}

interface Category {
  id: string
  name: string
  hasArrow: boolean
  subcategories: Subcategory[]
}

interface CategoriesData {
  categories: Category[]
}

export const categoriesMenuData: CategoriesData = {
  categories: [
    {
      id: 'featured',
      name: 'Featured',
      hasArrow: true,
      subcategories: [],
    },
    {
      id: 'home-kitchen',
      name: 'Home & Kitchen',
      hasArrow: true,
      subcategories: [],
    },
    {
      id: 'womens-clothing',
      name: "Women's Clothing",
      hasArrow: true,
      subcategories: [
        {
          id: 'all-womens-clothing',
          name: "All Women's Clothing",
          hasArrow: true,
          items: [
            {
              id: 'dresses',
              name: "Women's Dresses",
              image: '/api/placeholder/60/60',
              badge: 'HOT',
            },
            {
              id: 'two-piece-sets',
              name: "Women's Two Piece Sets",
              image: '/api/placeholder/60/60',
            },
            {
              id: 't-shirts',
              name: "Women's T-Shirt",
              image: '/api/placeholder/60/60',
              badge: 'HOT',
            },
            {
              id: 'blouses-shirts',
              name: "Women's Blouses & Shirts",
              image: '/api/placeholder/60/60',
            },
            {
              id: 'pants',
              name: "Women's Pants",
              image: '/api/placeholder/60/60',
            },
            {
              id: 'tank-tops-camis',
              name: "Women's Tank Tops & Camis",
              image: '/api/placeholder/60/60',
            },
            {
              id: 'coats-jackets',
              name: "Women's Coats & Jackets",
              image: '/api/placeholder/60/60',
            },
            {
              id: 'sweaters',
              name: "Women's Sweaters",
              image: '/api/placeholder/60/60',
            },
            {
              id: 'jeans',
              name: "Women's Jeans",
              image: '/api/placeholder/60/60',
            },
            {
              id: 'athleisure',
              name: "Women's Athleisure",
              image: '/api/placeholder/60/60',
            },
            {
              id: 'skirts',
              name: "Women's Skirts",
              image: '/api/placeholder/60/60',
            },
            {
              id: 'jumpsuits',
              name: "Women's Jumpsuits",
              image: '/api/placeholder/60/60',
            },
            {
              id: 'shorts',
              name: "Women's Shorts",
              image: '/api/placeholder/60/60',
            },
            {
              id: 'blazers',
              name: "Women's Blazers",
              image: '/api/placeholder/60/60',
            },
            {
              id: 'denim-shorts',
              name: "Women's Denim Shorts",
              image: '/api/placeholder/60/60',
            },
            {
              id: 'more-items',
              name: 'More Items',
              image: '/api/placeholder/60/60',
              badge: 'HOT',
            },
          ],
        },
      ],
    },
    {
      id: 'womens-curve-clothing',
      name: "Women's Curve Clothing",
      hasArrow: false,
      subcategories: [],
    },
    {
      id: 'womens-shoes',
      name: "Women's Shoes",
      hasArrow: true,
      subcategories: [],
    },
    {
      id: 'womens-lingerie-loungewear',
      name: "Women's Lingerie & Loungewear",
      hasArrow: true,
      subcategories: [],
    },
    {
      id: 'mens-clothing',
      name: "Men's Clothing",
      hasArrow: true,
      subcategories: [],
    },
    {
      id: 'mens-shoes',
      name: "Men's Shoes",
      hasArrow: true,
      subcategories: [],
    },
    {
      id: 'mens-big-tall',
      name: "Men's Big & Tall",
      hasArrow: true,
      subcategories: [],
    },
    {
      id: 'mens-underwear-sleepwear',
      name: "Men's Underwear & Sleepwear",
      hasArrow: true,
      subcategories: [],
    },
    {
      id: 'sports-outdoors',
      name: 'Sports & Outdoors',
      hasArrow: true,
      subcategories: [],
    },
    {
      id: 'jewelry-accessories',
      name: 'Jewelry & Accessories',
      hasArrow: true,
      subcategories: [],
    },
    {
      id: 'beauty-health',
      name: 'Beauty & Health',
      hasArrow: true,
      subcategories: [],
    },
    {
      id: 'toys-games',
      name: 'Toys & Games',
      hasArrow: true,
      subcategories: [],
    },
    {
      id: 'automotive',
      name: 'Automotive',
      hasArrow: true,
      subcategories: [],
    },
    {
      id: 'kids-fashion',
      name: "Kids' Fashion",
      hasArrow: true,
      subcategories: [],
    },
    {
      id: 'kids-shoes',
      name: "Kids' Shoes",
      hasArrow: true,
      subcategories: [],
    },
  ],
}

// API simulation function
export const fetchCategoriesData = async () => {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 300))

  return categoriesMenuData
}

// Function to get specific category data
export const getCategoryById = (categoryId: string) => {
  return categoriesMenuData.categories.find((cat) => cat.id === categoryId)
}
