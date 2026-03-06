'use client'

import AddressEditorModal from '@/components/address/AddressEditorModal'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import CartQuantitySelect from '@/components/cart/CartQuantitySelect'
import { useCart } from '@/context/CartContext'
import { filterItemsByCheckoutSelection, parseCheckoutSelectionParam } from '@/lib/cart/checkout-selection'
import { useUserI18n } from '@/lib/i18n/useUserI18n'
import { formatUsdWithLocalAmount } from '@/lib/i18n/fixed-currency'
import {
  calculateOrderProtectionFee,
  isDigitalProductLike,
} from '@/lib/order-protection/config'
import { normalizeLookupValue, toCityOnlyName } from '@/lib/location/nigeria-address'
import {
  loadUserProfileBootstrap,
  primeUserProfileBootstrap,
} from '@/lib/user/profile-bootstrap-client'

const DEFAULT_COUNTRY = 'Nigeria'
const INTERNATIONAL_COUNTRY = 'International'
const emptyAddressDraft = {
  label: '',
  line1: '',
  line2: '',
  phone: '',
  city: '',
  state: '',
  postalCode: '',
  country: DEFAULT_COUNTRY,
  isDefault: false,
}
const createAddressId = () =>
  `addr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
const DELIVERY_OPTIONS = [
  {
    id: 'express',
    label: 'Express Delivery',
    badge: 'Fastest',
  },
  {
    id: 'standard',
    label: 'Standard Delivery',
    badge: '',
  },
]
const DELIVERY_OPTION_ID_SET = new Set(DELIVERY_OPTIONS.map((entry) => entry.id))
const MOBILE_DELIVERY_OPTION_IDS = new Set(['express', 'standard'])
const MOBILE_INFO_MENU_ITEMS = [
  { key: 'delivery', label: 'Secure Delivery\nGuarantee' },
  { key: 'payment', label: 'Secure\nPayments' },
  { key: 'securityPrivacy', label: 'Privacy & Data\nProtection' },
  { key: 'support', label: 'Customer\nSupport' },
]

const parseEstimateDayWindow = (estimate) => {
  const text = String(estimate || '').toLowerCase()
  const dayRangeMatches = text.match(/(\d+)\s*(day|days|d)?\s*-\s*(\d+)\s*(day|days|d)\b/)
  if (dayRangeMatches) {
    const minDays = Number(dayRangeMatches[1] || 0)
    const maxDays = Number(dayRangeMatches[3] || 0)
    if (!Number.isFinite(minDays) || !Number.isFinite(maxDays) || minDays <= 0 || maxDays <= 0) {
      return null
    }
    return {
      minDays: Math.min(minDays, maxDays),
      maxDays: Math.max(minDays, maxDays),
    }
  }

  const daySingleMatches = text.match(/(\d+)\s*(day|days|d)\b/)
  if (daySingleMatches) {
    const day = Number(daySingleMatches[1] || 0)
    if (!Number.isFinite(day) || day <= 0) return null
    return { minDays: day, maxDays: day }
  }

  const hourRangeMatches = text.match(
    /(\d+)\s*(hour|hours|hr|hrs|h)?\s*-\s*(\d+)\s*(hour|hours|hr|hrs|h)\b/,
  )
  if (hourRangeMatches) {
    const minHours = Number(hourRangeMatches[1] || 0)
    const maxHours = Number(hourRangeMatches[3] || 0)
    if (!Number.isFinite(minHours) || !Number.isFinite(maxHours) || minHours <= 0 || maxHours <= 0) {
      return null
    }
    return {
      minDays: Math.max(1, Math.ceil(Math.min(minHours, maxHours) / 24)),
      maxDays: Math.max(1, Math.ceil(Math.max(minHours, maxHours) / 24)),
    }
  }

  const hourSingleMatches = text.match(/(\d+)\s*(hour|hours|hr|hrs|h)\b/)
  if (hourSingleMatches) {
    const hours = Number(hourSingleMatches[1] || 0)
    if (!Number.isFinite(hours) || hours <= 0) return null
    const day = Math.max(1, Math.ceil(hours / 24))
    return { minDays: day, maxDays: day }
  }
  return null
}

const formatMonthDay = (date) =>
  date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

const buildDeliveryWindowNote = (estimate) => {
  const dayWindow = parseEstimateDayWindow(estimate)
  if (!dayWindow) return ''
  if (dayWindow.maxDays <= 1) return 'Your order should arrive less then 24hr'
  const now = new Date()
  const start = new Date(now)
  const end = new Date(now)
  start.setDate(start.getDate() + dayWindow.minDays)
  end.setDate(end.getDate() + dayWindow.maxDays)
  return `Your order should arrive ${formatMonthDay(start)} - ${formatMonthDay(end)}`
}

const normalizeAddresses = (profile) => {
  const addresses = Array.isArray(profile?.addresses) ? profile.addresses : []
  return addresses
    .filter((item) => item && typeof item === 'object')
    .map((item, index) => ({
      id: String(item.id || `address-${index + 1}`),
      label: String(item.label || `Address ${index + 1}`),
      line1: String(item.line1 || ''),
      line2: String(item.line2 || ''),
      phone: String(item.phone || item.phoneNumber || item.contactPhone || item.line2 || ''),
      city: String(item.city || ''),
      state: String(item.state || ''),
      postalCode: String(item.postalCode || ''),
      country: normalizeCheckoutCountry(item.country),
      isDefault: Boolean(item.isDefault),
    }))
}

const normalizeCheckoutCountry = (country) => {
  const next = String(country || '').trim()
  if (!next) return DEFAULT_COUNTRY
  if (next.toLowerCase() === 'nigeria') return DEFAULT_COUNTRY
  if (next.toLowerCase() === 'international' || next.toLowerCase() === 'worldwide') {
    return INTERNATIONAL_COUNTRY
  }
  if (next.length > 0) return next
  return INTERNATIONAL_COUNTRY
}

const normalizePickupLocations = (payload) => {
  const source = Array.isArray(payload) ? payload : []
  return source
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry, index) => ({
      id: String(entry.id || `pickup-${index + 1}`),
      label: String(entry.label || `Pickup location ${index + 1}`),
      line1: String(entry.line1 || ''),
      line2: String(entry.line2 || ''),
      city: String(entry.city || ''),
      state: String(entry.state || ''),
      postalCode: String(entry.postalCode || ''),
      country: normalizeCheckoutCountry(entry.country),
      phone: String(entry.phone || ''),
      note: String(entry.note || ''),
      hours: String(entry.hours || ''),
      isActive: entry.isActive !== false,
      sortOrder: Number(entry.sortOrder || index),
    }))
    .filter((entry) => entry.isActive !== false)
}

const ShippingDetailsPage = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { formatMoney } = useUserI18n()
  const { items, summary, isReady, isServerReady, updateQuantity, removeItem } = useCart()
  const selectedParamRaw = String(searchParams?.get('selected') || '').trim()
  const hasSelectionParam = selectedParamRaw.length > 0
  const selectedKeys = useMemo(
    () => parseCheckoutSelectionParam(selectedParamRaw),
    [selectedParamRaw],
  )
  const filteredCheckoutItems = useMemo(
    () => filterItemsByCheckoutSelection(items, selectedKeys),
    [items, selectedKeys],
  )
  const checkoutItems = useMemo(() => {
    if (!hasSelectionParam) return items
    if (filteredCheckoutItems.length > 0) return filteredCheckoutItems
    // Fallback for stale/invalid selection keys so totals still reflect cart state.
    return items
  }, [filteredCheckoutItems, hasSelectionParam, items])
  const checkoutSummary = useMemo(() => {
    const subtotal = checkoutItems.reduce(
      (sum, entry) => sum + Number(entry.price || 0) * Number(entry.quantity || 0),
      0,
    )
    const originalTotal = checkoutItems.reduce((sum, entry) => {
      const original = Number(entry.originalPrice || entry.price || 0)
      return sum + original * Number(entry.quantity || 0)
    }, 0)
    const savings = Math.max(0, originalTotal - subtotal)
    const protectionSubtotal = checkoutItems.reduce((sum, entry) => {
      if (!entry.isProtected || isDigitalProductLike(entry)) return sum
      return sum + Number(entry.price || 0) * Number(entry.quantity || 0)
    }, 0)
    const protectionFee = calculateOrderProtectionFee(protectionSubtotal, summary?.protectionConfig)
    const itemCount = checkoutItems.reduce((sum, entry) => sum + Number(entry.quantity || 0), 0)
    return { subtotal, protectionFee, itemCount, savings }
  }, [checkoutItems, summary?.protectionConfig])
  const [profile, setProfile] = useState(null)
  const [addresses, setAddresses] = useState([])
  const [selectedAddressId, setSelectedAddressId] = useState('')
  const [checkoutMode, setCheckoutMode] = useState('delivery')
  const [selectedDeliveryOptionId, setSelectedDeliveryOptionId] = useState('express')
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true)
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)
  const [editingAddressId, setEditingAddressId] = useState('')
  const [draftAddress, setDraftAddress] = useState(emptyAddressDraft)
  const [promoCode, setPromoCode] = useState('')
  const [appliedPromoCode, setAppliedPromoCode] = useState('')
  const [promoError, setPromoError] = useState('')
  const [isOrderBreakdownOpen, setIsOrderBreakdownOpen] = useState(false)
  const [isMobileInfoMenuOpen, setIsMobileInfoMenuOpen] = useState(false)
  const [isMobileInfoMenuClosing, setIsMobileInfoMenuClosing] = useState(false)
  const [isMobileInfoSheetDragging, setIsMobileInfoSheetDragging] = useState(false)
  const [mobileInfoSheetDragY, setMobileInfoSheetDragY] = useState(0)
  const [activeMobileInfoKey, setActiveMobileInfoKey] = useState('payment')
  const [isOrderSummaryOpen, setIsOrderSummaryOpen] = useState(false)
  const [addressError, setAddressError] = useState('')
  const [isSavingAddress, setIsSavingAddress] = useState(false)
  const [isMobileFooterFloating, setIsMobileFooterFloating] = useState(true)
  const mobileFooterAnchorRef = useRef(null)
  const [pickupLocations, setPickupLocations] = useState([])
  const [selectedPickupLocationId, setSelectedPickupLocationId] = useState('')
  const [isLoadingPickupLocations, setIsLoadingPickupLocations] = useState(false)
  const [logisticsQuote, setLogisticsQuote] = useState(null)
  const [isLoadingLogisticsQuote, setIsLoadingLogisticsQuote] = useState(false)
  const [hasResolvedLogisticsQuote, setHasResolvedLogisticsQuote] = useState(false)
  const mobileInfoSheetGestureRef = useRef({ pointerId: null, startY: 0, dragY: 0 })
  const mobileInfoMenuCloseTimerRef = useRef(null)

  const resetMobileInfoSheetGesture = () => {
    mobileInfoSheetGestureRef.current.pointerId = null
    mobileInfoSheetGestureRef.current.startY = 0
    mobileInfoSheetGestureRef.current.dragY = 0
    setIsMobileInfoSheetDragging(false)
    setMobileInfoSheetDragY(0)
  }

  const closeMobileInfoMenu = () => {
    if (!isMobileInfoMenuOpen || isMobileInfoMenuClosing) return
    setIsMobileInfoMenuClosing(true)
    resetMobileInfoSheetGesture()
    if (mobileInfoMenuCloseTimerRef.current) {
      clearTimeout(mobileInfoMenuCloseTimerRef.current)
    }
    mobileInfoMenuCloseTimerRef.current = setTimeout(() => {
      setIsMobileInfoMenuOpen(false)
      setIsMobileInfoMenuClosing(false)
      mobileInfoMenuCloseTimerRef.current = null
    }, 200)
  }

  const handleMobileInfoSheetDragStart = (event) => {
    if (event.pointerType === 'mouse') return
    setIsMobileInfoSheetDragging(true)
    mobileInfoSheetGestureRef.current.pointerId = event.pointerId
    mobileInfoSheetGestureRef.current.startY = event.clientY
    mobileInfoSheetGestureRef.current.dragY = 0
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const handleMobileInfoSheetDragMove = (event) => {
    if (!isMobileInfoSheetDragging) return
    if (mobileInfoSheetGestureRef.current.pointerId !== event.pointerId) return
    const delta = Math.max(0, event.clientY - mobileInfoSheetGestureRef.current.startY)
    const next = Math.min(delta, 220)
    mobileInfoSheetGestureRef.current.dragY = next
    setMobileInfoSheetDragY(next)
  }

  const handleMobileInfoSheetDragEnd = (event) => {
    if (mobileInfoSheetGestureRef.current.pointerId !== event.pointerId) return
    const shouldClose = mobileInfoSheetGestureRef.current.dragY > 72
    resetMobileInfoSheetGesture()
    if (shouldClose) {
      closeMobileInfoMenu()
    }
  }

  useEffect(() => {
    let cancelled = false

    const loadAddresses = async () => {
      setIsLoadingAddresses(true)
      try {
        const payload = await loadUserProfileBootstrap()
        if (!payload) {
          if (!cancelled) {
            setAddresses([])
            setSelectedAddressId('')
          }
          return
        }
        const nextProfile = payload?.profile || {}
        const normalized = normalizeAddresses(nextProfile)

        if (cancelled) return
        setProfile(nextProfile)
        setAddresses(normalized)

        const defaultAddress = normalized.find((entry) => entry.isDefault) || normalized[0]
        setSelectedAddressId(defaultAddress?.id || '')
      } finally {
        if (!cancelled) {
          setIsLoadingAddresses(false)
        }
      }
    }

    void loadAddresses()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadPickupLocations = async () => {
      setIsLoadingPickupLocations(true)
      try {
        const response = await fetch('/api/settings/pickup-locations', { cache: 'no-store' })
        const payload = await response.json().catch(() => null)
        if (cancelled) return
        if (!response.ok || !payload) {
          setPickupLocations([])
          setSelectedPickupLocationId('')
          return
        }

        const normalized = normalizePickupLocations(payload.locations)
        setPickupLocations(normalized)
        setSelectedPickupLocationId((current) => {
          if (normalized.some((entry) => entry.id === current)) return current
          return normalized[0]?.id || ''
        })
      } catch {
        if (!cancelled) {
          setPickupLocations([])
          setSelectedPickupLocationId('')
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPickupLocations(false)
        }
      }
    }

    void loadPickupLocations()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!mobileFooterAnchorRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        setIsMobileFooterFloating(!entry.isIntersecting)
      },
      { threshold: 0.05 },
    )

    observer.observe(mobileFooterAnchorRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const promoParam = String(searchParams?.get('promo') || '').trim()
    if (!promoParam) return
    setPromoCode(promoParam)
    setAppliedPromoCode('')
    setPromoError('Invalid gift card code.')
  }, [searchParams])

  useEffect(() => {
    if (!isOrderBreakdownOpen) return undefined
    const onEsc = (event) => {
      if (event.key === 'Escape') setIsOrderBreakdownOpen(false)
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [isOrderBreakdownOpen])

  useEffect(() => {
    if (!isMobileInfoMenuOpen) return undefined
    const onEsc = (event) => {
      if (event.key === 'Escape') closeMobileInfoMenu()
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [isMobileInfoMenuOpen, isMobileInfoMenuClosing])

  useEffect(
    () => () => {
      if (mobileInfoMenuCloseTimerRef.current) {
        clearTimeout(mobileInfoMenuCloseTimerRef.current)
      }
    },
    [],
  )

  const hasCartItems = checkoutItems.length > 0
  const selectedPickupLocation = useMemo(
    () => pickupLocations.find((entry) => entry.id === selectedPickupLocationId) || null,
    [pickupLocations, selectedPickupLocationId],
  )
  const selectedAddress = useMemo(
    () => addresses.find((entry) => entry.id === selectedAddressId) || null,
    [addresses, selectedAddressId],
  )
  const hasSelectedAddress =
    checkoutMode === 'pickup' ? Boolean(selectedPickupLocation) : Boolean(selectedAddressId)
  const selectedDeliveryOption =
    DELIVERY_OPTIONS.find((option) => option.id === selectedDeliveryOptionId) ||
    DELIVERY_OPTIONS[0]
  const selectedAddressCountryLookup = normalizeLookupValue(selectedAddress?.country || DEFAULT_COUNTRY)
  const canRequestLogisticsQuote =
    checkoutMode === 'delivery' &&
    Boolean(selectedAddress) &&
    (
      selectedAddressCountryLookup !== 'nigeria' ||
      (
        String(selectedAddress?.state || '').trim().length > 0 &&
        String(selectedAddress?.city || '').trim().length > 0
      )
    )
  const selectedLogisticsOption =
    checkoutMode === 'delivery'
      ? logisticsQuote?.deliveryOptions?.[selectedDeliveryOption.id] ||
        (logisticsQuote
          ? {
            price: Number(logisticsQuote.price || 0),
            displayPrice:
              logisticsQuote.displayPrice != null
                ? Number(logisticsQuote.displayPrice || 0)
                : Number(logisticsQuote.price || 0),
            displayCurrency: String(logisticsQuote.displayCurrency || 'NGN'),
            checkoutEstimate: String(logisticsQuote.checkoutEstimate || ''),
          }
          : null)
      : null
  const isShippingPricingPending =
    checkoutMode === 'delivery' &&
    canRequestLogisticsQuote &&
    (isLoadingLogisticsQuote || !hasResolvedLogisticsQuote)
  const isShippingDisplayPending =
    checkoutMode === 'delivery' && (isLoadingAddresses || isShippingPricingPending)
  const shippingFee =
    checkoutMode === 'pickup'
      ? 0
      : selectedLogisticsOption
        ? Number(selectedLogisticsOption.price || 0)
        : null
  const protectionFee = Number(checkoutSummary.protectionFee || 0)
  const totalAmount =
    shippingFee == null ? null : checkoutSummary.subtotal + shippingFee + protectionFee
  const shippingStepTotal = totalAmount
  const formatFeeOrFree = (amount, sourceCurrency = 'NGN') => {
    if (amount === null || amount === undefined || amount === '') return '—'
    const numericAmount = Number(amount)
    if (!Number.isFinite(numericAmount)) return '—'
    if (numericAmount <= 0) return 'FREE'
    if (String(sourceCurrency || '').toUpperCase() === 'USD') {
      return formatUsdWithLocalAmount(numericAmount, formatMoney)
    }
    return formatMoney(numericAmount, { sourceCurrency })
  }
  const buildAddressLine = (address) => {
    if (!address) return ''
    return [
      address.line1,
      address.line2,
      [address.city, address.state].filter(Boolean).join(', '),
      [address.postalCode, address.country].filter(Boolean).join(', '),
    ]
      .filter(Boolean)
      .join(', ')
  }
  const selectedAddressLine = useMemo(() => buildAddressLine(selectedAddress), [selectedAddress])
  const shippingDisplayCurrency =
    String(selectedLogisticsOption?.displayCurrency || '').toUpperCase() === 'USD' ? 'USD' : 'NGN'
  const shippingDisplayAmount =
    shippingDisplayCurrency === 'USD'
      ? (selectedLogisticsOption?.displayPrice != null
          ? Number(selectedLogisticsOption.displayPrice || 0)
          : null)
      : shippingFee == null
        ? null
        : Number(shippingFee || 0)
  const logisticsCoverage = useMemo(
    () =>
      [selectedAddress?.city, selectedAddress?.state, selectedAddress?.country]
        .map((entry) => String(entry || '').trim())
        .filter(Boolean)
        .join(', '),
    [selectedAddress?.city, selectedAddress?.country, selectedAddress?.state],
  )
  const deliveryOptionsWithPricing = useMemo(() => {
    return DELIVERY_OPTIONS.map((option) => {
      const logisticsOption = logisticsQuote?.deliveryOptions?.[option.id]
      return {
        ...option,
        displayFee: logisticsOption
          ? (logisticsOption.displayPrice != null
              ? Number(logisticsOption.displayPrice || 0)
              : Number(logisticsOption.price || 0))
          : null,
        displayCurrency: logisticsOption
          ? String(logisticsOption.displayCurrency || 'NGN')
          : 'NGN',
        displayEstimate: String(
          logisticsOption?.checkoutEstimate || '',
        ),
        displayNote:
          buildDeliveryWindowNote(logisticsOption?.checkoutEstimate || '') ||
          '',
      }
    })
  }, [logisticsQuote?.deliveryOptions])
  const availableDeliveryOptionIds = useMemo(() => {
    const source = Array.isArray(logisticsQuote?.availableDeliveryTypes)
      ? logisticsQuote.availableDeliveryTypes
      : []
    const filtered = source.filter((entry) => DELIVERY_OPTION_ID_SET.has(String(entry || '').trim()))
    return filtered.length > 0 ? filtered : DELIVERY_OPTIONS.map((entry) => entry.id)
  }, [logisticsQuote?.availableDeliveryTypes])
  const visibleDeliveryOptions = useMemo(
    () =>
      deliveryOptionsWithPricing.filter((option) =>
        availableDeliveryOptionIds.includes(option.id),
      ),
    [availableDeliveryOptionIds, deliveryOptionsWithPricing],
  )

  useEffect(() => {
    if (availableDeliveryOptionIds.includes(selectedDeliveryOptionId)) return
    setSelectedDeliveryOptionId(availableDeliveryOptionIds[0] || 'express')
  }, [availableDeliveryOptionIds, selectedDeliveryOptionId])

  useEffect(() => {
    let cancelled = false

    const loadLogisticsQuote = async () => {
      if (checkoutMode !== 'delivery') {
        setLogisticsQuote(null)
        setHasResolvedLogisticsQuote(false)
        setIsLoadingLogisticsQuote(false)
        return
      }

      const state = String(selectedAddress?.state || '').trim()
      const city = String(selectedAddress?.city || '').trim()
      const country = String(selectedAddress?.country || '').trim()
      if (!selectedAddress) {
        setLogisticsQuote(null)
        setHasResolvedLogisticsQuote(false)
        setIsLoadingLogisticsQuote(false)
        return
      }
      if ((!state || !city) && normalizeLookupValue(country) === 'nigeria') {
        setLogisticsQuote(null)
        setHasResolvedLogisticsQuote(false)
        setIsLoadingLogisticsQuote(false)
        return
      }

      setLogisticsQuote(null)
      setHasResolvedLogisticsQuote(false)
      setIsLoadingLogisticsQuote(true)
      try {
        const params = new URLSearchParams({
          state,
          city,
          country,
          delivery_type: selectedDeliveryOptionId,
        })
        const response = await fetch(`/api/settings/logistics?${params.toString()}`, {
          cache: 'no-store',
        })
        const payload = await response.json().catch(() => null)
        if (cancelled) return
        if (!response.ok || !payload) {
          setLogisticsQuote(null)
          setHasResolvedLogisticsQuote(true)
          return
        }
        setLogisticsQuote({
          price: Number(payload.price || 0),
          displayPrice:
            payload?.displayPrice != null
              ? Number(payload.displayPrice || 0)
              : Number(payload.price || 0),
          displayCurrency: String(payload?.displayCurrency || 'NGN'),
          checkoutEstimate: String(payload.checkoutEstimate || ''),
          etaKey: String(payload.etaKey || ''),
          etaHours: Number(payload.etaHours || 0),
          deliveryOptions:
            payload?.deliveryOptions && typeof payload.deliveryOptions === 'object'
              ? payload.deliveryOptions
              : null,
          availableDeliveryTypes: Array.isArray(payload?.availableDeliveryTypes)
            ? payload.availableDeliveryTypes
            : null,
        })
        setHasResolvedLogisticsQuote(true)
      } catch {
        if (!cancelled) {
          setLogisticsQuote(null)
          setHasResolvedLogisticsQuote(true)
        }
      } finally {
        if (!cancelled) {
          setIsLoadingLogisticsQuote(false)
        }
      }
    }

    void loadLogisticsQuote()
    return () => {
      cancelled = true
    }
  }, [
    checkoutMode,
    selectedAddress?.city,
    selectedAddress?.country,
    selectedAddress?.state,
    selectedDeliveryOptionId,
  ])

  const openAddressModal = () => {
    if (addresses.length >= 5) {
      setAddressError('You can only save up to 5 addresses. Remove one to add another.')
      return
    }

    setAddressError('')
    setEditingAddressId('')
    setDraftAddress({
      ...emptyAddressDraft,
      isDefault: addresses.length === 0,
      country: normalizeCheckoutCountry(profile?.country),
    })
    setIsAddressModalOpen(true)
  }

  const openEditAddressModal = (address) => {
    setAddressError('')
    setEditingAddressId(address.id)
    setDraftAddress({
      label: address.label || '',
      line1: address.line1 || '',
      line2: address.line2 || '',
      phone: address.phone || '',
      city: address.city || '',
      state: address.state || '',
      postalCode: address.postalCode || '',
      country: normalizeCheckoutCountry(address.country),
      isDefault: Boolean(address.isDefault),
    })
    setIsAddressModalOpen(true)
  }

  const closeAddressModal = () => {
    if (isSavingAddress) return
    setIsAddressModalOpen(false)
    setEditingAddressId('')
    setAddressError('')
    setDraftAddress(emptyAddressDraft)
  }

  const validateDraftAddress = () => {
    if (!draftAddress.line1.trim()) return 'Address line 1 is required.'
    if (!draftAddress.state.trim()) return 'State is required.'
    if (!draftAddress.city.trim()) return 'City is required.'
    if (!draftAddress.phone.trim()) return 'Phone number is required.'
    if (!draftAddress.country.trim()) return 'Country is required.'
    return ''
  }

  const goToPayment = () => {
    if (checkoutMode === 'pickup' && !selectedPickupLocation) {
      setAddressError('No pickup address found.')
      return
    }
    if (checkoutMode === 'delivery' && (isShippingPricingPending || shippingStepTotal == null)) {
      setAddressError('Please wait while delivery pricing loads.')
      return
    }
    const selected = String(searchParams?.get('selected') || '').trim()
    const promo = String(appliedPromoCode || '').trim()
    const params = new URLSearchParams()
    if (selected) params.set('selected', selected)
    if (promo) params.set('promo', promo)
    if (checkoutMode === 'delivery' && selectedDeliveryOptionId) {
      params.set('delivery_type', selectedDeliveryOptionId)
    }
    if (checkoutMode === 'delivery' && selectedAddress?.id) {
      params.set('shipping_address_id', selectedAddress.id)
      if (String(selectedAddress.phone || '').trim()) {
        params.set('shipping_phone', String(selectedAddress.phone || '').trim())
      }
      if (String(selectedAddress.country || '').trim()) {
        params.set('shipping_country', String(selectedAddress.country || '').trim())
      }
    }
    const query = params.toString()
    router.push(query ? `/checkout/payment?${query}` : '/checkout/payment')
  }

  const applyPromoCode = () => {
    const normalized = String(promoCode || '').trim()
    if (!normalized) {
      setPromoError('Enter a gift card code.')
      return
    }
    setAppliedPromoCode('')
    setPromoError('Invalid gift card code.')
  }

  const clearPromoCode = () => {
    setAppliedPromoCode('')
    setPromoCode('')
    setPromoError('')
  }

  useEffect(() => {
    if (isAddressModalOpen) return
    if (selectedAddress) {
      setDraftAddress({
        label: selectedAddress.label || '',
        line1: selectedAddress.line1 || '',
        line2: selectedAddress.line2 || '',
        phone: selectedAddress.phone || '',
        city: selectedAddress.city || '',
        state: selectedAddress.state || '',
        postalCode: selectedAddress.postalCode || '',
        country: normalizeCheckoutCountry(selectedAddress.country),
        isDefault: Boolean(selectedAddress.isDefault),
      })
      setEditingAddressId(selectedAddress.id)
      return
    }

    setDraftAddress((prev) => ({
      ...prev,
      country: normalizeCheckoutCountry(profile?.country || prev.country),
    }))
  }, [isAddressModalOpen, profile?.country, selectedAddress])

  const saveAddress = async ({ continueToPayment = false } = {}) => {
    const message = validateDraftAddress()
    if (message) {
      setAddressError(message)
      return
    }

    const fallbackIndex =
      editingAddressId && addresses.findIndex((entry) => entry.id === editingAddressId) >= 0
        ? addresses.findIndex((entry) => entry.id === editingAddressId) + 1
        : addresses.length + 1
    const targetId = editingAddressId || createAddressId()
    const nextAddress = {
      id: targetId,
      label: draftAddress.label.trim() || `Address ${fallbackIndex}`,
      line1: draftAddress.line1.trim(),
      line2: '',
      phone: String(draftAddress.phone || '').trim(),
      city: toCityOnlyName(draftAddress.state, draftAddress.city),
      state: draftAddress.state.trim(),
      postalCode: draftAddress.postalCode.trim(),
      country: draftAddress.country.trim(),
      isDefault: Boolean(draftAddress.isDefault),
    }

    const withNew = editingAddressId
      ? addresses.map((entry) => (entry.id === editingAddressId ? nextAddress : entry))
      : [...addresses, nextAddress]
    const withDefault = nextAddress.isDefault
      ? withNew.map((entry) => ({ ...entry, isDefault: entry.id === nextAddress.id }))
      : withNew.some((entry) => entry.isDefault)
        ? withNew
        : withNew.map((entry, index) => ({ ...entry, isDefault: index === 0 }))
    const defaultAddress =
      withDefault.find((entry) => entry.isDefault) || withDefault[0] || null
    const profileFirstName = String(profile?.firstName || profile?.displayName || 'Customer').trim() || 'Customer'
    const profileCountry =
      normalizeCheckoutCountry(profile?.country || defaultAddress?.country || draftAddress.country)

    setAddressError('')
    setIsSavingAddress(true)
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...profile,
          firstName: profileFirstName,
          country: profileCountry,
          addresses: withDefault,
          deliveryAddress: defaultAddress
            ? {
              line1: defaultAddress.line1 || '',
              line2: defaultAddress.line2 || '',
              phone: defaultAddress.phone || '',
              city: defaultAddress.city || '',
              state: defaultAddress.state || '',
              postalCode: defaultAddress.postalCode || '',
              country: normalizeCheckoutCountry(defaultAddress.country),
            }
          : {
              line1: '',
              line2: '',
              phone: '',
              city: '',
              state: '',
              postalCode: '',
              country: DEFAULT_COUNTRY,
            },
        }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to save address.')
      }
      primeUserProfileBootstrap(payload)

      const nextProfile = payload?.profile || {}
      const normalized = normalizeAddresses(nextProfile)
      const savedAddress = normalized.find((entry) => entry.id === targetId)
      const nextSelected =
        selectedAddressId === targetId
          ? targetId
          : savedAddress?.id ||
        normalized.find((entry) => entry.isDefault)?.id ||
        normalized[0]?.id ||
        ''
      setProfile(nextProfile)
      setAddresses(normalized)
      setSelectedAddressId(nextSelected)
      if (continueToPayment) {
        goToPayment()
      } else if (isAddressModalOpen) {
        closeAddressModal()
      } else {
        closeAddressModal()
      }
    } catch (error) {
      setAddressError(error?.message || 'Unable to save address.')
    } finally {
      setIsSavingAddress(false)
    }
  }

  const handleMobileNext = () => {
    if (checkoutMode === 'pickup') {
      if (!selectedPickupLocation) {
        setAddressError('No pickup address found.')
        return
      }
      goToPayment()
      return
    }

    if (!selectedAddress) {
      setAddressError('Select a delivery address or add one before continuing.')
      return
    }

    goToPayment()
  }

  const openMobileInfoMenu = (key) => {
    if (mobileInfoMenuCloseTimerRef.current) {
      clearTimeout(mobileInfoMenuCloseTimerRef.current)
      mobileInfoMenuCloseTimerRef.current = null
    }
    resetMobileInfoSheetGesture()
    setIsMobileInfoMenuClosing(false)
    setActiveMobileInfoKey(key)
    setIsMobileInfoMenuOpen(true)
  }

  const mobileInfoSections = useMemo(
    () => [
      {
        key: 'delivery',
        title: 'Secure Delivery Guarantee',
        body: 'We work with trusted shipping partners to help your package arrive safely and on time.',
      },
      {
        key: 'payment',
        title: 'Secure Payments',
        body: 'Your payment information is securely encrypted and processed through trusted payment providers to complete your order safely.',
      },
      {
        key: 'securityPrivacy',
        title: 'Privacy & Data Protection',
        body: 'Your personal details and payment information are protected to ensure a safe and secure shopping experience.',
        actionLabel: 'Learn more',
        actionHref: '/privacy-policy',
        actionNewTab: true,
      },
      {
        key: 'support',
        title: 'Customer Support',
        body: 'Need assistance with your order or account? Our support team is ready to help.',
        actionLabel: 'Get help',
        actionHref: '/UserBackend/messages',
      },
    ],
    [],
  )

  const activeMobileInfoContent = useMemo(() => {
    const match = mobileInfoSections.find((entry) => entry.key === activeMobileInfoKey)
    return (
      match || {
        title: 'Secure Payments',
        body: 'Choose your preferred payment method at the next step. Charges are shown before final confirmation.',
      }
    )
  }, [activeMobileInfoKey, mobileInfoSections])

  const renderMobileInfoIcon = (key, className = 'h-5 w-5') => {
    if (key === 'delivery') {
      return (
        <svg viewBox='0 0 24 24' className={className} fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
          <path d='M3.5 8.5h10v7h-10z' />
          <path d='M13.5 10.5h4l2 2v3h-6z' />
          <circle cx='7' cy='16.5' r='1.2' />
          <circle cx='16.5' cy='16.5' r='1.2' />
        </svg>
      )
    }
    if (key === 'payment') {
      return (
        <svg viewBox='0 0 24 24' className={className} fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
          <path d='M12 3.8 18.5 6v5.3c0 3.6-2.3 6.8-6.5 8.9-4.2-2.1-6.5-5.3-6.5-8.9V6z' />
          <path d='M9.3 11.9 11.2 13.8 14.7 10.3' strokeLinecap='round' strokeLinejoin='round' />
        </svg>
      )
    }
    if (key === 'securityPrivacy') {
      return (
        <svg viewBox='0 0 24 24' className={className} fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
          <rect x='5.2' y='10.3' width='13.6' height='9.2' rx='1.3' />
          <path d='M8 10.3V8.8a4 4 0 1 1 8 0v1.5' />
        </svg>
      )
    }
    return (
      <svg viewBox='0 0 24 24' className={className} fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
        <path d='M5.5 11.5a6.5 6.5 0 1 1 13 0' />
        <rect x='4' y='11.5' width='3.5' height='6' rx='1.2' />
        <rect x='16.5' y='11.5' width='3.5' height='6' rx='1.2' />
        <path d='M16.5 18.5c0 1.1-.9 2-2 2H12' />
      </svg>
    )
  }

  const currentMobileStepIndex = 0
  const mobileTotalsCard = (
    <section className='w-full border-y border-slate-200 bg-white p-3 shadow-none lg:mx-auto lg:max-w-7xl'>
      <div className='mb-2 flex items-center justify-between text-sm font-semibold text-slate-900'>
        <span>Total Pay</span>
        <span>
          {isShippingDisplayPending || shippingStepTotal == null ? (
            <span className='inline-block h-4 w-20 animate-pulse rounded bg-slate-200 align-middle' />
          ) : (
            formatMoney(shippingStepTotal)
          )}
        </span>
      </div>
      <div className='mb-1 inline-flex items-center gap-1 text-[11px] text-slate-600'>
        <span>
          Includes Shipping Fee{' '}
          {isShippingDisplayPending ? (
            <span className='inline-block h-3 w-12 animate-pulse rounded bg-slate-200 align-middle' />
          ) : (
            formatFeeOrFree(shippingDisplayAmount, shippingDisplayCurrency)
          )}
        </span>
        <button
          type='button'
          onClick={() => setIsOrderBreakdownOpen(true)}
          className='inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-400 text-[10px] font-semibold text-slate-500'
          aria-label='Open order breakdown'
        >
          i
        </button>
      </div>
      {checkoutSummary.savings > 0 ? (
        <p className='text-[11px] font-semibold text-emerald-700'>
          You save {formatMoney(checkoutSummary.savings)}
        </p>
      ) : null}
    </section>
  )

  return (
    <div className='min-h-screen bg-white text-slate-900'>
      <div className='w-full px-4 pb-12 pt-2 sm:px-0 sm:pb-20 lg:mx-auto lg:max-w-7xl lg:pb-12'>
        <section className='pb-6 sm:hidden'>
          <header className='flex items-center justify-between py-2'>
            <button
              type='button'
              onClick={() => router.back()}
              className='inline-flex h-8 w-8 items-center justify-center text-slate-700'
              aria-label='Go back'
            >
              <svg viewBox='0 0 20 20' className='h-5 w-5' fill='none' stroke='currentColor' strokeWidth='2'>
                <path d='M12.5 4.5L7 10l5.5 5.5' strokeLinecap='round' strokeLinejoin='round' />
              </svg>
            </button>
            <h1 className='text-sm font-bold tracking-[0.08em] text-slate-900'>CHECKOUT</h1>
            <span className='h-8 w-8' />
          </header>

          <div className='mt-2 rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm'>
            <div className='grid grid-cols-3 gap-1 text-center text-[10px] leading-tight'>
              <div className='text-slate-900'>
                <div className='mx-auto mb-1 inline-flex items-center justify-center text-slate-900'>
                  <svg viewBox='0 0 256 256' className='h-6 w-6' fill='currentColor' aria-hidden='true'>
                    <polygon points='256,80.7 211.6,36.9 142,36.9 142,80.7' />
                    <polygon points='118,36.9 48.1,36.9 4,80.7 118,80.7' />
                    <path d='M142,93.9v44.4H118V93.9H4v169.2h252V93.9H142z M176.1,180.1l16.6,16.6h-7.2V225h-18.9v-28.3h-7.2L176.1,180.1z M238.8,245.9h-79.3V233h79.3V245.9z M231.7,196.7V225h-18.9v-28.3h-7.2l16.6-16.6l16.6,16.6H231.7z' />
                  </svg>
                </div>
                <p className='font-semibold'>Shipping</p>
              </div>
              <div className='relative text-slate-400'>
                <span className='pointer-events-none absolute -left-[35%] top-2.5 z-0 h-0 w-[70%] border-t-2 border-dotted border-slate-300' aria-hidden='true' />
                <div className='relative z-10 mx-auto mb-1 inline-flex items-center justify-center bg-white px-0.5'>
                  <svg viewBox='0 0 24 24' className='h-7 w-7' fill='none' stroke='currentColor' aria-hidden='true'>
                    <rect x='3' y='6' width='18' height='13' rx='2' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round' />
                    <path d='M3 10H20.5' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round' />
                    <path d='M7 15H9' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round' />
                  </svg>
                </div>
                <p>Payment</p>
              </div>
              <div className='relative text-slate-400'>
                <span className='pointer-events-none absolute -left-[35%] top-2.5 z-0 h-0 w-[70%] border-t-2 border-dotted border-slate-300' aria-hidden='true' />
                <div className='relative z-10 mx-auto mb-1 inline-flex items-center justify-center bg-white px-0.5'>
                  <svg viewBox='0 0 24 24' className='h-7 w-7' fill='none' stroke='currentColor' aria-hidden='true'>
                    <rect x='5' y='4' width='14' height='17' rx='2' strokeWidth='2.2' />
                    <path d='M9 9H15' strokeWidth='2.2' strokeLinecap='round' />
                    <path d='M9 13H15' strokeWidth='2.2' strokeLinecap='round' />
                    <path d='M9 17H13' strokeWidth='2.2' strokeLinecap='round' />
                  </svg>
                </div>
                <p>Summary</p>
              </div>
            </div>
            <div className='mt-2 grid grid-cols-3'>
              <span className={`mx-auto h-0.5 w-14 rounded-full ${currentMobileStepIndex >= 0 ? 'bg-slate-900' : 'bg-transparent'}`} />
              <span className={`mx-auto h-0.5 w-14 rounded-full ${currentMobileStepIndex >= 1 ? 'bg-slate-900' : 'bg-transparent'}`} />
              <span className={`mx-auto h-0.5 w-14 rounded-full ${currentMobileStepIndex >= 2 ? 'bg-slate-900' : 'bg-transparent'}`} />
            </div>
          </div>

          <div className='mt-4 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1'>
            <button
              type='button'
              onClick={() => setCheckoutMode('delivery')}
              className={`rounded-md px-4 py-1.5 text-xs font-semibold ${
                checkoutMode === 'delivery'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              Delivery
            </button>
            <button
              type='button'
              onClick={() => {
                setCheckoutMode('pickup')
              }}
              className={`rounded-md px-4 py-1.5 text-xs font-semibold ${
                checkoutMode === 'pickup'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              Pickup
            </button>
          </div>

          {checkoutMode === 'delivery' ? (
          <>
          <div className='mt-4'>
            <div className='flex items-center justify-between gap-2'>
              <p className='text-sm font-semibold text-slate-900'>Select a delivery address</p>
              <button
                type='button'
                onClick={openAddressModal}
                className='text-[11px] font-semibold text-slate-700 underline underline-offset-2'
              >
                Add New
              </button>
            </div>
            <div className='mt-2 rounded-md border border-slate-200 bg-white px-3 py-2'>
              {isLoadingAddresses ? (
                <div className='h-10 animate-pulse rounded-md bg-slate-100' />
              ) : addresses.length > 0 ? (
                <div className='space-y-2'>
                  {addresses.map((address) => {
                    const isSelected = selectedAddressId === address.id
                    const mobileAddressLine = [
                      address.line1,
                      address.line2,
                      [address.city, address.state].filter(Boolean).join(', '),
                      [address.postalCode, address.country].filter(Boolean).join(', '),
                    ]
                      .filter(Boolean)
                      .join(', ')

                    return (
                      <div
                        key={`mobile-address-${address.id}`}
                        className='flex w-full items-start gap-2'
                      >
                        <span
                          className={`mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                            isSelected ? 'border-slate-900' : 'border-slate-300'
                          }`}
                          aria-hidden='true'
                        >
                          {isSelected ? <span className='h-2 w-2 rounded-full bg-slate-900' /> : null}
                        </span>
                        <button
                          type='button'
                          onClick={() => setSelectedAddressId(address.id)}
                          className='min-w-0 flex-1 text-left'
                        >
                          <p className='text-xs font-semibold text-slate-900'>
                            {address.label}
                            {address.isDefault ? (
                              <span className='ml-1 rounded-full border border-slate-300 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600'>
                                Default
                              </span>
                            ) : null}
                          </p>
                          <p className='line-clamp-2 text-[11px] text-slate-500'>{mobileAddressLine}</p>
                        </button>
                        <button
                          type='button'
                          onClick={() => {
                            setSelectedAddressId(address.id)
                            openEditAddressModal(address)
                          }}
                          className='inline-flex h-7 w-7 items-center justify-center text-slate-500'
                          aria-label='Edit address'
                        >
                          <svg
                            viewBox='0 0 20 20'
                            className='h-4 w-4'
                            fill='none'
                            stroke='currentColor'
                            strokeWidth='1.8'
                            aria-hidden='true'
                          >
                            <path
                              d='M3.5 13.5v3h3L15.6 7.4a1.2 1.2 0 0 0 0-1.7L14.3 4.4a1.2 1.2 0 0 0-1.7 0L3.5 13.5Z'
                              strokeLinecap='round'
                              strokeLinejoin='round'
                            />
                            <path d='m11.5 5.5 3 3' strokeLinecap='round' strokeLinejoin='round' />
                          </svg>
                        </button>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className='text-xs text-slate-500'>No saved address yet. Add one below.</p>
              )}
            </div>

          </div>

            <div className='mt-3'>
              <p className='text-sm font-semibold text-slate-900'>Shipping option</p>
              <div className='mt-2 space-y-2'>
                {deliveryOptionsWithPricing
                  .filter(
                    (option) =>
                      MOBILE_DELIVERY_OPTION_IDS.has(option.id) &&
                      availableDeliveryOptionIds.includes(option.id),
                  )
                  .map((option) => {
                    const isActive = selectedDeliveryOptionId === option.id
                    const feeLabel = formatFeeOrFree(option.displayFee, option.displayCurrency)
                    return (
                      <button
                        key={`mobile-delivery-${option.id}`}
                        type='button'
                        onClick={() => setSelectedDeliveryOptionId(option.id)}
                        className={`w-full rounded-lg border p-3 text-left transition ${
                          isActive
                            ? 'border-sky-400 bg-sky-50/40 shadow-sm'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className='flex items-start justify-between gap-3'>
                          <div>
                            <div className='flex items-center gap-2'>
                                <p className='text-sm font-semibold text-slate-900'>{option.label}</p>
                              {option.badge ? (
                                <span className='rounded-md bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold text-white'>
                                  {option.badge}
                                </span>
                              ) : null}
                            </div>
                            {isShippingDisplayPending ? (
                              <div className='mt-1 h-3 w-40 animate-pulse rounded bg-slate-200' />
                            ) : logisticsCoverage ? (
                              <p className='mt-1 text-[11px] text-slate-500'>{logisticsCoverage}</p>
                            ) : null}
                          </div>
                          <div className='flex items-center gap-2'>
                              <span className='text-sm font-semibold text-slate-900'>
                              {isShippingDisplayPending ? (
                                <span className='inline-block h-4 w-14 animate-pulse rounded bg-slate-200 align-middle' />
                              ) : (
                                feeLabel
                              )}
                            </span>
                            <span
                              className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${
                                isActive ? 'border-sky-500 bg-sky-500' : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isActive ? <span className='h-1.5 w-1.5 rounded-full bg-white' /> : null}
                            </span>
                          </div>
                        </div>
                        {option.displayNote ? (
                          <p className='mt-3 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] text-slate-600'>
                            {option.displayNote}
                          </p>
                        ) : null}
                      </button>
                    )
                  })}
              </div>
            </div>
          </>
          ) : (
            <div className='mt-4'>
              <div className='flex items-center justify-between gap-2'>
                <p className='text-sm font-semibold text-slate-900'>Pickup location</p>
              </div>
              <div className='mt-2 rounded-md border border-slate-200 bg-white px-3 py-3'>
                {isLoadingPickupLocations ? (
                  <div className='h-10 animate-pulse rounded-md bg-slate-100' />
                ) : pickupLocations.length > 0 ? (
                  <div className='space-y-2'>
                    {pickupLocations.map((location) => {
                      const isSelected = selectedPickupLocationId === location.id
                      return (
                        <button
                          key={`mobile-pickup-${location.id}`}
                          type='button'
                          onClick={() => setSelectedPickupLocationId(location.id)}
                          className={`w-full rounded-md border px-2.5 py-2 text-left ${
                            isSelected
                              ? 'border-slate-900 bg-slate-50'
                              : 'border-slate-200 bg-white'
                          }`}
                        >
                          <div className='flex items-start gap-2'>
                            <span
                              className={`mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                                isSelected ? 'border-slate-900' : 'border-slate-300'
                              }`}
                            >
                              {isSelected ? <span className='h-2 w-2 rounded-full bg-slate-900' /> : null}
                            </span>
                            <div className='min-w-0'>
                              <p className='text-xs font-semibold text-slate-900'>{location.label}</p>
                              <p className='mt-0.5 text-[11px] text-slate-500'>{buildAddressLine(location)}</p>
                              {location.hours ? (
                                <p className='mt-1 text-[11px] font-medium text-slate-700'>{location.hours}</p>
                              ) : null}
                              {location.note ? (
                                <p className='mt-1 text-[11px] text-slate-500'>{location.note}</p>
                              ) : null}
                              {location.phone ? (
                                <p className='mt-1 text-[11px] text-slate-500'>Contact: {location.phone}</p>
                              ) : null}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <p className='text-xs text-slate-500'>No pickup address found.</p>
                )}
              </div>
            </div>
          )}

          {addressError ? (
            <p className='mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700'>
              {addressError}
            </p>
          ) : null}

          <section className='mt-4 rounded-md border border-slate-200 bg-white px-3 py-2'>
            <p className='text-xs font-semibold uppercase tracking-[0.08em] text-slate-500'>Gift card</p>
            <div className='mt-2 flex items-center gap-2'>
              <input
                type='text'
                value={promoCode}
                onChange={(event) => {
                  setPromoCode(event.target.value)
                  if (promoError) setPromoError('')
                }}
                placeholder='Add gift card code'
                className='h-9 w-full rounded border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-slate-900'
              />
              <button
                type='button'
                onClick={applyPromoCode}
                className='h-9 shrink-0 rounded bg-slate-900 px-3 text-xs font-semibold text-white'
              >
                Apply
              </button>
            </div>
            {promoError ? <p className='mt-1 text-[11px] text-rose-600'>{promoError}</p> : null}
            {appliedPromoCode ? (
              <div className='mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700'>
                <span>{appliedPromoCode}</span>
                <button type='button' onClick={clearPromoCode} className='text-emerald-700 underline'>
                  Remove
                </button>
              </div>
            ) : null}
          </section>

          <div ref={mobileFooterAnchorRef} className='h-px w-full' />
          {!isMobileFooterFloating ? (
            <div className='mt-4 bg-white'>
              {mobileTotalsCard}
            </div>
          ) : null}
          {isMobileFooterFloating ? (
            <div className='fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+64px)] z-30 bg-white'>
              {mobileTotalsCard}
            </div>
          ) : null}

          <section className='mt-3 rounded-lg'>
            <button
              type='button'
              onClick={() => openMobileInfoMenu('all')}
              className='mb-2 flex w-full items-center justify-between text-left'
            >
              <p className='text-[16px] font-semibold text-slate-900'>Shop with Confidence</p>
              <span className='inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-slate-600' aria-hidden='true'>
                <svg viewBox='0 0 20 20' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='2'>
                  <path d='M8 5l5 5-5 5' strokeLinecap='round' strokeLinejoin='round' />
                </svg>
              </span>
            </button>
            <div className='grid grid-cols-4 gap-2'>
              {MOBILE_INFO_MENU_ITEMS.map((item) => (
                <button
                  key={item.key}
                  type='button'
                  onClick={() => openMobileInfoMenu(item.key)}
                  className='flex min-h-[4.4rem] flex-col items-center justify-start gap-1.5 text-center'
                >
                  {item.key === 'delivery' ? (
                    <svg viewBox='0 0 24 24' className='h-6 w-6 text-emerald-600' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                      <path d='M3.5 8.5h10v7h-10z' />
                      <path d='M13.5 10.5h4l2 2v3h-6z' />
                      <circle cx='7' cy='16.5' r='1.2' />
                      <circle cx='16.5' cy='16.5' r='1.2' />
                    </svg>
                  ) : null}
                  {item.key === 'payment' ? (
                    <svg viewBox='0 0 24 24' className='h-6 w-6 text-emerald-600' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                      <path d='M12 3.8 18.5 6v5.3c0 3.6-2.3 6.8-6.5 8.9-4.2-2.1-6.5-5.3-6.5-8.9V6z' />
                      <path d='M9.3 11.9 11.2 13.8 14.7 10.3' strokeLinecap='round' strokeLinejoin='round' />
                    </svg>
                  ) : null}
                  {item.key === 'securityPrivacy' ? (
                    <svg viewBox='0 0 24 24' className='h-6 w-6 text-emerald-600' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                      <rect x='5.2' y='10.3' width='13.6' height='9.2' rx='1.3' />
                      <path d='M8 10.3V8.8a4 4 0 1 1 8 0v1.5' />
                    </svg>
                  ) : null}
                  {item.key === 'support' ? (
                    <svg viewBox='0 0 24 24' className='h-6 w-6 text-emerald-600' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                      <path d='M5.5 11.5a6.5 6.5 0 1 1 13 0' />
                      <rect x='4' y='11.5' width='3.5' height='6' rx='1.2' />
                      <rect x='16.5' y='11.5' width='3.5' height='6' rx='1.2' />
                      <path d='M16.5 18.5c0 1.1-.9 2-2 2H12' />
                    </svg>
                  ) : null}
                  <span className='min-h-[2.35rem] whitespace-pre-line text-[12px] font-semibold leading-[1.15] text-slate-700'>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <div className='fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur'>
            <button
              type='button'
              onClick={handleMobileNext}
              disabled={isSavingAddress || !hasCartItems || (checkoutMode === 'delivery' && (isShippingDisplayPending || shippingStepTotal == null))}
              className='inline-flex w-full items-center justify-center gap-2 rounded-full bg-black px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50'
            >
              {isSavingAddress ? (
                'Saving...'
              ) : (
                <>
                  <span>Proceed to Pay</span>
                  <svg viewBox='0 0 24 24' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='2' aria-hidden='true'>
                    <rect x='3' y='6' width='18' height='12' rx='2' />
                    <path d='M3 10h18' />
                  </svg>
                </>
              )}
            </button>
          </div>

          {isOrderBreakdownOpen ? (
            <div className='fixed inset-0 z-[90]'>
              <button
                type='button'
                onClick={() => setIsOrderBreakdownOpen(false)}
                className='absolute inset-0 bg-black/45'
                aria-label='Close order breakdown'
              />
              <section className='absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white p-4 [animation:order-breakdown-up_220ms_ease-out] md:inset-y-0 md:right-0 md:left-auto md:h-full md:w-full md:max-w-[420px] md:rounded-none md:border-l md:border-slate-200 md:[animation:order-breakdown-right_220ms_ease-out]'>
                <div className='mb-3 flex items-center justify-between'>
                  <h3 className='text-base font-semibold text-slate-900'>Order breakdown</h3>
                  <button
                    type='button'
                    onClick={() => setIsOrderBreakdownOpen(false)}
                    className='text-2xl font-bold leading-none text-slate-600'
                    aria-label='Close'
                  >
                    ×
                  </button>
                </div>
                <div className='space-y-2 text-sm'>
                  <div className='flex items-center justify-between text-slate-600'>
                    <span>Subtotal</span>
                    <span className='font-semibold text-slate-900'>{formatMoney(checkoutSummary.subtotal)}</span>
                  </div>
                  {checkoutSummary.savings > 0 ? (
                    <div className='flex items-center justify-between text-slate-600'>
                      <span>Savings</span>
                      <span className='font-semibold text-emerald-700'>-{formatMoney(checkoutSummary.savings)}</span>
                    </div>
                  ) : null}
                  <div className='flex items-center justify-between text-slate-600'>
                    <span>Shipping fee</span>
                    <span className='font-semibold text-slate-900'>
                      {isShippingDisplayPending ? (
                        <span className='inline-block h-4 w-14 animate-pulse rounded bg-slate-200 align-middle' />
                      ) : (
                        formatFeeOrFree(shippingDisplayAmount, shippingDisplayCurrency)
                      )}
                    </span>
                  </div>
                  {protectionFee > 0 ? (
                    <div className='flex items-center justify-between text-slate-600'>
                      <span>Order Protection</span>
                      <span className='font-semibold text-slate-900'>{formatMoney(protectionFee)}</span>
                    </div>
                  ) : null}
                  <div className='border-t border-slate-200 pt-2 flex items-center justify-between'>
                    <span className='font-semibold text-slate-900'>Total payment</span>
                    <span className='font-bold text-slate-900'>
                      {isShippingDisplayPending || shippingStepTotal == null ? (
                        <span className='inline-block h-5 w-20 animate-pulse rounded bg-slate-200 align-middle' />
                      ) : (
                        formatMoney(shippingStepTotal)
                      )}
                    </span>
                  </div>
                </div>
              </section>
              <style jsx>{`
                @keyframes order-breakdown-up {
                  from { transform: translateY(28px); opacity: 0.96; }
                  to { transform: translateY(0); opacity: 1; }
                }
                @keyframes order-breakdown-right {
                  from { transform: translateX(28px); opacity: 0.96; }
                  to { transform: translateX(0); opacity: 1; }
                }
              `}</style>
            </div>
          ) : null}

          {isMobileInfoMenuOpen ? (
            <div className='fixed inset-0 z-[95] sm:hidden'>
              <button
                type='button'
                onClick={closeMobileInfoMenu}
                className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${
                  isMobileInfoMenuClosing ? 'opacity-0' : 'opacity-100'
                }`}
                aria-label='Close info menu'
              />
              <section
                style={{
                  transform: `translateY(${isMobileInfoMenuClosing ? '100%' : `${mobileInfoSheetDragY}px`})`,
                }}
                className={`absolute inset-x-0 bottom-0 overflow-hidden rounded-t-3xl bg-white shadow-[0_-20px_50px_rgba(15,23,42,0.25)] ${
                  isMobileInfoSheetDragging
                    ? ''
                    : 'transition-transform duration-200 ease-out [animation:mobile-info-sheet-up_220ms_ease-out]'
                }`}
              >
                <div className='border-b border-slate-200 bg-[linear-gradient(145deg,#ffffff_0%,#f8fafc_70%,#eef2ff_100%)] px-4 py-3'>
                  <button
                    type='button'
                    onClick={closeMobileInfoMenu}
                    onPointerDown={handleMobileInfoSheetDragStart}
                    onPointerMove={handleMobileInfoSheetDragMove}
                    onPointerUp={handleMobileInfoSheetDragEnd}
                    onPointerCancel={handleMobileInfoSheetDragEnd}
                    className='mx-auto mb-2.5 block h-4 w-20 touch-none select-none'
                    aria-label='Close info menu'
                  >
                    <span className='mx-auto block h-1.5 w-14 rounded-full bg-slate-300/80' />
                  </button>
                  <div className='flex items-center justify-start'>
                    <h3 className='text-[17px] font-semibold text-slate-900'>
                      {activeMobileInfoKey === 'all' ? 'Shop with Confidence' : activeMobileInfoContent.title}
                    </h3>
                  </div>
                </div>
                {activeMobileInfoKey === 'all' ? (
                  <div className='max-h-[68vh] space-y-3 overflow-y-auto px-4 pb-4 pt-3'>
                    {mobileInfoSections.map((section, index) => (
                      <div
                        key={`mobile-info-all-${section.key}`}
                        className={`rounded-2xl border border-slate-200 bg-slate-50/70 p-3 ${
                          index === 0 ? '' : 'shadow-[0_4px_14px_rgba(15,23,42,0.04)]'
                        }`}
                      >
                        <div className='flex items-start gap-3'>
                          <span className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700'>
                            {renderMobileInfoIcon(section.key, 'h-5 w-5')}
                          </span>
                          <div className='min-w-0'>
                            <p className='text-[15px] font-semibold text-slate-900'>{section.title}</p>
                            <p className='mt-1 text-sm leading-6 text-slate-600'>{section.body}</p>
                            {section.actionHref ? (
                              <a
                                href={section.actionHref}
                                target={section.actionNewTab ? '_blank' : undefined}
                                rel={section.actionNewTab ? 'noopener noreferrer' : undefined}
                                className='mt-1 inline-flex items-center gap-1 text-sm font-semibold text-slate-700'
                              >
                                <span>{section.actionLabel || 'Learn more'}</span>
                                <svg viewBox='0 0 20 20' className='h-3.5 w-3.5' fill='none' stroke='currentColor' strokeWidth='2' aria-hidden='true'>
                                  <path d='M8 5l5 5-5 5' strokeLinecap='round' strokeLinejoin='round' />
                                </svg>
                              </a>
                            ) : null}
                            {section.key === 'payment' ? (
                              <div className='mt-2 flex flex-wrap items-center gap-1.5'>
                                <span className='text-[11px] font-extrabold tracking-tight text-[#1A1F71]'>VISA</span>
                                <span className='text-[11px] font-extrabold text-[#eb001b]'>Mastercard</span>
                                <span className='rounded bg-[#0b1d4d] px-1.5 py-0.5 text-[10px] font-bold text-white'>VERVE</span>
                                <span className='inline-flex h-5 items-center justify-center rounded border border-slate-300 bg-slate-100 px-1.5 text-[10px] font-bold text-slate-700'>BANK</span>
                                <span className='inline-flex h-5 items-center justify-center rounded border border-emerald-300 bg-emerald-50 px-1.5 text-[10px] font-bold text-emerald-700'>*737#</span>
                                <span className='rounded bg-[#2E77BC] px-1.5 py-0.5 text-[10px] font-bold text-white'>AMEX</span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='px-4 pb-4 pt-3'>
                    <div className='rounded-2xl border border-slate-200 bg-slate-50/70 p-3'>
                      <div className='flex items-start gap-3'>
                        <span className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700'>
                          {renderMobileInfoIcon(activeMobileInfoKey, 'h-5 w-5')}
                        </span>
                        <div className='min-w-0'>
                          <p className='text-[15px] font-semibold text-slate-900'>{activeMobileInfoContent.title}</p>
                          <p className='mt-1 text-sm leading-6 text-slate-600'>{activeMobileInfoContent.body}</p>
                          {activeMobileInfoContent.actionHref ? (
                            <a
                              href={activeMobileInfoContent.actionHref}
                              target={activeMobileInfoContent.actionNewTab ? '_blank' : undefined}
                              rel={activeMobileInfoContent.actionNewTab ? 'noopener noreferrer' : undefined}
                              className='mt-1 inline-flex items-center gap-1 text-sm font-semibold text-slate-700'
                            >
                              <span>{activeMobileInfoContent.actionLabel || 'Learn more'}</span>
                              <svg viewBox='0 0 20 20' className='h-3.5 w-3.5' fill='none' stroke='currentColor' strokeWidth='2' aria-hidden='true'>
                                <path d='M8 5l5 5-5 5' strokeLinecap='round' strokeLinejoin='round' />
                              </svg>
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </section>
              <style jsx>{`
                @keyframes mobile-info-sheet-up {
                  from {
                    transform: translateY(28px);
                    opacity: 0.96;
                  }
                  to {
                    transform: translateY(0);
                    opacity: 1;
                  }
                }
              `}</style>
            </div>
          ) : null}

        </section>

        <div className='mt-3 hidden gap-3 sm:grid lg:grid-cols-2'>
          <section className='p-0 sm:rounded-lg sm:border sm:border-slate-200 sm:bg-white sm:p-5'>
            <div className='flex items-start justify-between gap-3'>
              <div>
                <h1 className='text-[25px] font-semibold leading-none text-slate-900'>
                  {checkoutMode === 'pickup' ? 'Select pickup location' : 'Select delivery address'}
                </h1>
                <p className='mt-1 text-sm text-slate-500'>
                  {checkoutMode === 'pickup'
                    ? 'Please confirm your pickup location and schedule before proceeding.'
                    : 'Please confirm your delivery address and shipping method before proceeding.'}
                </p>
              </div>
              <div className='inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1'>
                <button
                  type='button'
                  onClick={() => setCheckoutMode('delivery')}
                  className={`rounded-md px-4 py-1.5 text-xs font-semibold ${
                    checkoutMode === 'delivery'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500'
                  }`}
                >
                  Delivery
                </button>
                <button
                  type='button'
                  onClick={() => setCheckoutMode('pickup')}
                  className={`rounded-md px-4 py-1.5 text-xs font-semibold ${
                    checkoutMode === 'pickup'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500'
                  }`}
                >
                  Pickup
                </button>
              </div>
            </div>

            <div className='mt-4 p-0 sm:rounded-lg sm:border sm:border-slate-200 sm:bg-slate-50/60 sm:p-3'>
              {checkoutMode === 'pickup' ? (
                isLoadingPickupLocations ? (
                  <div className='h-12 animate-pulse rounded-md bg-slate-200' />
                ) : pickupLocations.length > 0 ? (
                  <div className='space-y-2'>
                    {pickupLocations.map((location) => {
                      const isSelected = location.id === selectedPickupLocationId
                      return (
                        <button
                          key={`desktop-pickup-${location.id}`}
                          type='button'
                          onClick={() => setSelectedPickupLocationId(location.id)}
                          className={`flex w-full items-start gap-3 rounded-md border px-3 py-2 text-left ${
                            isSelected
                              ? 'border-slate-900 bg-white'
                              : 'border-slate-200 bg-white/80'
                          }`}
                        >
                          <span
                            className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border ${
                              isSelected ? 'border-slate-900 bg-slate-900' : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected ? <span className='h-2 w-2 rounded-full bg-white' /> : null}
                          </span>
                          <span>
                            <p className='text-sm font-semibold text-slate-900'>{location.label}</p>
                            <p className='text-xs text-slate-500'>{buildAddressLine(location)}</p>
                            {location.hours ? (
                              <p className='mt-1 text-xs font-medium text-slate-700'>{location.hours}</p>
                            ) : null}
                            {location.note ? (
                              <p className='mt-1 text-xs text-slate-500'>{location.note}</p>
                            ) : null}
                            {location.phone ? (
                              <p className='mt-1 text-xs text-slate-500'>Contact: {location.phone}</p>
                            ) : null}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <p className='text-sm text-slate-600'>No pickup address found.</p>
                )
              ) : isLoadingAddresses ? (
                <div className='h-12 animate-pulse rounded-md bg-slate-200' />
              ) : selectedAddress ? (
                <div className='flex items-start justify-between gap-3'>
                  <button
                    type='button'
                    onClick={() => setSelectedAddressId(selectedAddress.id)}
                    className='flex items-start gap-3 text-left'
                  >
                    <span className='mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900'>
                      <span className='h-2 w-2 rounded-full bg-white' />
                    </span>
                    <span>
                      <p className='text-sm font-semibold text-slate-900'>
                        {selectedAddress.label}
                        {selectedAddress.isDefault ? (
                          <span className='ml-1 rounded-full border border-slate-300 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600'>
                            Default
                          </span>
                        ) : null}
                      </p>
                      <p className='text-xs text-slate-500'>{selectedAddressLine}</p>
                    </span>
                  </button>
                  <button
                    type='button'
                    onClick={() => openEditAddressModal(selectedAddress)}
                    className='inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:text-slate-700'
                    aria-label='Edit selected address'
                  >
                    <svg
                      viewBox='0 0 20 20'
                      className='h-5 w-5'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='1.8'
                      aria-hidden='true'
                    >
                      <path
                        d='M3.5 13.5v3h3L15.6 7.4a1.2 1.2 0 0 0 0-1.7L14.3 4.4a1.2 1.2 0 0 0-1.7 0L3.5 13.5Z'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                      <path d='m11.5 5.5 3 3' strokeLinecap='round' strokeLinejoin='round' />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className='flex items-center justify-between gap-3'>
                  <p className='text-sm text-slate-600'>No saved addresses found.</p>
                  <button
                    type='button'
                    onClick={openAddressModal}
                    className='rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white'
                  >
                    Add address
                  </button>
                </div>
              )}
            </div>

            {checkoutMode === 'delivery' && addresses.length > 0 ? (
              <div className='mt-3 flex flex-wrap gap-2'>
                {addresses.map((address) => (
                  <button
                    key={address.id}
                    type='button'
                    onClick={() => setSelectedAddressId(address.id)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      address.id === selectedAddressId
                        ? 'border-sky-500 bg-sky-50 text-sky-700'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    {address.label}
                    {address.isDefault ? ' (Default)' : ''}
                  </button>
                ))}
                <button
                  type='button'
                  onClick={openAddressModal}
                  className='rounded-full border border-dashed border-slate-300 px-3 py-1 text-xs font-medium text-slate-500'
                >
                  + New address
                </button>
              </div>
            ) : null}

            <div className='mt-5 border-t border-slate-200 pt-5'>
              {checkoutMode === 'pickup' ? (
                <>
                  <h2 className='text-xl font-semibold text-slate-900'>Pickup details</h2>
                  <p className='mt-1 text-sm text-slate-500'>Your order will be prepared for store pickup.</p>

                  <div className='mt-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3'>
                    <div className='flex items-start justify-between gap-3'>
                      <div>
                        <p className='text-base font-semibold text-slate-900'>In-store pickup</p>
                        <p className='mt-1 text-xs text-slate-500'>Ready window: 30 - 60 min after payment confirmation</p>
                        {selectedPickupLocation ? (
                          <p className='mt-2 text-xs font-medium text-slate-700'>
                            Pickup point: {selectedPickupLocation.label}
                          </p>
                        ) : null}
                      </div>
                      <span className='rounded-md bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold text-white'>
                        FREE
                      </span>
                    </div>
                    <p className='mt-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600'>
                      {selectedPickupLocation
                        ? 'Pickup code will be sent to your account once your order is ready.'
                        : 'No pickup address found.'}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <h2 className='text-xl font-semibold text-slate-900'>Delivery Options</h2>
                  <p className='mt-1 text-sm text-slate-500'>Select your preferred delivery method.</p>

                  <div className='mt-3 px-0 py-1 text-xs text-slate-500 sm:rounded-lg sm:border sm:border-slate-200 sm:bg-slate-50 sm:px-3 sm:py-2'>
                    Delivery speed may vary based on the time your order is placed.
                  </div>

                  <div className='mt-3 space-y-3'>
                    {visibleDeliveryOptions.map((option) => {
                        const isActive = selectedDeliveryOptionId === option.id
                        return (
                          <button
                            key={option.id}
                            type='button'
                            onClick={() => setSelectedDeliveryOptionId(option.id)}
                            className={`w-full p-0 text-left transition sm:rounded-lg sm:border sm:p-4 ${
                              isActive
                                ? 'sm:border-sky-400 sm:bg-sky-50/40 sm:shadow-sm'
                                : 'sm:border-slate-200 sm:bg-white sm:hover:border-slate-300'
                            }`}
                          >
                            <div className='flex items-start justify-between gap-3'>
                              <div>
                                <div className='flex items-center gap-2'>
                                  <p className='text-base font-semibold text-slate-900'>{option.label}</p>
                                  {option.badge ? (
                                    <span className='rounded-md bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold text-white'>
                                      {option.badge}
                                    </span>
                                  ) : null}
                                </div>
                                {isShippingDisplayPending ? (
                                  <div className='mt-1 h-3 w-48 animate-pulse rounded bg-slate-200' />
                                ) : logisticsCoverage ? (
                                  <p className='mt-1 text-xs text-slate-500'>{logisticsCoverage}</p>
                                ) : null}
                              </div>
                              <div className='flex items-center gap-3'>
                                <span className='text-sm font-semibold text-slate-900'>
                                  {isShippingDisplayPending ? (
                                    <span className='inline-block h-4 w-16 animate-pulse rounded bg-slate-200 align-middle' />
                                  ) : (
                                    formatFeeOrFree(option.displayFee, option.displayCurrency)
                                  )}
                                </span>
                                <span
                                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full border ${
                                    isActive
                                      ? 'border-sky-500 bg-sky-500'
                                      : 'border-slate-300 bg-white'
                                  }`}
                                >
                                  {isActive ? (
                                    <span className='h-2 w-2 rounded-full bg-white' />
                                  ) : null}
                                </span>
                              </div>
                            </div>
                            {option.displayNote ? (
                              <p className='mt-3 px-0 py-1 text-xs text-slate-600 sm:rounded-md sm:border sm:border-slate-200 sm:bg-white sm:px-3 sm:py-2'>
                                {option.displayNote}
                              </p>
                            ) : null}
                          </button>
                        )
                      })}
                  </div>
                </>
              )}
            </div>

            <div className='mt-5'>
              <button
                type='button'
                onClick={goToPayment}
                disabled={!hasCartItems || !hasSelectedAddress || (checkoutMode === 'delivery' && (isShippingDisplayPending || shippingStepTotal == null))}
                className='hidden w-full items-center justify-center gap-2 rounded-full bg-black px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 lg:inline-flex'
              >
                <span>Continue to Payment</span>
                <svg viewBox='0 0 24 24' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='2' aria-hidden='true'>
                  <rect x='3' y='6' width='18' height='12' rx='2' />
                  <path d='M3 10h18' />
                </svg>
              </button>
            </div>
          </section>

          <div className='self-start space-y-3 lg:col-start-2 lg:row-start-1'>
            <aside className='p-0 sm:rounded-lg sm:border sm:border-slate-200 sm:bg-white sm:p-5'>
              <div className='flex items-center justify-between py-2'>
                <button
                  type='button'
                  onClick={() => setIsOrderSummaryOpen((prev) => !prev)}
                  className='text-left'
                  aria-expanded={isOrderSummaryOpen}
                  aria-label={isOrderSummaryOpen ? 'Collapse order summary' : 'Expand order summary'}
                >
                  <h2 className='text-2xl font-semibold leading-none text-slate-900'>Order Summary</h2>
                  <p className='mt-1 text-xs text-slate-500'>
                    {`${checkoutSummary.itemCount} item${checkoutSummary.itemCount === 1 ? '' : 's'} • ${
                      isShippingDisplayPending || totalAmount == null ? '...' : formatMoney(totalAmount)
                    }`}
                  </p>
                </button>
                <button
                  type='button'
                  onClick={() => setIsOrderSummaryOpen((prev) => !prev)}
                  className='inline-flex h-7 w-7 items-center justify-center text-slate-600'
                  aria-label={isOrderSummaryOpen ? 'Collapse order summary' : 'Expand order summary'}
                >
                  <svg
                    viewBox='0 0 20 20'
                    className={`h-4 w-4 transition-transform ${isOrderSummaryOpen ? 'rotate-90' : ''}`}
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    aria-hidden='true'
                  >
                    <path d='M8 5l5 5-5 5' strokeLinecap='round' strokeLinejoin='round' />
                  </svg>
                </button>
              </div>

            <div className={`${isOrderSummaryOpen ? 'mt-4 space-y-3' : 'hidden'}`}>
              {checkoutItems.map((item) => {
                const currentPrice = Number(item.price || 0)
                const regularPrice = Number(item.originalPrice || item.price || 0)
                const hasDiscountPrice = regularPrice > currentPrice

                return (
                  <div key={item.key} className='flex items-start gap-3'>
                    <img
                      src={item.image || '/favicon.ico'}
                      alt={item.name}
                      className='h-20 w-20 rounded-lg border border-slate-200 object-cover'
                    />
                    <div className='min-w-0 flex-1'>
                      <p className='truncate text-sm font-semibold text-slate-900'>{item.name}</p>
                      <div className='mt-0.5 flex items-center gap-2'>
                        <p className={`text-sm font-semibold ${hasDiscountPrice ? 'text-[#ff4d1f]' : 'text-slate-700'}`}>
                          {formatMoney(item.price)}
                        </p>
                        {hasDiscountPrice ? (
                          <p className='text-xs text-slate-400 line-through'>{formatMoney(regularPrice)}</p>
                        ) : null}
                      </div>
                      <button
                        type='button'
                        onClick={() => removeItem(item.key)}
                        className='mt-1 inline-flex text-xs font-medium text-rose-600 underline underline-offset-2 hover:text-rose-700'
                      >
                        Remove
                      </button>
                    </div>
                    <div className='shrink-0'>
                      <CartQuantitySelect
                        quantity={item.quantity}
                        onChange={(nextQuantity) => updateQuantity(item.key, nextQuantity)}
                        isLoading={Boolean(item.isSyncing)}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            <div className='mt-4'>
              <h3 className='text-2xl font-semibold leading-none text-slate-900'>Gift card</h3>
              <div className='mt-2 flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2'>
                <input
                  type='text'
                  value={promoCode}
                  onChange={(event) => {
                    setPromoCode(event.target.value)
                    if (promoError) setPromoError('')
                  }}
                  placeholder='Add gift card code'
                  className='w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400'
                />
                <button
                  type='button'
                  onClick={applyPromoCode}
                  className='inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-slate-500'
                  aria-label='Apply gift card code'
                >
                  <svg
                    viewBox='0 0 20 20'
                    className='h-5 w-5'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='1.8'
                    aria-hidden='true'
                  >
                    <path d='m7 5 6 5-6 5' strokeLinecap='round' strokeLinejoin='round' />
                  </svg>
                </button>
              </div>
              {promoError ? <p className='mt-1 text-xs text-rose-600'>{promoError}</p> : null}
              {appliedPromoCode ? (
                <div className='mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700'>
                  <span>{appliedPromoCode}</span>
                  <button type='button' onClick={clearPromoCode} className='underline'>
                    Remove
                  </button>
                </div>
              ) : null}
            </div>

            <div className='mt-4'>
              <h3 className='text-2xl font-semibold leading-none text-slate-900'>Order Total</h3>
              <div className='mt-3 space-y-2 text-sm'>
                <div className='flex items-center justify-between text-slate-600'>
                  <span>Subtotal</span>
                  <span className='font-semibold text-slate-900'>{formatMoney(checkoutSummary.subtotal)}</span>
                </div>
                <div className='flex items-center justify-between text-slate-600'>
                  <span>Shipping</span>
                  <span className='font-semibold text-slate-900'>
                    {isShippingDisplayPending ? (
                      <span className='inline-block h-4 w-14 animate-pulse rounded bg-slate-200 align-middle' />
                    ) : (
                      formatFeeOrFree(shippingDisplayAmount, shippingDisplayCurrency)
                    )}
                  </span>
                </div>
                {protectionFee > 0 ? (
                  <div className='flex items-center justify-between text-slate-600'>
                    <span>Order Protection</span>
                    <span className='font-semibold text-slate-900'>{formatMoney(protectionFee)}</span>
                  </div>
                ) : null}
                <div className='border-t border-slate-200 pt-2 flex items-center justify-between text-base font-semibold'>
                  <span className='text-slate-900'>Total</span>
                  <span className='text-sky-600'>
                    {isShippingDisplayPending || totalAmount == null ? (
                      <span className='inline-block h-5 w-20 animate-pulse rounded bg-slate-200 align-middle' />
                    ) : (
                      formatMoney(totalAmount)
                    )}
                  </span>
                </div>
              </div>
            </div>

              {!isReady || !isServerReady ? (
                <div className='mt-3 h-3 w-40 animate-pulse rounded bg-slate-200' />
              ) : null}
            </aside>

            <aside className='hidden rounded-lg border border-slate-200 bg-white p-4 lg:block'>
              <h3 className='text-lg font-semibold text-slate-900'>Shop with Confidence</h3>
              <div className='mt-2 space-y-4'>
                <div>
                  <p className='flex items-center gap-2 text-base font-semibold text-emerald-700'>
                    <svg viewBox='0 0 24 24' className='h-5 w-5' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                      <path d='M12 3.8 18.5 6v5.3c0 3.6-2.3 6.8-6.5 8.9-4.2-2.1-6.5-5.3-6.5-8.9V6z' />
                      <path d='M9.3 11.9 11.2 13.8 14.7 10.3' strokeLinecap='round' strokeLinejoin='round' />
                    </svg>
                    Secure Payments
                  </p>
                  <p className='mt-1 text-sm leading-6 text-slate-600'>
                    Your payment information is securely encrypted and processed through trusted
                    payment providers to complete your order safely.
                  </p>
                  <div className='mt-2 flex flex-wrap items-center gap-2'>
                    <span className='text-[11px] font-extrabold tracking-tight text-[#1A1F71]'>VISA</span>
                    <span className='text-[11px] font-extrabold text-[#eb001b]'>Mastercard</span>
                    <span className='rounded bg-[#0b1d4d] px-1.5 py-0.5 text-[10px] font-bold text-white'>VERVE</span>
                    <span className='inline-flex h-5 items-center justify-center rounded border border-slate-300 bg-slate-100 px-1.5 text-[10px] font-bold text-slate-700'>BANK</span>
                    <span className='inline-flex h-5 items-center justify-center rounded border border-emerald-300 bg-emerald-50 px-1.5 text-[10px] font-bold text-emerald-700'>*737#</span>
                    <span className='rounded bg-[#2E77BC] px-1.5 py-0.5 text-[10px] font-bold text-white'>AMEX</span>
                  </div>
                </div>

                <div className='border-t border-slate-200 pt-3'>
                  <p className='flex items-center gap-2 text-base font-semibold text-emerald-700'>
                    <svg viewBox='0 0 24 24' className='h-5 w-5' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                      <rect x='5.2' y='10.3' width='13.6' height='9.2' rx='1.3' />
                      <path d='M8 10.3V8.8a4 4 0 1 1 8 0v1.5' />
                    </svg>
                    Privacy & Data Protection
                  </p>
                  <p className='mt-1 text-sm leading-6 text-slate-600'>
                    Your personal details and payment information are protected to ensure a safe and secure shopping experience.
                  </p>
                  <a
                    href='/privacy-policy'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='mt-1 inline-flex items-center text-sm font-semibold text-slate-700'
                  >
                    Learn more
                    <svg viewBox='0 0 20 20' className='ml-1 inline-block h-3.5 w-3.5' fill='none' stroke='currentColor' strokeWidth='2' aria-hidden='true'>
                      <path d='M8 5l5 5-5 5' strokeLinecap='round' strokeLinejoin='round' />
                    </svg>
                  </a>
                </div>

                <div className='border-t border-slate-200 pt-3'>
                  <p className='flex items-center gap-2 text-base font-semibold text-emerald-700'>
                    <svg viewBox='0 0 24 24' className='h-5 w-5' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                      <path d='M3.5 8.5h10v7h-10z' />
                      <path d='M13.5 10.5h4l2 2v3h-6z' />
                      <circle cx='7' cy='16.5' r='1.2' />
                      <circle cx='16.5' cy='16.5' r='1.2' />
                    </svg>
                    Delivery Protection
                  </p>
                  <p className='mt-1 text-sm leading-6 text-slate-600'>
                    Eligible orders are supported if a package is lost, returned, or arrives damaged during delivery.
                  </p>
                </div>

                <div className='border-t border-slate-200 pt-3'>
                  <p className='flex items-center gap-2 text-base font-semibold text-emerald-700'>
                    <svg viewBox='0 0 24 24' className='h-5 w-5' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                      <path d='M5.5 11.5a6.5 6.5 0 1 1 13 0' />
                      <rect x='4' y='11.5' width='3.5' height='6' rx='1.2' />
                      <rect x='16.5' y='11.5' width='3.5' height='6' rx='1.2' />
                      <path d='M16.5 18.5c0 1.1-.9 2-2 2H12' />
                    </svg>
                    Customer Support
                  </p>
                  <p className='mt-1 text-sm leading-6 text-slate-600'>
                    Need assistance with your order or account? Our support team is ready to help.
                  </p>
                  <a href='/UserBackend/messages' className='mt-1 inline-flex items-center gap-1 text-sm font-semibold text-slate-700'>
                    <span>Get help</span>
                    <svg viewBox='0 0 20 20' className='h-3.5 w-3.5' fill='none' stroke='currentColor' strokeWidth='2' aria-hidden='true'>
                      <path d='M8 5l5 5-5 5' strokeLinecap='round' strokeLinejoin='round' />
                    </svg>
                  </a>
                </div>
              </div>
            </aside>
          </div>
        </div>

        <div className='fixed inset-x-0 bottom-0 z-40 hidden border-t border-slate-200 bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur sm:block lg:hidden'>
          <button
            type='button'
            onClick={goToPayment}
            disabled={!hasCartItems || !hasSelectedAddress || (checkoutMode === 'delivery' && (isShippingDisplayPending || shippingStepTotal == null))}
            className='inline-flex w-full items-center justify-center gap-2 rounded-full bg-black px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50'
          >
            <span>Continue to Payment</span>
            <svg viewBox='0 0 24 24' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='2' aria-hidden='true'>
              <rect x='3' y='6' width='18' height='12' rx='2' />
              <path d='M3 10h18' />
            </svg>
          </button>
        </div>
      </div>

      <AddressEditorModal
        isOpen={isAddressModalOpen}
        addressType='shipping'
        editingId={editingAddressId}
        draft={draftAddress}
        setDraft={setDraftAddress}
        draftLabelSuggestion='Eg. Apartment address'
        isSaving={isSavingAddress}
        errorMessage={addressError}
        onClose={closeAddressModal}
        onSave={saveAddress}
        overlayTopClassName='top-0'
        closeAriaLabel='Close shipping address editor'
      />
    </div>
  )
}

export default ShippingDetailsPage
