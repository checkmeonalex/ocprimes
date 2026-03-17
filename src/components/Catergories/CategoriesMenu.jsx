// components/CategoriesMenu.jsx
'use client'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { fetchCategoriesData } from '@/lib/catalog/categories-menu'
import EmptyCategoryModal from '@/components/catalog/EmptyCategoryModal'

const createCategoryRevealMap = (categoryId = null) =>
  categoryId ? { [categoryId]: true } : {}

const CategoriesMenu = ({
  isOpen,
  onClose,
  initialActiveCategoryId = null,
  mobileTopOffset = 56,
  applyMobileOffset = false,
  panelRef = null,
  onMenuMouseEnter = undefined,
  onMenuMouseLeave = undefined,
  onEmptyCategoryModalChange = undefined,
}) => {
  const [categoriesData, setCategoriesData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeCategory, setActiveCategory] = useState(null)
  const [emptyCategory, setEmptyCategory] = useState(null)
  const [revealedCategoryMap, setRevealedCategoryMap] = useState(() =>
    createCategoryRevealMap(initialActiveCategoryId)
  )
  const desktopSidebarRef = useRef(null)
  const contentScrollRef = useRef(null)
  const categorySectionRefs = useRef(new Map())
  const categoryButtonRefs = useRef(new Map())
  const fallbackImage = `data:image/svg+xml;base64,${btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">
      <rect width="60" height="60" fill="#f3f4f6"/>
      <text x="30" y="30" text-anchor="middle" dy="0.35em" font-family="Arial" font-size="12" fill="#9ca3af">Image</text>
    </svg>
  `)}`

  const toCategorySlug = (value) =>
    String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

  const buildCategoryHref = (entry) => {
    const slug = toCategorySlug(entry?.slug || entry?.name || '')
    return slug ? `/products/${encodeURIComponent(slug)}` : '/products'
  }

  const renderCategoryItem = (item) => {
    const isEmptyCategory = item.hasProducts === false
    const itemContent = (
      <>
        <div className="relative mb-2">
          <div
            className={`w-16 h-16 lg:w-28 lg:h-28 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden transition-shadow ${
              isEmptyCategory
                ? 'grayscale brightness-[0.92]'
                : 'group-hover:shadow-md'
            }`}
          >
            <img
              src={item.image || fallbackImage}
              alt={item.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = fallbackImage
              }}
            />
          </div>
          {item.badge && (
            <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">
              {item.badge}
            </span>
          )}
        </div>
        <span
          className={`text-[11px] lg:text-sm text-center transition-colors ${
            isEmptyCategory
              ? 'text-gray-600'
              : 'text-gray-700 group-hover:text-blue-600'
          }`}
        >
          {item.name}
        </span>
      </>
    )

    if (isEmptyCategory) {
      return (
        <button
          key={item.id}
          type="button"
          onClick={() => openEmptyCategoryModal(item)}
          className="flex w-full max-w-[96px] flex-col items-center group cursor-pointer lg:max-w-[132px]"
        >
          {itemContent}
        </button>
      )
    }

    return (
      <Link
        key={item.id}
        href={buildCategoryHref(item)}
        onClick={onClose}
        className="flex w-full max-w-[96px] flex-col items-center group cursor-pointer lg:max-w-[132px]"
      >
        {itemContent}
      </Link>
    )
  }

  useEffect(() => {
    if (isOpen && !categoriesData) {
      loadCategoriesData()
    }
  }, [isOpen, categoriesData])

  useEffect(() => {
    if (isOpen) return
    setEmptyCategory(null)
    setRevealedCategoryMap(createCategoryRevealMap(initialActiveCategoryId))
  }, [isOpen])

  useEffect(() => {
    onEmptyCategoryModalChange?.(Boolean(emptyCategory))
  }, [emptyCategory, onEmptyCategoryModalChange])

  useEffect(() => {
    if (!isOpen || !applyMobileOffset) return undefined

    const originalBodyOverflow = document.body.style.overflow
    const originalHtmlOverflow = document.documentElement.style.overflow
    const originalBodyOverscroll = document.body.style.overscrollBehavior
    const originalHtmlOverscroll = document.documentElement.style.overscrollBehavior

    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overscrollBehavior = 'none'
    document.documentElement.style.overscrollBehavior = 'none'

    return () => {
      document.body.style.overflow = originalBodyOverflow
      document.documentElement.style.overflow = originalHtmlOverflow
      document.body.style.overscrollBehavior = originalBodyOverscroll
      document.documentElement.style.overscrollBehavior = originalHtmlOverscroll
    }
  }, [applyMobileOffset, isOpen])

  useEffect(() => {
    if (!categoriesData?.categories?.length) return
    if (!initialActiveCategoryId) return
    const match = categoriesData.categories.find(
      (category) => category.id === initialActiveCategoryId
    )
    if (match) {
      setActiveCategory(match)
    }
  }, [categoriesData, initialActiveCategoryId])

  useEffect(() => {
    setRevealedCategoryMap(createCategoryRevealMap(initialActiveCategoryId))
  }, [initialActiveCategoryId])

  useEffect(() => {
    const categories = categoriesData?.categories || []
    if (!categories.length) return
    if (activeCategory) return
    setActiveCategory(categories[0])
  }, [activeCategory, categoriesData])

  useEffect(() => {
    if (!isOpen) return undefined
    const scroller = contentScrollRef.current
    const categories = categoriesData?.categories || []
    if (!scroller || categories.length === 0) return undefined

    const updateActiveCategoryFromScroll = () => {
      const scrollerTop = scroller.getBoundingClientRect().top
      let nextActive = categories[0]
      let bestOffset = Number.POSITIVE_INFINITY

      for (const category of categories) {
        const node = categorySectionRefs.current.get(category.id)
        if (!node) continue
        const offset = node.getBoundingClientRect().top - scrollerTop
        const normalizedOffset = offset <= 96 ? Math.abs(offset) : offset + 1000

        if (normalizedOffset < bestOffset) {
          bestOffset = normalizedOffset
          nextActive = category
        }
      }

      setActiveCategory((current) =>
        current?.id === nextActive.id ? current : nextActive
      )
    }

    updateActiveCategoryFromScroll()
    scroller.addEventListener('scroll', updateActiveCategoryFromScroll, {
      passive: true,
    })

    return () => {
      scroller.removeEventListener('scroll', updateActiveCategoryFromScroll)
    }
  }, [categoriesData, isOpen])

  useEffect(() => {
    if (!activeCategory?.id) return
    const node = categoryButtonRefs.current.get(activeCategory.id)
    if (!node || typeof node.scrollIntoView !== 'function') return
    node.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [activeCategory])

  useEffect(() => {
    if (!isOpen) return
    const targetCategoryId =
      initialActiveCategoryId || categoriesData?.categories?.[0]?.id || null
    if (!targetCategoryId) return

    const frame = window.requestAnimationFrame(() => {
      const node = categorySectionRefs.current.get(targetCategoryId)
      if (!node || typeof node.scrollIntoView !== 'function') return
      node.scrollIntoView({ block: 'start', behavior: 'auto' })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [categoriesData, initialActiveCategoryId, isOpen])

  const loadCategoriesData = async () => {
    setLoading(true)
    try {
      const data = await fetchCategoriesData()
      setCategoriesData(data)
      if (initialActiveCategoryId) {
        const match = data?.categories?.find(
          (category) => category.id === initialActiveCategoryId
        )
        if (match) {
          setActiveCategory(match)
        }
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const registerCategorySection = (categoryId) => (node) => {
    if (node) {
      categorySectionRefs.current.set(categoryId, node)
      return
    }
    categorySectionRefs.current.delete(categoryId)
  }

  const registerCategoryButton = (categoryId) => (node) => {
    if (node) {
      categoryButtonRefs.current.set(categoryId, node)
      return
    }
    categoryButtonRefs.current.delete(categoryId)
  }

  const scrollToCategorySection = (category, behavior = 'smooth') => {
    if (!category?.id) return
    const scroller = contentScrollRef.current
    const node = categorySectionRefs.current.get(category.id)
    if (!node || !scroller) return

    const nextTop = Math.max(0, node.offsetTop - 12)
    if (typeof scroller.scrollTo === 'function') {
      scroller.scrollTo({ top: nextTop, behavior })
      return
    }

    scroller.scrollTop = nextTop
  }

  const revealCategory = (categoryId) => {
    if (!categoryId) return
    setRevealedCategoryMap((current) => ({
      ...current,
      [categoryId]: true,
    }))
  }

  const handleCategoryHover = (category) => {
    if (category.subcategories && category.subcategories.length > 0) {
      setActiveCategory(category)
      revealCategory(category.id)
      scrollToCategorySection(category, 'auto')
    }
  }

  const handleCategoryClick = (category) => {
    if (category.subcategories && category.subcategories.length > 0) {
      setActiveCategory(category)
      revealCategory(category.id)
      scrollToCategorySection(category, 'smooth')
    } else if (category.slug) {
      window.location.href = `/products/${encodeURIComponent(category.slug)}`
    }
  }

  const openEmptyCategoryModal = (item) => {
    if (!item?.id) return
    setEmptyCategory({
      id: String(item.id),
      name: String(item.name || '').trim(),
      slug: String(item.slug || '').trim(),
      imageUrl: String(item.image || '').trim(),
      imageAlt: String(item.name || '').trim(),
    })
  }

  const closeEmptyCategoryModal = () => {
    setEmptyCategory(null)
  }

  if (!isOpen) return null

  return (
    <div
      ref={panelRef}
      className="fixed inset-0 z-50 bg-white lg:static lg:w-[min(92vw,980px)] lg:overflow-hidden lg:rounded-b-2xl lg:border lg:border-slate-200 lg:shadow-xl"
      onMouseEnter={onMenuMouseEnter}
      onMouseLeave={emptyCategory ? undefined : onMenuMouseLeave}
      style={
        applyMobileOffset
          ? {
              top: `${mobileTopOffset}px`,
              height: `calc(100dvh - ${mobileTopOffset}px)`,
            }
          : undefined
      }
    >
      <div className="relative h-full min-h-0 overflow-hidden lg:max-h-[min(78vh,720px)]">
        <div className="h-full min-h-0 lg:w-full">
          <div className="flex h-full min-h-0 flex-row lg:max-h-[min(78vh,720px)]">
            {/* Categories Sidebar */}
           <div ref={desktopSidebarRef} className="desktop-menu-scroll h-full min-h-0 w-[32%] max-w-[32%] overflow-y-auto overscroll-contain border-r border-gray-200 bg-gray-50 py-3 touch-pan-y lg:max-h-[min(78vh,720px)] lg:max-w-[280px] lg:min-w-[240px] lg:py-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-1">
                  {categoriesData?.categories.map((category) => (
                    <button
                      key={category.id}
                      ref={registerCategoryButton(category.id)}
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
            <div ref={contentScrollRef} className="desktop-menu-scroll h-full min-h-0 flex-1 overflow-y-auto overscroll-contain py-3 pb-20 touch-pan-y lg:max-h-[min(78vh,720px)] lg:py-4 lg:pb-4 lg:max-w-[700px]">
              {categoriesData?.categories?.map((category) => (
                (() => {
                  const categoryAvailableItemCount = Array.isArray(category.subcategories)
                    ? category.subcategories.reduce((count, subcategory) => {
                        const items = Array.isArray(subcategory?.items) ? subcategory.items : []
                        return count + items.filter((item) => item.hasProducts !== false).length
                      }, 0)
                    : 0

                  return (
                    <section
                      key={category.id}
                      ref={registerCategorySection(category.id)}
                      data-category-section={category.id}
                      className="space-y-5 px-1 pb-6 lg:px-6 lg:pb-8"
                    >
                  {category.subcategories?.map((subcategory, subcategoryIndex) => {
                    const availableItems = Array.isArray(subcategory.items)
                      ? subcategory.items.filter((item) => item.hasProducts !== false)
                      : []
                    const comingSoonItems = Array.isArray(subcategory.items)
                      ? subcategory.items.filter((item) => item.hasProducts === false)
                      : []
                    const isCategoryRevealed = Boolean(revealedCategoryMap[category.id])
                    const visibleItems = availableItems
                    const visibleComingSoonItems = isCategoryRevealed ? comingSoonItems : []
                    const shouldShowViewAll =
                      Boolean(category?.slug) &&
                      categoryAvailableItemCount > 0 &&
                      subcategoryIndex === 0
                    const shouldHideSubcategory =
                      !isCategoryRevealed && availableItems.length === 0 && !shouldShowViewAll

                    if (shouldHideSubcategory) {
                      return null
                    }

                    return (
                    <div
                      key={subcategory.id}
                      className={subcategoryIndex > 0 ? 'border-t border-slate-100 pt-5' : ''}
                    >
                      <div className="mb-3 flex items-center justify-between lg:mb-4">
                        <h3 className="flex items-center text-sm font-semibold text-gray-900 lg:text-lg">
                          {subcategory.name}
                          {subcategory.hasArrow && (
                            <svg
                              className="ml-2 h-4 w-4 text-gray-400"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M9 18l6-6-6-6v12z" />
                            </svg>
                          )}
                        </h3>
                        {(subcategory?.slug || subcategory?.name || category?.slug) && (
                          <Link
                            href={buildCategoryHref(
                              subcategory?.slug || subcategory?.name ? subcategory : category
                            )}
                            onClick={onClose}
                            className="text-xs font-semibold text-blue-600 hover:underline"
                          >
                            View all
                          </Link>
                        )}
                      </div>

                      {Array.isArray(visibleItems) && (() => {
                        return (
                          <div className="space-y-5">
                            <div className="grid grid-cols-1 justify-items-center gap-x-1 gap-y-3 min-[280px]:grid-cols-2 min-[360px]:grid-cols-3 min-[500px]:grid-cols-4 lg:gap-x-4 lg:gap-y-8 xl:grid-cols-5">
                              {shouldShowViewAll && (
                                <Link
                                  key={`${category.id}-view-all`}
                                  href={buildCategoryHref(category)}
                                  onClick={onClose}
                                  className="flex w-full max-w-[96px] flex-col items-center gap-2 rounded-xl border border-gray-100 p-2 transition hover:border-gray-200 hover:shadow-sm lg:max-w-[132px] lg:p-2.5"
                                >
                                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-gray-300 bg-gray-50 text-gray-500 lg:h-24 lg:w-24">
                                    <svg
                                      className="h-6 w-6"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                    >
                                      <rect x="3" y="3" width="7" height="7" rx="1.5" />
                                      <rect x="14" y="3" width="7" height="7" rx="1.5" />
                                      <rect x="3" y="14" width="7" height="7" rx="1.5" />
                                      <rect x="14" y="14" width="7" height="7" rx="1.5" />
                                    </svg>
                                  </div>
                                  <span className="text-center text-[11px] font-semibold text-gray-800 lg:text-sm">
                                    View All
                                  </span>
                                </Link>
                              )}
                              {visibleItems.map(renderCategoryItem)}
                            </div>

                            {visibleComingSoonItems.length > 0 ? (
                              <div className="space-y-3 border-t border-slate-200/80 pt-4">
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                                    Coming soon
                                  </span>
                                  <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
                                </div>
                                <div className="grid grid-cols-1 justify-items-center gap-x-1 gap-y-3 min-[280px]:grid-cols-2 min-[360px]:grid-cols-3 min-[500px]:grid-cols-4 lg:gap-x-4 lg:gap-y-8 xl:grid-cols-5">
                                  {visibleComingSoonItems.map(renderCategoryItem)}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        )
                      })()}
                    </div>
                    )
                  })}
                    </section>
                  )
                })()
              ))}

              {!loading && !activeCategory && (
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

      <button
        onClick={onClose}
        className="fixed bottom-4 left-1/2 z-[60] -translate-x-1/2 inline-flex items-center rounded-full border border-slate-300 bg-white/95 px-3 py-1 text-xs font-semibold text-slate-700 shadow-md backdrop-blur lg:hidden"
      >
        Close
      </button>

      <EmptyCategoryModal
        isOpen={Boolean(emptyCategory)}
        category={emptyCategory}
        onClose={closeEmptyCategoryModal}
      />

      <style jsx>{`
        @media (min-width: 768px) {
          .desktop-menu-scroll {
            scrollbar-width: thin;
            scrollbar-color: rgba(148, 163, 184, 0.45) transparent;
          }

          .desktop-menu-scroll::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }

          .desktop-menu-scroll::-webkit-scrollbar-track {
            background: transparent;
          }

          .desktop-menu-scroll::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.42);
            border-radius: 999px;
            border: 2px solid transparent;
            background-clip: padding-box;
          }

          .desktop-menu-scroll::-webkit-scrollbar-thumb:hover {
            background: rgba(100, 116, 139, 0.55);
            border: 2px solid transparent;
            background-clip: padding-box;
          }
        }
      `}</style>
    </div>
  )
}

export default CategoriesMenu
