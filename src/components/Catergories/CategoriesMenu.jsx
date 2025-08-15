// components/CategoriesMenu.jsx
'use client'
import { useState, useEffect } from 'react'
import { fetchCategoriesData } from '../data/categoriesMenuData.ts'

const CategoriesMenu = ({ isOpen, onClose }) => {
  const [categoriesData, setCategoriesData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeCategory, setActiveCategory] = useState(null)

  useEffect(() => {
    if (isOpen && !categoriesData) {
      loadCategoriesData()
    }
  }, [isOpen, categoriesData])

  const loadCategoriesData = async () => {
    setLoading(true)
    try {
      const data = await fetchCategoriesData()
      setCategoriesData(data)
    } catch (error) {
      console.error('Error loading categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCategoryHover = (category) => {
    if (category.subcategories && category.subcategories.length > 0) {
      setActiveCategory(category)
    }
  }

  const handleCategoryClick = (category) => {
    if (category.subcategories && category.subcategories.length > 0) {
      setActiveCategory(activeCategory?.id === category.id ? null : category)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-white z-50 lg:absolute lg:inset-auto lg:top-full">
      <div className="h-full lg:h-auto overflow-y-auto">
        <div className="lg:max-w-7xl lg:mx-auto lg:px-8">
          {/* Mobile Header */}
          <div className="flex items-center justify-between py-4 px-4 border-b border-gray-200 lg:hidden">
            <h2 className="text-base font-semibold">Categories</h2>
            <button onClick={onClose} className="p-2 text-gray-500">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex">
            {/* Categories Sidebar */}
           <div className="max-w-[30%] w-full bg-gray-50 border-r border-gray-200 py-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-1">
                  {categoriesData?.categories.map((category) => (
                    <button
                      key={category.id}
                      className={`w-full flex items-center justify-between px-4 py-3 text-left text-sm hover:bg-gray-100 transition-colors duration-150 ${
                        activeCategory?.id === category.id ? 'bg-gray-100 text-blue-600' : 'text-gray-700'
                      }`}
                      onMouseEnter={() => handleCategoryHover(category)}
                      onClick={() => handleCategoryClick(category)}
                    >
                      <span className="font-medium">{category.name}</span>
                      {category.hasArrow && (
                        <svg
                          className="h-4 w-4 text-gray-400"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M9 18l6-6-6-6v12z" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Subcategories Content */}
            <div className="flex-1 py-4">
              {activeCategory?.subcategories?.map((subcategory) => (
                <div key={subcategory.id} className="px-1 lg:px-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      {subcategory.name}
                      {subcategory.hasArrow && (
                        <svg
                          className="h-4 w-4 ml-2 text-gray-400"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M9 18l6-6-6-6v12z" />
                        </svg>
                      )}
                    </h3>
                  </div>

                  {/* Items Grid - Responsive: 3 columns on mobile, 5 on desktop */}
                  {subcategory.items && (
                    <div className="grid grid-cols-3 lg:grid-cols-5 gap-6">
                      {subcategory.items.map((item) => (
                        <div key={item.id} className="flex flex-col items-center group cursor-pointer">
                          <div className="relative mb-2">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden group-hover:shadow-md transition-shadow">
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.src = `data:image/svg+xml;base64,${btoa(`
                                    <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">
                                      <rect width="60" height="60" fill="#f3f4f6"/>
                                      <text x="30" y="30" text-anchor="middle" dy="0.35em" font-family="Arial" font-size="12" fill="#9ca3af">Image</text>
                                    </svg>
                                  `)}`
                                }}
                              />
                            </div>
                            {item.badge && (
                              <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-center text-gray-700 group-hover:text-blue-600 transition-colors">
                            {item.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {!activeCategory && (
                <div className="px-2 lg:px-6 py-8 text-center text-gray-500">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400 mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                    />
                  </svg>
                  <p>Hover over a category to see subcategories</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CategoriesMenu