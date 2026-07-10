// components/Navbar.jsx
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useCart } from '../context/CartContext'
import CategoriesMenu from './Catergories/CategoriesMenu'
import BrandLogo from './common/BrandLogo'
import { fetchCategoriesData } from '@/lib/catalog/categories-menu'
import { getRecentlyViewed } from '@/lib/recently-viewed/storage'
import UserMenu from './auth/UserMenu'
import { useUserI18n } from '@/lib/i18n/useUserI18n'
import { getAccountSearchSuggestions } from '@/lib/user/account-search.ts'
import { formatSuggestionLabel } from '@/components/search/formatSuggestionLabel'
import { openPopularSearchTarget } from '@/components/search/openPopularSearchTarget'
import PopularRightNowSection from '@/components/search/PopularRightNowSection'
import { usePopularSearchItems } from '@/components/search/usePopularSearchItems'
import { useSearchSuggestions } from '@/components/search/useSearchSuggestions'
import { reportSearchQuery } from '@/components/search/reportSearchQuery'
import { useAuthUser } from '@/lib/auth/useAuthUser'
import { useVendorPage } from '@/context/VendorPageContext'

const hiddenHorizontalScrollbarClass =
  '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'
const searchPlaceholderFallbackItems = [
  'Sneaker Drop',
  'Women Dresses',
  'Beauty Steals',
  'Men Sneakers',
  'New Arrivals',
]

export default function Navbar({
  initialAuthUser = null,
  initialTopCategories = [],
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { summary, isReady, isServerReady } = useCart()
  const { user } = useAuthUser(initialAuthUser, Boolean(initialAuthUser))
  const { setIsMainNavVisible } = useVendorPage()
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false)
  const [isCategoryMenuModalOpen, setIsCategoryMenuModalOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isSearchCategoryOpen, setIsSearchCategoryOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [selectedSearchCategory, setSelectedSearchCategory] = useState({
    name: 'All',
    slug: '',
  })
  const [recentSearches, setRecentSearches] = useState([])
  const [topCategories, setTopCategories] = useState(() =>
    Array.isArray(initialTopCategories) ? initialTopCategories : [],
  )
  const [activeTopCategoryId, setActiveTopCategoryId] = useState(() => {
    if (!Array.isArray(initialTopCategories) || !initialTopCategories.length) {
      return null
    }
    return initialTopCategories[0]?.id || null
  })
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isHistoryPinned, setIsHistoryPinned] = useState(false)
  const [historyHoverTimeout, setHistoryHoverTimeout] = useState(null)
  const [historyItems, setHistoryItems] = useState([])
  const [isDesktopHeaderVisible, setIsDesktopHeaderVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [hasVendorAccess, setHasVendorAccess] = useState(false)
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)
  const [accountSearchValue, setAccountSearchValue] = useState('')
  const [isAccountSearchOpen, setIsAccountSearchOpen] = useState(false)
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const [placeholderPopularIndex, setPlaceholderPopularIndex] = useState(0)
  const { formatMoney } = useUserI18n()

  const isVendorStore = useMemo(() => {
    const firstSegment = pathname?.split('/')[1]
    if (!firstSegment) return false
    const platformRoutes = [
      'about', 'admin', 'api', 'auth', 'cart', 'checkout',
      'forgot-password', 'help-center', 'legal', 'login',
      'offline', 'privacy-policy', 'product', 'products',
      'reset-password', 'sellersignup', 'signup', 'stores', 'vendors',
      'wishlist', 'w', 'UserBackend', 'account', 'recently-viewed'
    ]
    return !platformRoutes.includes(firstSegment)
  }, [pathname])
  const isProductPage = pathname?.startsWith('/product/')

  const {
    suggestions: liveSearchSuggestions,
    isLoading: isLiveSearchLoading,
    hasQuery: hasLiveSearchQuery,
  } = useSearchSuggestions({
    query: searchValue,
    enabled: isSearchOpen,
    limit: 6,
  })
  const { items: popularSearchItems } = usePopularSearchItems({
    enabled: !hasLiveSearchQuery,
    limit: 10,
  })

  const categoriesRef = useRef(null)
  const menuPanelRef = useRef(null)
  const categoriesHoverTimeoutRef = useRef(null)
  const searchContainerRef = useRef(null)
  const accountSearchRef = useRef(null)
  const browsingHistoryRef = useRef(null)
  const historyPanelRef = useRef(null)
  const historyListRef = useRef(null)

  const placeholderChipImage =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" rx="20" fill="%23e5e7eb"/></svg>'
  const CATEGORIES_OPEN_HOVER_DELAY_MS = 300
  const CATEGORIES_CLOSE_HOVER_DELAY_MS = 200
  const animatedPlaceholderItems = useMemo(
    () =>
      popularSearchItems
        .map((item) => String(item?.label || '').trim())
        .filter(Boolean)
        .slice(0, 8),
    [popularSearchItems],
  )
  const rotatingSearchPlaceholderItems = useMemo(
    () => [
      'What are you looking for today?',
      ...(animatedPlaceholderItems.length
        ? animatedPlaceholderItems
        : searchPlaceholderFallbackItems),
    ],
    [animatedPlaceholderItems],
  )
  const topBarCategoryItems = useMemo(() => {
    if (!Array.isArray(topCategories) || topCategories.length === 0) return []

    if (topCategories.length !== 1) {
      return topCategories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug || '',
        hoverCategory: category,
      }))
    }

    const onlyCategory = topCategories[0]
    const firstSubcategoryGroup = Array.isArray(onlyCategory?.subcategories)
      ? onlyCategory.subcategories[0]
      : null
    const childItems = Array.isArray(firstSubcategoryGroup?.items)
      ? firstSubcategoryGroup.items
      : []

    if (!childItems.length) {
      return [
        {
          id: onlyCategory.id,
          name: onlyCategory.name,
          slug: onlyCategory.slug || '',
          hoverCategory: onlyCategory,
        },
      ]
    }

    return childItems.map((child) => ({
      id: child.id,
      name: child.name,
      slug: child.slug || '',
      hoverCategory: onlyCategory,
    }))
  }, [topCategories])

  const clearCategoriesHoverTimeout = () => {
    if (!categoriesHoverTimeoutRef.current) return
    clearTimeout(categoriesHoverTimeoutRef.current)
    categoriesHoverTimeoutRef.current = null
  }

  const isWithinCategoriesArea = (node) => {
    if (!node) return false
    return Boolean(
      categoriesRef.current?.contains(node) || menuPanelRef.current?.contains(node),
    )
  }

  const scheduleCategoriesOpen = () => {
    clearCategoriesHoverTimeout()
    if (isCategoriesOpen) return
    categoriesHoverTimeoutRef.current = setTimeout(() => {
      setIsCategoriesOpen(true)
      categoriesHoverTimeoutRef.current = null
    }, CATEGORIES_OPEN_HOVER_DELAY_MS)
  }

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('ocp_recent_searches')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          const normalized = parsed
            .map((item) => {
              if (typeof item === 'string') {
                return { term: item, image: '' }
              }
              if (item && typeof item.term === 'string') {
                return { term: item.term, image: item.image || '' }
              }
              return null
            })
            .filter(Boolean)
          setRecentSearches(normalized)
        }
      }
    } catch {
      // ignore storage errors
    }
  }, [])

  useEffect(() => {
    if (rotatingSearchPlaceholderItems.length <= 1) {
      setPlaceholderPopularIndex(0)
      return
    }

    const initialTimeoutId = window.setTimeout(() => {
      setPlaceholderPopularIndex((current) => (current + 1) % rotatingSearchPlaceholderItems.length)
    }, 2200)

    const intervalId = window.setInterval(() => {
      setPlaceholderPopularIndex((current) => (current + 1) % rotatingSearchPlaceholderItems.length)
    }, 3800)

    return () => {
      window.clearTimeout(initialTimeoutId)
      window.clearInterval(intervalId)
    }
  }, [rotatingSearchPlaceholderItems])

  const persistRecentSearches = (next) => {
    setRecentSearches(next)
    try {
      window.localStorage.setItem('ocp_recent_searches', JSON.stringify(next))
    } catch {
      // ignore storage errors
    }
  }

  const fetchFirstSearchImage = async (term) => {
    try {
      const response = await fetch(
        `/api/products?search=${encodeURIComponent(term)}&per_page=1&page=1`,
      )
      if (!response.ok) return ''
      const payload = await response.json().catch(() => null)
      const first = payload?.items?.[0]
      return first?.image_url || first?.image || first?.images?.[0]?.url || ''
    } catch {
      return ''
    }
  }

  const pushRecentSearch = (term, image = '') => {
    const trimmed = term.trim()
    if (!trimmed) return []

    const existing = recentSearches.find((item) => item.term === trimmed)
    const next = [
      { term: trimmed, image: image || existing?.image || '' },
      ...recentSearches.filter((item) => item.term !== trimmed),
    ].slice(0, 8)

    persistRecentSearches(next)
    return next
  }

  const handleSearchSubmit = async (value) => {
    const trimmed = value.trim()
    if (!trimmed) return

    const next = pushRecentSearch(trimmed)
    void reportSearchQuery(trimmed)

    const image = await fetchFirstSearchImage(trimmed)
    if (image) {
      const updated = [
        { term: trimmed, image },
        ...next.filter((item) => item.term !== trimmed),
      ].slice(0, 8)
      persistRecentSearches(updated)
    }

    const params = new URLSearchParams()
    params.set('search', trimmed)
    if (selectedSearchCategory?.slug) {
      params.set('category', selectedSearchCategory.slug)
    }
    router.push(`/products?${params.toString()}`)
    setIsSearchOpen(false)
    setIsSearchCategoryOpen(false)
  }

  const handleSearchSuggestionSelect = (suggestion) => {
    if (!suggestion?.href) return
    pushRecentSearch(suggestion.label || searchValue, suggestion.imageUrl || '')
    if (suggestion.kind === 'query') {
      void reportSearchQuery(suggestion.label || '')
    }
    setSearchValue(suggestion.label || '')
    setIsSearchOpen(false)
    setIsSearchCategoryOpen(false)
    router.push(suggestion.href)
  }

  const handleClearSearchInput = () => {
    setSearchValue('')
    setIsSearchOpen(false)
    setIsSearchCategoryOpen(false)
  }

  const handlePopularSearchSelect = (item) => {
    const targetUrl = String(item?.targetUrl || '').trim()
    if (!targetUrl) return

    setIsSearchOpen(false)
    setIsSearchCategoryOpen(false)
    openPopularSearchTarget(targetUrl)
  }

  const getSuggestionThumbClassName = (kind) => {
    if (kind === 'product') return 'h-11 w-11 rounded-xl object-cover'
    if (kind === 'brand') return 'h-11 w-11 rounded-2xl object-cover'
    return 'h-11 w-11 rounded-full object-cover'
  }

  const getSuggestionFallbackClassName = (kind) => {
    if (kind === 'product') {
      return 'inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef0f2] text-slate-500'
    }
    if (kind === 'brand') {
      return 'inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef0f2] text-slate-500'
    }
    return 'inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#eef0f2] text-slate-500'
  }

  const renderSuggestionFallbackIcon = (kind) => {
    if (kind === 'category') {
      return (
        <svg
          className='h-5 w-5'
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
          aria-hidden='true'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={1.8}
            d='M4.75 6.75A2 2 0 0 1 6.75 4.75h3.5a2 2 0 0 1 2 2v3.5a2 2 0 0 1-2 2h-3.5a2 2 0 0 1-2-2zm7 0a2 2 0 0 1 2-2h3.5a2 2 0 0 1 2 2v3.5a2 2 0 0 1-2 2h-3.5a2 2 0 0 1-2-2zm-7 7a2 2 0 0 1 2-2h3.5a2 2 0 0 1 2 2v3.5a2 2 0 0 1-2 2h-3.5a2 2 0 0 1-2-2zm7 0a2 2 0 0 1 2-2h3.5a2 2 0 0 1 2 2v3.5a2 2 0 0 1-2 2h-3.5a2 2 0 0 1-2-2z'
          />
        </svg>
      )
    }

    return (
      <svg
        className='h-5 w-5'
        fill='none'
        stroke='currentColor'
        viewBox='0 0 24 24'
        aria-hidden='true'
      >
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={1.8}
          d='m21 21-4.3-4.3m1.3-5.2a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0'
        />
      </svg>
    )
  }

  const activeAnimatedPlaceholder =
    rotatingSearchPlaceholderItems[placeholderPopularIndex] || 'What are you looking for today?'
  const showAnimatedSearchPlaceholder = !searchValue.trim() && !isSearchOpen

  const handleSearchKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      void handleSearchSubmit(searchValue)
    }

    if (event.key === 'Escape') {
      setIsSearchOpen(false)
      setIsSearchCategoryOpen(false)
    }
  }

  const clearRecentSearches = () => {
    persistRecentSearches([])
  }

  const handleAccountSearchSelect = (item) => {
    if (!item?.href) return
    setAccountSearchValue(item.label || '')
    setIsAccountSearchOpen(false)
    router.push(item.href)
  }

  const handleAccountSearchKeyDown = (event, suggestions) => {
    if (event.key === 'Escape') {
      setIsAccountSearchOpen(false)
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      if (!suggestions.length) return
      handleAccountSearchSelect(suggestions[0])
    }
  }

  const handleDashboardLogout = async () => {
    setIsLoggingOut(true)
    setLogoutError('')
    try {
      const response = await fetch('/api/auth/signout', { method: 'POST' })
      if (!response.ok) {
        throw new Error('Logout failed')
      }
      setIsLogoutConfirmOpen(false)
      router.refresh()
      router.push('/login')
    } catch {
      setLogoutError('Unable to log out right now. Please try again.')
    } finally {
      setIsLoggingOut(false)
    }
  }

  const openLogoutConfirm = () => {
    setLogoutError('')
    setIsLogoutConfirmOpen(true)
  }

  const closeLogoutConfirm = () => {
    if (isLoggingOut) return
    setLogoutError('')
    setIsLogoutConfirmOpen(false)
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target)
      ) {
        setIsSearchOpen(false)
        setIsSearchCategoryOpen(false)
      }

      if (
        accountSearchRef.current &&
        !accountSearchRef.current.contains(event.target)
      ) {
        setIsAccountSearchOpen(false)
      }

    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isCategoryMenuModalOpen) return
      if (!isWithinCategoriesArea(event.target)) {
        clearCategoriesHoverTimeout()
        setIsCategoriesOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      clearCategoriesHoverTimeout()
    }
  }, [isCategoryMenuModalOpen])

  useEffect(() => {
    let cancelled = false

    const loadTopCategories = async () => {
      if (Array.isArray(initialTopCategories) && initialTopCategories.length) {
        return
      }
      const data = await fetchCategoriesData()
      if (cancelled) return
      const categories = Array.isArray(data?.categories) ? data.categories : []
      setTopCategories(categories)
      if (categories.length) {
        setActiveTopCategoryId(categories[0].id || null)
      }
    }

    void loadTopCategories()
    return () => {
      cancelled = true
    }
  }, [initialTopCategories])

  useEffect(() => {
    let cancelled = false

    const loadRole = async () => {
      if (!user) {
        setHasVendorAccess(false)
        return
      }

      try {
        const response = await fetch('/api/auth/role', { cache: 'no-store' })
        if (!response.ok) {
          if (!cancelled) setHasVendorAccess(false)
          return
        }
        const payload = await response.json().catch(() => null)
        if (cancelled) return
        const normalizedRole = String(payload?.role || '')
          .trim()
          .toLowerCase()
        const roleList = Array.isArray(payload?.roles)
          ? payload.roles.map((role) => String(role || '').trim().toLowerCase())
          : []
        const canAccess =
          normalizedRole === 'vendor' ||
          normalizedRole === 'seller' ||
          normalizedRole === 'admin' ||
          roleList.includes('vendor') ||
          roleList.includes('seller') ||
          roleList.includes('admin') ||
          Boolean(payload?.is_vendor) ||
          Boolean(payload?.is_admin)
        setHasVendorAccess(canAccess)
      } catch {
        if (!cancelled) setHasVendorAccess(false)
      }
    }

    void loadRole()
    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY
      const nearTop = currentY < 20
      const scrollingUp = currentY < lastScrollY

      const shouldShow = nearTop || scrollingUp

      setIsDesktopHeaderVisible(shouldShow)
      if (isVendorStore || isProductPage) {
        setIsMainNavVisible(shouldShow)
      } else {
        setIsMainNavVisible(true)
      }
      setLastScrollY(currentY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY, isVendorStore, isProductPage, setIsMainNavVisible])

  useEffect(() => {
    if (!isLogoutConfirmOpen) return undefined

    const handleEscape = (event) => {
      if (event.key === 'Escape' && !isLoggingOut) {
        setLogoutError('')
        setIsLogoutConfirmOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isLogoutConfirmOpen, isLoggingOut])

  const handleCategoriesMouseEnter = () => {
    setIsHistoryOpen(false)
    setIsHistoryPinned(false)
    scheduleCategoriesOpen()
  }

  const handleCategoriesMouseLeave = (event) => {
    if (isCategoryMenuModalOpen) return
    const nextTarget = event?.relatedTarget
    if (isWithinCategoriesArea(nextTarget)) return
    clearCategoriesHoverTimeout()
    categoriesHoverTimeoutRef.current = setTimeout(() => {
      setIsCategoriesOpen(false)
      categoriesHoverTimeoutRef.current = null
    }, CATEGORIES_CLOSE_HOVER_DELAY_MS)
  }

  const handleTopCategoryHover = (category) => {
    if (!category) return
    setIsHistoryOpen(false)
    setIsHistoryPinned(false)
    setActiveTopCategoryId(category.id || null)
    scheduleCategoriesOpen()
  }

  const handleHistoryMouseEnter = () => {
    if (historyHoverTimeout) clearTimeout(historyHoverTimeout)
    clearCategoriesHoverTimeout()
    setHistoryItems(getRecentlyViewed())
    setIsCategoriesOpen(false)
    setIsHistoryOpen(true)
  }

  const isWithinHistoryArea = (node) => {
    if (!node) return false
    return Boolean(
      browsingHistoryRef.current?.contains(node) ||
        historyPanelRef.current?.contains(node),
    )
  }

  const handleHistoryMouseLeave = (event) => {
    const nextTarget = event?.relatedTarget
    if (isWithinHistoryArea(nextTarget)) return
    if (isHistoryPinned) return
    const timeout = setTimeout(() => {
      setIsHistoryOpen(false)
    }, 380)
    setHistoryHoverTimeout(timeout)
  }

  const handleHistoryClick = () => {
    if (historyHoverTimeout) clearTimeout(historyHoverTimeout)
    clearCategoriesHoverTimeout()
    setHistoryItems(getRecentlyViewed())
    setIsCategoriesOpen(false)
    setIsHistoryOpen((prev) => {
      const nextOpen = !prev
      setIsHistoryPinned(nextOpen)
      return nextOpen
    })
  }

  const scrollHistoryList = (direction) => {
    if (!historyListRef.current) return
    const offset = direction === 'left' ? -280 : 280
    historyListRef.current.scrollBy({ left: offset, behavior: 'smooth' })
  }

  const cartCount = summary?.itemCount ?? 0
  const showCartLoadingSpinner = (!isReady || !isServerReady) && cartCount <= 0
  const showLiveSuggestionPanel = isSearchOpen && hasLiveSearchQuery
  const isCartRoute = pathname?.startsWith('/cart')
  const isCheckoutRoute = pathname?.startsWith('/checkout')
  const isCheckoutFlow = isCartRoute || isCheckoutRoute
  const isHomePage = pathname === '/'
  const isUserDashboard = pathname?.startsWith('/UserBackend') || pathname === '/account' || pathname?.startsWith('/account/')
  const hasAccountSearchQuery = accountSearchValue.trim().length > 0
  const accountSearchSuggestions = useMemo(
    () =>
      getAccountSearchSuggestions({
        query: accountSearchValue,
        hasVendorAccess,
        limit: 8,
      }),
    [accountSearchValue, hasVendorAccess],
  )

  useEffect(() => {
    if (isUserDashboard) return
    setIsAccountSearchOpen(false)
    setAccountSearchValue('')
  }, [isUserDashboard])

  useEffect(() => {
    let cancelled = false

    const loadUnreadNotifications = async () => {
      if (!isUserDashboard || !user) {
        setUnreadNotificationCount(0)
        return
      }

      const params = new URLSearchParams({
        page: '1',
        per_page: '1',
        read_status: 'unread',
      })

      try {
        const response = await fetch(`/api/user/notifications?${params.toString()}`, {
          cache: 'no-store',
        })
        if (!response.ok) {
          if (!cancelled) setUnreadNotificationCount(0)
          return
        }
        const payload = await response.json().catch(() => null)
        if (cancelled) return
        const unread = Number(payload?.summary?.unread || 0)
        setUnreadNotificationCount(Number.isFinite(unread) && unread > 0 ? unread : 0)
      } catch {
        if (!cancelled) setUnreadNotificationCount(0)
      }
    }

    void loadUnreadNotifications()
    return () => {
      cancelled = true
    }
  }, [isUserDashboard, pathname, user])

  const showDashboardPrimaryBar = lastScrollY < 20
  const checkoutCurrentStep = isCartRoute
    ? 'account'
    : pathname?.startsWith('/checkout/awaiting-payment')
      ? 'review'
    : pathname?.startsWith('/checkout/review')
      ? 'review'
      : pathname?.startsWith('/checkout/payment')
        ? 'payment'
        : 'delivery'
  const checkoutStepOrder = ['account', 'delivery', 'payment', 'review']
  const checkoutCurrentStepIndex = Math.max(
    0,
    checkoutStepOrder.indexOf(checkoutCurrentStep),
  )
  const checkoutBackHref = isCartRoute
    ? '/'
    : pathname?.startsWith('/checkout/awaiting-payment')
      ? '/checkout/payment'
    : pathname?.startsWith('/checkout/review')
      ? '/checkout/payment'
      : pathname?.startsWith('/checkout/payment')
        ? '/checkout/shipping'
        : '/cart'
  const isCheckoutReviewSuccess =
    pathname?.startsWith('/checkout/review') &&
    String(searchParams?.get('payment_reference') || '').trim().length > 0
  const checkoutHeaderActionHref = isCheckoutReviewSuccess ? '/' : checkoutBackHref
  const checkoutHeaderActionLabel = isCheckoutReviewSuccess ? 'Continue shopping' : 'Back'
  const formatPrice = (value) => {
    if (!Number.isFinite(Number(value))) return '--'
    return formatMoney(Number(value))
  }

  const getDiscountPercent = (price, originalPrice) => {
    const p = Number(price)
    const op = Number(originalPrice)
    if (!Number.isFinite(p) || !Number.isFinite(op) || op <= p || op <= 0) return null
    return Math.max(1, Math.round(((op - p) / op) * 100))
  }

  const HeaderAction = ({ href, label, children }) => {
    return (
      <Link
        href={href}
        className='inline-flex items-center gap-1 rounded-md px-1.5 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100 xl:gap-2 xl:px-2'
      >
        {children}
        <span className='hidden leading-tight xl:inline'>{label}</span>
      </Link>
    )
  }

  if (isCheckoutFlow) {
    return (
      <nav className='fixed left-0 right-0 top-0 z-40 hidden border-b border-gray-200 bg-white sm:block'>
        <div className='w-full px-3 sm:px-4 lg:mx-auto lg:max-w-[1400px] lg:px-8'>
          <div className='grid h-16 grid-cols-[auto_1fr_auto] items-center gap-3'>
            <div>
              <Link
                href={checkoutHeaderActionHref}
                className='inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-[#eef0f2] px-3 py-1.5 text-xs font-medium text-slate-900 hover:bg-[#e6e8ea] xl:px-4 xl:py-2 xl:text-sm'
              >
                <svg
                  viewBox='0 0 20 20'
                  className='h-4 w-4'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  aria-hidden='true'
                >
                  <path d='m12.5 4.5-5 5 5 5' strokeLinecap='round' strokeLinejoin='round' />
                </svg>
                {checkoutHeaderActionLabel}
              </Link>
            </div>

            <div className='min-w-0'>
              <ol className='mx-auto flex w-fit max-w-full items-center justify-center gap-2 overflow-x-auto px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden xl:gap-3'>
              {checkoutStepOrder.map((stepKey, index) => {
                const isFinalSuccessfulStep = isCheckoutReviewSuccess && stepKey === 'review'
                const isDone = index < checkoutCurrentStepIndex || isFinalSuccessfulStep
                const isCurrent = index === checkoutCurrentStepIndex && !isFinalSuccessfulStep
                const label =
                  stepKey === 'account'
                    ? 'Cart'
                    : stepKey === 'delivery'
                      ? 'Shipping'
                      : stepKey === 'payment'
                        ? 'Pay'
                        : 'Checkout'
                return (
                  <li key={stepKey} className='flex shrink-0 items-center gap-1.5 xl:gap-2.5'>
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold xl:h-8 xl:w-8 xl:text-sm ${
                        isDone
                          ? 'border-white/85 bg-white/40 text-slate-700 backdrop-blur-xl'
                          : isCurrent
                            ? 'border-slate-800 bg-gradient-to-b from-slate-700 to-slate-900 text-white'
                            : 'border-slate-300 bg-[#f8f8f8] text-slate-500'
                      }`}
                    >
                      {isDone ? (
                        <svg
                          viewBox='0 0 20 20'
                          className='h-5 w-5'
                          fill='none'
                          stroke='currentColor'
                          strokeWidth='2.4'
                          aria-hidden='true'
                        >
                          <path
                            d='M4.8 10.5 8.1 13.8l7-7'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                          />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span
                      className={`whitespace-nowrap text-sm font-medium xl:text-base ${
                        isDone || isCurrent ? 'text-slate-900' : 'text-slate-500'
                      }`}
                    >
                      {label}
                    </span>
                    {index < checkoutStepOrder.length - 1 ? (
                      <span className='mx-0.5 h-px w-6 bg-slate-400/70 xl:mx-1 xl:w-10' aria-hidden='true' />
                    ) : null}
                  </li>
                )
              })}
              </ol>
            </div>

            <div className='hidden justify-self-end lg:block'>
              <UserMenu variant='compactChip' initialAuthUser={initialAuthUser} />
            </div>
          </div>
        </div>
      </nav>
    )
  }

  return (
    <nav
      className={`fixed left-0 right-0 top-0 z-40 hidden border-b border-gray-200 ${
        isCheckoutFlow ? 'bg-[#f3f4f6]' : 'bg-white'
      } lg:block ${
        isUserDashboard
          ? ''
          : `transition-transform duration-300 ${
              isDesktopHeaderVisible ? 'translate-y-0' : '-translate-y-full'
            }`
      }`}
    >
      <div
        className={`mx-auto w-full max-w-[1400px] overflow-visible px-4 transition-all duration-300 sm:px-6 lg:px-8 ${
          isUserDashboard
            ? showDashboardPrimaryBar
              ? 'max-h-16 opacity-100'
              : 'max-h-0 opacity-0'
            : 'max-h-16 opacity-100'
        }`}
      >
        <div className='flex h-14 items-center gap-3 xl:h-16 xl:gap-5'>
        <div className='flex shrink-0 items-center gap-2 xl:gap-5'>
          <BrandLogo
            href='/'
            className='inline-flex items-center gap-2 text-gray-900 xl:gap-3'
            markClassName='h-8 w-8 shrink-0 text-[#f5d10b]'
            labelClassName='text-lg font-semibold tracking-tight text-current xl:text-xl'
          />

          <div
            className='relative'
            ref={categoriesRef}
            onMouseEnter={handleCategoriesMouseEnter}
            onMouseLeave={handleCategoriesMouseLeave}
          >
            <button
              type='button'
              className='inline-flex h-9 items-center gap-1 rounded-md border border-gray-300 bg-gray-50 px-2 text-[11px] font-semibold text-gray-900 hover:bg-gray-100 xl:gap-1.5 xl:px-2.5 xl:text-xs'
              onClick={() => {
                clearCategoriesHoverTimeout()
                setIsHistoryOpen(false)
                setIsHistoryPinned(false)
                setIsCategoriesOpen((prev) => !prev)
              }}
            >
              <svg
                className='h-4 w-4'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
                strokeWidth={2}
                aria-hidden='true'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z'
                />
              </svg>
              <span className='hidden xl:inline'>All Categories</span>
              <span className='xl:hidden'>Categories</span>
              <svg
                className={`h-4 w-4 transition-transform ${isCategoriesOpen ? 'rotate-180' : ''}`}
                fill='currentColor'
                viewBox='0 0 20 20'
                aria-hidden='true'
              >
                <path d='M5.3 7.3 10 12l4.7-4.7 1.4 1.4L10 14.8 3.9 8.7z' />
              </svg>
            </button>
          </div>
        </div>

        <div className='relative min-w-0 flex-1' ref={searchContainerRef}>
          <div className='flex h-10 w-full items-center overflow-hidden rounded-full border-2 border-gray-500 bg-white transition-all duration-150 focus-within:rounded-md focus-within:border-black xl:h-11'>
            <button
              type='button'
              className='inline-flex h-full shrink-0 items-center gap-1 border-r border-gray-200 bg-white px-2.5 text-xs font-medium text-gray-900 xl:gap-2 xl:px-4 xl:text-sm'
              onClick={() => setIsSearchCategoryOpen((prev) => !prev)}
            >
              <span>{selectedSearchCategory.name || 'All'}</span>
              <svg className='h-4 w-4 text-gray-600' fill='currentColor' viewBox='0 0 20 20'>
                <path d='M5.3 7.3 10 12l4.7-4.7 1.4 1.4L10 14.8 3.9 8.7z' />
              </svg>
            </button>

            <div className='relative h-full w-full'>
              {showAnimatedSearchPlaceholder ? (
                <div className='pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center overflow-hidden px-3 text-xs xl:px-4 xl:text-sm'>
                  <span
                    key={activeAnimatedPlaceholder}
                    className='inline-block max-w-full truncate text-slate-400'
                    style={{ animation: 'searchPlaceholderSlide 320ms ease-out' }}
                  >
                    {activeAnimatedPlaceholder}
                  </span>
                </div>
              ) : null}

              <input
                type='text'
                value={searchValue}
                placeholder=''
                onChange={(event) => setSearchValue(event.target.value)}
                onFocus={() => setIsSearchOpen(true)}
                onKeyDown={handleSearchKeyDown}
                className='relative z-[1] h-full w-full bg-transparent px-3 text-xs text-gray-700 focus:outline-none xl:px-4 xl:text-sm'
                aria-label='Search products'
              />
            </div>

            {searchValue.trim() ? (
              <button
                type='button'
                className='inline-flex h-full shrink-0 items-center justify-center px-3 text-gray-500 transition hover:text-gray-800'
                aria-label='Clear search'
                onClick={handleClearSearchInput}
              >
                <svg
                  className='h-5 w-5'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                  strokeWidth={2}
                  aria-hidden='true'
                >
                  <path strokeLinecap='round' strokeLinejoin='round' d='M6 6l12 12M18 6 6 18' />
                </svg>
              </button>
            ) : null}

            <button
              type='button'
              className='mr-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-900 text-white hover:bg-black xl:h-8 xl:w-8'
              aria-label='Search products'
              onClick={() => handleSearchSubmit(searchValue)}
            >
              <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='m21 21-4.3-4.3m1.3-5.2a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0'
                />
              </svg>
            </button>
          </div>

          {isSearchCategoryOpen ? (
            <div className='absolute left-0 top-11 z-50 w-64 rounded-md border border-gray-200 bg-white p-1.5 shadow-lg'>
              <button
                type='button'
                className={`flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                  !selectedSearchCategory.slug ? 'font-semibold text-gray-900' : 'text-gray-700'
                }`}
                onClick={() => {
                  setSelectedSearchCategory({ name: 'All', slug: '' })
                  setIsSearchCategoryOpen(false)
                }}
              >
                <span>All</span>
                {!selectedSearchCategory.slug ? (
                  <svg className='h-4 w-4 text-gray-500' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                    <path strokeLinecap='round' strokeLinejoin='round' d='M5 13l4 4L19 7' />
                  </svg>
                ) : null}
              </button>
              <div className='my-1 h-px bg-gray-100' />
              <div className='search-category-scrollbar max-h-72 overflow-y-auto overscroll-contain pr-1'>
                {topCategories.map((category) => {
                  const isActive = selectedSearchCategory.slug === category.slug
                  return (
                    <button
                      key={`search-category-${category.id}`}
                      type='button'
                      className={`flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                        isActive ? 'font-semibold text-gray-900' : 'text-gray-700'
                      }`}
                      onClick={() => {
                        setSelectedSearchCategory({
                          name: category.name || 'All',
                          slug: category.slug || '',
                        })
                        setIsSearchCategoryOpen(false)
                      }}
                    >
                      <span>{category.name}</span>
                      {isActive ? (
                        <svg className='h-4 w-4 text-gray-500' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                          <path strokeLinecap='round' strokeLinejoin='round' d='M5 13l4 4L19 7' />
                        </svg>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}

          {isSearchOpen ? (
            <div
              className='absolute left-0 right-0 top-11 z-50 border border-gray-200 bg-white p-4 shadow-xl'
              onMouseDown={(event) => event.preventDefault()}
            >
              {showLiveSuggestionPanel ? (
                <>
                  <div className='desktop-search-scrollbar mt-3 flex max-h-[calc(100vh-7rem)] flex-col divide-y divide-gray-100 overflow-y-auto overscroll-contain'>
                    {isLiveSearchLoading ? (
                      <div className='flex items-center justify-center px-3 py-6'>
                        <span
                          className='inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700'
                          aria-hidden='true'
                        />
                      </div>
                    ) : liveSearchSuggestions.length ? (
                      liveSearchSuggestions.map((item) => (
                        <Link
                          key={`${item.kind}-${item.id}-${item.href}`}
                          href={item.href}
                          onClick={() => handleSearchSuggestionSelect(item)}
                          className='flex items-center gap-3 px-3 py-3 text-left hover:bg-[#f7f4ef]'
                        >
                          {item.imageUrl ? (
                            <Image
                              src={item.imageUrl}
                              alt=''
                              width={44}
                              height={44}
                              className={getSuggestionThumbClassName(item.kind)}
                              unoptimized
                            />
                          ) : (
                            <span className={getSuggestionFallbackClassName(item.kind)} aria-hidden='true'>
                              {renderSuggestionFallbackIcon(item.kind)}
                            </span>
                          )}
                          <div className='min-w-0 flex-1'>
                            <div className='truncate text-sm font-medium text-gray-900'>
                              {formatSuggestionLabel(item)}
                            </div>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className='px-3 py-4 text-sm text-gray-500'>
                        No suggestions found for &quot;{searchValue.trim()}&quot;.
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className='flex items-center justify-between'>
                    <span className='text-sm font-semibold text-gray-900'>
                      Recently searched
                    </span>
                    <button
                      type='button'
                      className='text-xs font-medium text-gray-500 hover:text-gray-700'
                      onClick={clearRecentSearches}
                    >
                      Clear
                    </button>
                  </div>

                  <div className='mt-3 flex flex-wrap gap-2'>
                    {recentSearches.length ? (
                      recentSearches.map((item) => (
                        <button
                          key={item.term}
                          type='button'
                          onClick={() => setSearchValue(item.term)}
                          className='flex items-center gap-2 rounded-full bg-gray-100 px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-200'
                        >
                          <Image
                            src={item.image || placeholderChipImage}
                            alt=''
                            width={20}
                            height={20}
                            className='h-5 w-5 rounded-full object-cover'
                            unoptimized
                          />
                          {item.term}
                        </button>
                      ))
                    ) : (
                      <span className='text-xs text-gray-400'>No recent searches</span>
                    )}
                  </div>

                  <PopularRightNowSection
                    items={popularSearchItems}
                    onSelect={handlePopularSearchSelect}
                    placeholderChipImage={placeholderChipImage}
                  />
                </>
              )}
            </div>
          ) : null}
        </div>

        <div className='flex shrink-0 items-center gap-0.5 xl:gap-1'>
          <HeaderAction href='/wishlist' label='Wishlist'>
            <svg
              className='h-6 w-6'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
              strokeWidth={1.8}
              aria-hidden='true'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M12 21s-6.716-4.517-9.038-8.187C.13 8.342 2.72 3 7.2 3c2.159 0 3.54 1.112 4.8 2.797C13.26 4.112 14.642 3 16.8 3 21.28 3 23.87 8.342 21.038 12.813 18.716 16.483 12 21 12 21z'
              />
            </svg>
          </HeaderAction>

          <HeaderAction href='/help-center' label='Support'>
            <svg
              className='h-6 w-6'
              viewBox='0 0 18 18'
              role='img'
              xmlns='http://www.w3.org/2000/svg'
              aria-labelledby='supportIconTitle'
              fill='currentColor'
              color='currentColor'
            >
              <title id='supportIconTitle'>Support</title>
              <path
                d='M16 7.184C16 3.14 12.86 0 9 0S2 3.14 2 7c-1.163.597-2 1.696-2 3v2a3 3 0 0 0 3 3h1a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1 5 5 0 0 1 10 0 1 1 0 0 0-1 1v6a1 1 0 0 0 1 1v1h-2.592c-.206-.581-.756-1-1.408-1H8a1.5 1.5 0 0 0 0 3h6a2 2 0 0 0 2-2v-1.183A2.992 2.992 0 0 0 18 12v-2a2.99 2.99 0 0 0-2-2.816Z'
                fillRule='evenodd'
              />
            </svg>
          </HeaderAction>

          <UserMenu variant='compactChip' initialAuthUser={initialAuthUser} />

          <Link
            href='/cart'
            className='relative inline-flex items-center gap-1 rounded-md px-1.5 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100 xl:gap-2 xl:px-2'
            aria-label='Cart'
          >
            <svg
              className='h-8 w-8'
              viewBox='0 0 24 24'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
              aria-hidden='true'
            >
              {showCartLoadingSpinner ? (
                <g>
                  <circle
                    cx='14'
                    cy='8'
                    r='2.2'
                    fill='none'
                    stroke='#000000'
                    strokeWidth='1.4'
                    opacity='0.25'
                  />
                  <g>
                    <path
                      d='M14 5.8a2.2 2.2 0 0 1 2.2 2.2'
                      fill='none'
                      stroke='#000000'
                      strokeWidth='1.4'
                      strokeLinecap='round'
                    />
                    <animateTransform
                      attributeName='transform'
                      type='rotate'
                      from='0 14 8'
                      to='360 14 8'
                      dur='0.75s'
                      repeatCount='indefinite'
                    />
                  </g>
                </g>
              ) : cartCount <= 0 ? (
                <path
                  d='M14,12a1,1,0,0,1-1-1V9H11a1,1,0,0,1,0-2h2V5a1,1,0,0,1,2,0V7h2a1,1,0,0,1,0,2H15v2A1,1,0,0,1,14,12Z'
                  fill='#000000'
                />
              ) : null}
              <path
                d='M17,19a1.5,1.5,0,1,0,1.5,1.5A1.5,1.5,0,0,0,17,19Zm-6,0a1.5,1.5,0,1,0,1.5,1.5A1.5,1.5,0,0,0,11,19Z'
                fill='#000000'
              />
              <path
                d='M18.22,17H9.8a2,2,0,0,1-2-1.55L5.2,4H3A1,1,0,0,1,3,2H5.2a2,2,0,0,1,2,1.55L9.8,15h8.42L20,7.76A1,1,0,0,1,22,8.24l-1.81,7.25A2,2,0,0,1,18.22,17Z'
                fill='#000000'
              />
              {cartCount > 0 && (
                <text
                  x='14'
                  y='9.25'
                  textAnchor='middle'
                  dominantBaseline='middle'
                  fontSize={cartCount > 9 ? 7 : 8}
                  fontWeight='500'
                  fill='#000000'
                  style={{
                    fontFamily:
                      'system-ui, -apple-system, Segoe UI, Roboto, Arial',
                  }}
                >
                  {cartCount > 99 ? '99+' : cartCount}
                </text>
              )}
            </svg>
            <span className='hidden xl:inline'>Cart</span>
          </Link>
        </div>
        </div>
      </div>

      {(!isProductPage && !isVendorStore && (isUserDashboard || lastScrollY < 20)) && (
      <div
        className='border-y border-gray-200 bg-white'
      >
        {isUserDashboard ? (
          <div className='flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 md:px-5'>
            <h1 className='text-base font-semibold text-slate-900 md:text-lg'>
              Account Center
            </h1>
            <div className='flex items-center gap-2'>
              {hasVendorAccess ? (
                <Link
                  className='relative hidden h-9 w-9 items-center justify-center rounded-full bg-white text-slate-600 ring-1 ring-slate-200 md:flex'
                  aria-label='Shop dashboard'
                  href='/admin/dashboard'
                >
                  <svg
                    className='h-5 w-5'
                    viewBox='0 0 16 16'
                    fill='none'
                    xmlns='http://www.w3.org/2000/svg'
                    aria-hidden='true'
                  >
                    <path
                      d='M3 1L0 4V5C0 5 2 6 4 6C6 6 8 5 8 5C8 5 10 6 12 6C14 6 16 5 16 5V4L13 1H3Z'
                      fill='currentColor'
                    />
                    <path
                      fillRule='evenodd'
                      clipRule='evenodd'
                      d='M1 15V7.5187C1.81671 7.76457 2.88168 8 4 8C5.3025 8 6.53263 7.68064 7.38246 7.39737C7.60924 7.32177 7.81664 7.24612 8 7.17526C8.18337 7.24612 8.39076 7.32177 8.61754 7.39737C9.46737 7.68064 10.6975 8 12 8C13.1183 8 14.1833 7.76457 15 7.5187V15H7V10H4V15H1ZM12 10H10V13H12V10Z'
                      fill='currentColor'
                    />
                  </svg>
                </Link>
              ) : null}
              <Link
                className='relative flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-600 ring-1 ring-slate-200'
                aria-label='Notifications'
                href='/account/notifications'
              >
                <svg
                  className='h-[26px] w-[26px]'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='1.5'
                  aria-hidden='true'
                >
                  <path
                    d='M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V10a6 6 0 1 0-12 0v4.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0m6 0H9'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                </svg>
                {unreadNotificationCount > 0 ? (
                  <span className='absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500' />
                ) : null}
              </Link>
              <div className='relative hidden md:block' ref={accountSearchRef}>
                <div className='flex h-9 w-64 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 text-xs text-slate-500 transition focus-within:border-slate-300 focus-within:bg-white'>
                  <svg
                    className='h-4 w-4'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='1.8'
                    aria-hidden='true'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      d='M21 21l-4.3-4.3m1.3-5.2a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0'
                    />
                  </svg>
                  <input
                    type='text'
                    value={accountSearchValue}
                    onChange={(event) => {
                      const nextValue = event.target.value
                      setAccountSearchValue(nextValue)
                      setIsAccountSearchOpen(nextValue.trim().length > 0)
                    }}
                    onFocus={() =>
                      setIsAccountSearchOpen(accountSearchValue.trim().length > 0)
                    }
                    onKeyDown={(event) =>
                      handleAccountSearchKeyDown(event, accountSearchSuggestions)
                    }
                    placeholder='Search account pages'
                    className='h-full w-full bg-transparent text-xs text-slate-700 placeholder:text-slate-500 focus:outline-none'
                    aria-label='Search account pages'
                  />
                </div>
                {isAccountSearchOpen && hasAccountSearchQuery ? (
                  <div className='absolute right-0 top-[calc(100%+0.45rem)] z-50 w-72 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl'>
                    {accountSearchSuggestions.length ? (
                      <ul className='max-h-72 overflow-y-auto'>
                        {accountSearchSuggestions.map((item) => (
                          <li key={`${item.href}-${item.label}`}>
                            <button
                              type='button'
                              onClick={() => handleAccountSearchSelect(item)}
                              className='flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left hover:bg-slate-50'
                            >
                              <span className='text-sm font-medium text-slate-800'>
                                {item.label}
                              </span>
                              <span className='ml-3 line-clamp-1 text-[11px] text-slate-500'>
                                {item.summary}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className='px-2.5 py-2 text-xs text-slate-500'>
                        No matching account pages.
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
              <button
                type='button'
                onClick={openLogoutConfirm}
                className='inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-900 ring-1 ring-slate-200 transition hover:bg-slate-50'
                aria-label='Logout'
                title='Logout'
              >
                <svg
                  className='h-5 w-5'
                  viewBox='0 0 16 16'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                  aria-hidden='true'
                >
                  <path
                    d='M12.207 9H5V7h7.136L11.05 5.914 12.464 4.5 16 8.036l-3.536 3.535-1.414-1.414L12.207 9zM10 4H8V2H2v12h6v-2h2v4H0V0h10v4z'
                    fill='currentColor'
                    fillRule='evenodd'
                  />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div
            className='mx-auto flex h-9 w-full max-w-[1400px] items-stretch gap-2 pl-4 sm:pl-6 lg:pl-8 xl:h-10 xl:gap-4'
            onMouseLeave={handleCategoriesMouseLeave}
          >

          <div className='min-w-0 flex-1 self-center overflow-hidden'>
            <div className={`flex min-w-0 items-center gap-4 overflow-x-auto whitespace-nowrap pr-2 xl:gap-6 ${hiddenHorizontalScrollbarClass}`}>
              {topBarCategoryItems.map((category) => (
                <Link
                  key={category.id}
                  href={
                    category.slug
                      ? `/products/${encodeURIComponent(category.slug)}`
                      : '/products'
                  }
                  className='text-xs font-normal text-gray-900 hover:text-gray-600 xl:text-sm'
                  onMouseEnter={() => handleTopCategoryHover(category.hoverCategory)}
                >
                  {category.name}
                </Link>
              ))}
            </div>
          </div>

          <div className='flex shrink-0 items-stretch bg-gray-900 pl-4 pr-4 sm:pr-6 lg:pr-8 xl:pl-5'>
            <Link
              href='/sellersignup'
              className='inline-flex shrink-0 items-center whitespace-nowrap text-xs font-bold tracking-wide text-white transition hover:text-white/70 xl:text-sm'
            >
              Join Alxora
            </Link>
          </div>
          </div>
        )}
      </div>
      )}

      <div
        className='pointer-events-none absolute inset-x-0 top-full z-40'
      >
        <div
          className='pointer-events-auto mx-auto w-full max-w-[1400px] px-4 pt-px sm:px-6 lg:px-8'
        >
          <CategoriesMenu
            isOpen={isCategoriesOpen}
            onClose={() => setIsCategoriesOpen(false)}
            initialActiveCategoryId={activeTopCategoryId}
            panelRef={menuPanelRef}
            onMenuMouseEnter={handleCategoriesMouseEnter}
            onMenuMouseLeave={handleCategoriesMouseLeave}
            onEmptyCategoryModalChange={setIsCategoryMenuModalOpen}
          />
        </div>
      </div>


      {isLogoutConfirmOpen ? (
        <div
          className='fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/45 px-4'
          onClick={closeLogoutConfirm}
        >
          <div
            className='w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl'
            role='dialog'
            aria-modal='true'
            aria-labelledby='logout-confirm-title'
            aria-describedby='logout-confirm-description'
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id='logout-confirm-title' className='text-lg font-semibold text-slate-900'>
              You&apos;re about to log out.
            </h2>
            <p id='logout-confirm-description' className='mt-2 text-sm text-slate-600'>
              To access your account, orders, and saved items again, you&apos;ll need to sign in.
            </p>
            {logoutError ? (
              <p className='mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700'>
                {logoutError}
              </p>
            ) : null}
            <div className='mt-5 flex items-center justify-end gap-2'>
              <button
                type='button'
                onClick={closeLogoutConfirm}
                className='inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70'
                disabled={isLoggingOut}
              >
                Cancel
              </button>
              <button
                type='button'
                onClick={handleDashboardLogout}
                className='inline-flex h-10 items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70'
                disabled={isLoggingOut}
              >
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        @keyframes searchPlaceholderSlide {
          0% {
            opacity: 0;
            transform: translateY(6px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </nav>
  )
}
