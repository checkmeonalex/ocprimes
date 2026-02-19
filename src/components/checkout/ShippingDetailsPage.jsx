'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import CartQuantitySelect from '@/components/cart/CartQuantitySelect'
import { useCart } from '@/context/CartContext'
import { filterItemsByCheckoutSelection, parseCheckoutSelectionParam } from '@/lib/cart/checkout-selection'
import { useUserI18n } from '@/lib/i18n/useUserI18n'
import { ACCEPTED_COUNTRIES } from '@/lib/user/accepted-countries'
import {
  calculateOrderProtectionFee,
  isDigitalProductLike,
} from '@/lib/order-protection/config'

const TAX_RATE = 0.1
const DEFAULT_COUNTRY = 'Nigeria'
const INTERNATIONAL_COUNTRY = 'International'
const ACCEPTED_COUNTRY_SET = new Set(ACCEPTED_COUNTRIES)
const emptyAddressDraft = {
  label: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: DEFAULT_COUNTRY,
  isDefault: false,
}
const inputClassName =
  'mt-1 w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition duration-200 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10'
const createAddressId = () =>
  `addr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
const DELIVERY_OPTIONS = [
  {
    id: 'express',
    label: 'Express Delivery',
    estimate: '15 - 20 min',
    fee: 10,
    badge: 'Fastest',
    note: 'Order within 30m 59s for same-day delivery.',
  },
  {
    id: 'standard',
    label: 'Standard Delivery',
    estimate: '30 - 40 min',
    fee: 5,
    badge: '',
    note: '',
  },
]
const MOBILE_DELIVERY_OPTION_IDS = new Set(['express', 'standard'])
const MOBILE_INFO_MENU_ITEMS = [
  { key: 'delivery', label: 'Secure Delivery Guarantee' },
  { key: 'payment', label: 'Secure Your Payment' },
  { key: 'securityPrivacy', label: 'Security & Privacy' },
  { key: 'support', label: 'Customer Support' },
]

const normalizeAddresses = (profile) => {
  const addresses = Array.isArray(profile?.addresses) ? profile.addresses : []
  return addresses
    .filter((item) => item && typeof item === 'object')
    .map((item, index) => ({
      id: String(item.id || `address-${index + 1}`),
      label: String(item.label || `Address ${index + 1}`),
      line1: String(item.line1 || ''),
      line2: String(item.line2 || ''),
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
  if (ACCEPTED_COUNTRY_SET.has(next)) return next
  if (next.toLowerCase() === 'nigeria') return DEFAULT_COUNTRY
  return INTERNATIONAL_COUNTRY
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
  const [isMobileEditingAddress, setIsMobileEditingAddress] = useState(false)
  const [draftAddress, setDraftAddress] = useState(emptyAddressDraft)
  const [promoCode, setPromoCode] = useState('')
  const [appliedPromoCode, setAppliedPromoCode] = useState('')
  const [promoError, setPromoError] = useState('')
  const [isOrderBreakdownOpen, setIsOrderBreakdownOpen] = useState(false)
  const [isMobileInfoMenuOpen, setIsMobileInfoMenuOpen] = useState(false)
  const [activeMobileInfoKey, setActiveMobileInfoKey] = useState('payment')
  const [addressError, setAddressError] = useState('')
  const [isSavingAddress, setIsSavingAddress] = useState(false)
  const [isMobileFooterFloating, setIsMobileFooterFloating] = useState(true)
  const mobileFooterAnchorRef = useRef(null)
  const mobileAddressEditorRef = useRef(null)
  const [shippingProgressConfig, setShippingProgressConfig] = useState({
    enabled: true,
    standardFreeShippingThreshold: 50,
    expressFreeShippingThreshold: 100,
  })

  useEffect(() => {
    let cancelled = false

    const loadAddresses = async () => {
      setIsLoadingAddresses(true)
      try {
        const response = await fetch('/api/user/profile')
        if (!response.ok) {
          if (!cancelled) {
            setAddresses([])
            setSelectedAddressId('')
          }
          return
        }

        const payload = await response.json().catch(() => null)
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
    setAppliedPromoCode(promoParam)
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
      if (event.key === 'Escape') setIsMobileInfoMenuOpen(false)
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [isMobileInfoMenuOpen])

  useEffect(() => {
    let cancelled = false
    const loadShippingProgressSettings = async () => {
      try {
        const response = await fetch('/api/settings/cart-shipping-progress', { cache: 'no-store' })
        if (!response.ok) return
        const payload = await response.json().catch(() => null)
        if (cancelled || !payload) return
        setShippingProgressConfig({
          enabled: payload.enabled !== false,
          standardFreeShippingThreshold:
            Number(payload.standardFreeShippingThreshold) >= 0
              ? Number(payload.standardFreeShippingThreshold)
              : 50,
          expressFreeShippingThreshold:
            Number(payload.expressFreeShippingThreshold) >= 0
              ? Number(payload.expressFreeShippingThreshold)
              : 100,
        })
      } catch {
        // keep defaults
      }
    }
    void loadShippingProgressSettings()
    return () => {
      cancelled = true
    }
  }, [])

  const hasCartItems = checkoutItems.length > 0
  const hasSelectedAddress = Boolean(selectedAddressId)
  const selectedDeliveryOption =
    DELIVERY_OPTIONS.find((option) => option.id === selectedDeliveryOptionId) ||
    DELIVERY_OPTIONS[0]
  const standardThreshold = Number(shippingProgressConfig.standardFreeShippingThreshold || 50)
  const expressThreshold = Number(shippingProgressConfig.expressFreeShippingThreshold || 100)
  const subtotalValue = Number(checkoutSummary.subtotal || 0)
  const isStandardFreeUnlocked = subtotalValue >= standardThreshold
  const isExpressFreeUnlocked = subtotalValue >= expressThreshold
  const shippingFee =
    checkoutMode === 'pickup'
      ? 0
      : selectedDeliveryOption.id === 'express'
        ? isExpressFreeUnlocked
          ? 0
          : selectedDeliveryOption.fee
        : isStandardFreeUnlocked
          ? 0
          : selectedDeliveryOption.fee
  const taxAmount = Math.round(checkoutSummary.subtotal * TAX_RATE * 100) / 100
  const protectionFee = Number(checkoutSummary.protectionFee || 0)
  const totalAmount = checkoutSummary.subtotal + shippingFee + taxAmount + protectionFee
  const shippingStepTotal = checkoutSummary.subtotal + shippingFee + protectionFee
  const formatFeeOrFree = (amount) => (Number(amount || 0) <= 0 ? 'FREE' : formatMoney(amount))

  const selectedAddress = useMemo(
    () => addresses.find((entry) => entry.id === selectedAddressId) || null,
    [addresses, selectedAddressId],
  )
  const selectedAddressLine = useMemo(() => {
    if (!selectedAddress) return ''
    return [
      selectedAddress.line1,
      selectedAddress.line2,
      [selectedAddress.city, selectedAddress.state].filter(Boolean).join(', '),
      [selectedAddress.postalCode, selectedAddress.country].filter(Boolean).join(', '),
    ]
      .filter(Boolean)
      .join(', ')
  }, [selectedAddress])

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
    setIsMobileEditingAddress(true)
    setIsAddressModalOpen(true)
  }

  const openEditAddressModal = (address) => {
    setAddressError('')
    setEditingAddressId(address.id)
    setDraftAddress({
      label: address.label || '',
      line1: address.line1 || '',
      line2: address.line2 || '',
      city: address.city || '',
      state: address.state || '',
      postalCode: address.postalCode || '',
      country: normalizeCheckoutCountry(address.country),
      isDefault: Boolean(address.isDefault),
    })
    setIsMobileEditingAddress(true)
    setIsAddressModalOpen(true)
  }

  const closeAddressModal = () => {
    if (isSavingAddress) return
    setIsAddressModalOpen(false)
    setEditingAddressId('')
    setAddressError('')
    setDraftAddress(emptyAddressDraft)
  }

  const updateDraftAddress = (key, value) => {
    setDraftAddress((prev) => ({ ...prev, [key]: value }))
  }

  const validateDraftAddress = () => {
    if (!draftAddress.line1.trim()) return 'Address line 1 is required.'
    if (!draftAddress.city.trim()) return 'City is required.'
    if (!draftAddress.country.trim()) return 'Country is required.'
    return ''
  }

  const goToPayment = () => {
    const selected = String(searchParams?.get('selected') || '').trim()
    const promo = String(appliedPromoCode || '').trim()
    const params = new URLSearchParams()
    if (selected) params.set('selected', selected)
    if (promo) params.set('promo', promo)
    const query = params.toString()
    router.push(query ? `/checkout/payment?${query}` : '/checkout/payment')
  }

  const applyPromoCode = () => {
    const normalized = String(promoCode || '').trim()
    if (!normalized) {
      setPromoError('Enter a promo code.')
      return
    }
    setPromoError('')
    setAppliedPromoCode(normalized)
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

  const saveAddress = async ({ continueToPayment = false, hideMobileEditorOnSuccess = false } = {}) => {
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
      line2: draftAddress.line2.trim(),
      city: draftAddress.city.trim(),
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
                city: defaultAddress.city || '',
                state: defaultAddress.state || '',
                postalCode: defaultAddress.postalCode || '',
                country: normalizeCheckoutCountry(defaultAddress.country),
              }
            : {
                line1: '',
                line2: '',
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
      } else if (hideMobileEditorOnSuccess) {
        setIsMobileEditingAddress(false)
        setAddressError('')
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
      goToPayment()
      return
    }

    if (isMobileEditingAddress) {
      setAddressError('Save your address before continuing.')
      return
    }

    if (!selectedAddress) {
      setAddressError('Select a delivery address or add one before continuing.')
      return
    }

    goToPayment()
  }

  const openMobileInfoMenu = (key) => {
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
        title: 'Secure Your Payment',
        body: 'Payment processing follows industry security standards and your card details are handled securely.',
      },
      {
        key: 'securityPrivacy',
        title: 'Security & Privacy',
        body: 'Your personal data is protected with physical, technical, and administrative safeguards.',
      },
      {
        key: 'support',
        title: 'Customer Support',
        body: 'Our support team is available to help with payment, shipping, and order-related questions.',
      },
    ],
    [],
  )

  const activeMobileInfoContent = useMemo(() => {
    const match = mobileInfoSections.find((entry) => entry.key === activeMobileInfoKey)
    return (
      match || {
        title: 'Secure Your Payment',
        body: 'Choose your preferred payment method at the next step. Charges are shown before final confirmation.',
      }
    )
  }, [activeMobileInfoKey, mobileInfoSections])

  const openAndScrollToAddressEditor = () => {
    setCheckoutMode('delivery')
    setIsMobileEditingAddress(true)
    window.setTimeout(() => {
      mobileAddressEditorRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 80)
  }

  const currentMobileStepIndex = 0
  const mobileTotalsCard = (
    <section className='w-full border-y border-slate-200 bg-white p-3 shadow-none lg:mx-auto lg:max-w-7xl'>
      <div className='mb-2 flex items-center justify-between text-sm font-semibold text-slate-900'>
        <span>Total Pay</span>
        <span>{formatMoney(shippingStepTotal)}</span>
      </div>
      <div className='mb-1 inline-flex items-center gap-1 text-[11px] text-slate-600'>
        <span>Includes Shipping Fee {formatFeeOrFree(shippingFee)}</span>
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
                setIsMobileEditingAddress(false)
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
                onClick={() => {
                  setDraftAddress({
                    ...emptyAddressDraft,
                    isDefault: false,
                    country: normalizeCheckoutCountry(profile?.country),
                  })
                  setEditingAddressId('')
                  setAddressError('')
                  setIsMobileEditingAddress(true)
                }}
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
                          onClick={() => {
                            setSelectedAddressId(address.id)
                            setIsMobileEditingAddress(false)
                          }}
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
                            openAndScrollToAddressEditor()
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

          {checkoutMode === 'delivery' && isMobileEditingAddress ? (
          <div ref={mobileAddressEditorRef} className='mt-4'>
            <div className='border-b border-slate-200 pb-2'>
              <label className='text-xs text-slate-500'>Full Name</label>
              <input
                type='text'
                value={String(profile?.firstName || profile?.displayName || '').trim()}
                readOnly
                className='mt-1 w-full bg-transparent text-sm text-slate-800 outline-none'
              />
            </div>
            <div className='border-b border-slate-200 pb-2 pt-3'>
              <label className='text-xs text-slate-500'>Street Address</label>
              <input
                type='text'
                value={draftAddress.line1}
                onChange={(event) => updateDraftAddress('line1', event.target.value)}
                className='mt-1 w-full bg-transparent text-sm text-slate-800 outline-none'
              />
            </div>
            <div className='border-b border-slate-200 pb-2 pt-3'>
              <label className='text-xs text-slate-500'>Apt / Suite / Other</label>
              <input
                type='text'
                value={draftAddress.line2}
                onChange={(event) => updateDraftAddress('line2', event.target.value)}
                className='mt-1 w-full bg-transparent text-sm text-slate-800 outline-none'
              />
            </div>
            <div className='border-b border-slate-200 pb-2 pt-3'>
              <label className='text-xs text-slate-500'>City</label>
              <input
                type='text'
                value={draftAddress.city}
                onChange={(event) => updateDraftAddress('city', event.target.value)}
                className='mt-1 w-full bg-transparent text-sm text-slate-800 outline-none'
              />
            </div>
            <div className='border-b border-slate-200 pb-2 pt-3'>
              <label className='text-xs text-slate-500'>Postal Code</label>
              <input
                type='text'
                value={draftAddress.postalCode}
                onChange={(event) => updateDraftAddress('postalCode', event.target.value)}
                className='mt-1 w-full bg-transparent text-sm text-slate-800 outline-none'
              />
            </div>
          </div>
          ) : null}

          {checkoutMode === 'delivery' && isMobileEditingAddress ? (
          <label className='mt-4 inline-flex items-center gap-2 text-sm text-slate-700'>
            <input
              className='h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500'
              type='checkbox'
              checked={draftAddress.isDefault}
              onChange={(event) => updateDraftAddress('isDefault', event.target.checked)}
            />
            Set as default
          </label>
          ) : null}

          {checkoutMode === 'delivery' && isMobileEditingAddress ? (
            <button
              type='button'
              onClick={() => saveAddress({ hideMobileEditorOnSuccess: true })}
              disabled={isSavingAddress}
              className='mt-4 w-full border border-slate-900 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-50'
            >
              {isSavingAddress ? 'Saving...' : 'Save'}
            </button>
          ) : null}

          </div>

            <div className='mt-3'>
              <p className='text-sm font-semibold text-slate-900'>Shipping option</p>
              <div className='mt-2 space-y-2'>
                {DELIVERY_OPTIONS.filter((option) => MOBILE_DELIVERY_OPTION_IDS.has(option.id)).map((option) => {
                  const isActive = selectedDeliveryOptionId === option.id
                  const feeLabel =
                    option.id === 'express'
                      ? isExpressFreeUnlocked
                        ? 'FREE'
                        : formatMoney(option.fee)
                      : isStandardFreeUnlocked
                        ? 'FREE'
                        : formatMoney(option.fee)
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
                          <p className='mt-0.5 text-[11px] text-slate-500'>Estimation {option.estimate}</p>
                        </div>
                        <div className='flex items-center gap-2'>
                          <span className='text-sm font-semibold text-slate-900'>{feeLabel}</span>
                          <span
                            className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${
                              isActive ? 'border-sky-500 bg-sky-500' : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isActive ? <span className='h-1.5 w-1.5 rounded-full bg-white' /> : null}
                          </span>
                        </div>
                      </div>
                      {option.note ? (
                        <p className='mt-3 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] text-slate-600'>
                          {option.note}
                        </p>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </div>
          </>
          ) : (
            <div className='mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600'>
              Pickup selected. No delivery address required.
            </div>
          )}

          {addressError ? (
            <p className='mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700'>
              {addressError}
            </p>
          ) : null}

          <section className='mt-4 rounded-md border border-slate-200 bg-white px-3 py-2'>
            <p className='text-xs font-semibold uppercase tracking-[0.08em] text-slate-500'>Promo code</p>
            <div className='mt-2 flex items-center gap-2'>
              <input
                type='text'
                value={promoCode}
                onChange={(event) => {
                  setPromoCode(event.target.value)
                  if (promoError) setPromoError('')
                }}
                placeholder='Add promo code'
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
              <p className='text-[16px] font-semibold text-slate-900'>Shop Safely and Sustainably</p>
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
                  className='flex flex-col items-center justify-start gap-1 text-center'
                >
                  {item.key === 'delivery' ? (
                    <svg viewBox='0 0 24 24' className='h-5 w-5 text-emerald-600' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                      <path d='M3.5 8.5h10v7h-10z' />
                      <path d='M13.5 10.5h4l2 2v3h-6z' />
                      <circle cx='7' cy='16.5' r='1.2' />
                      <circle cx='16.5' cy='16.5' r='1.2' />
                    </svg>
                  ) : null}
                  {item.key === 'payment' ? (
                    <svg viewBox='0 0 24 24' className='h-5 w-5 text-emerald-600' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                      <path d='M12 3.8 18.5 6v5.3c0 3.6-2.3 6.8-6.5 8.9-4.2-2.1-6.5-5.3-6.5-8.9V6z' />
                      <path d='M9.3 11.9 11.2 13.8 14.7 10.3' strokeLinecap='round' strokeLinejoin='round' />
                    </svg>
                  ) : null}
                  {item.key === 'securityPrivacy' ? (
                    <svg viewBox='0 0 24 24' className='h-5 w-5 text-emerald-600' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                      <rect x='5.2' y='10.3' width='13.6' height='9.2' rx='1.3' />
                      <path d='M8 10.3V8.8a4 4 0 1 1 8 0v1.5' />
                    </svg>
                  ) : null}
                  {item.key === 'support' ? (
                    <svg viewBox='0 0 24 24' className='h-5 w-5 text-emerald-600' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                      <path d='M5.5 11.5a6.5 6.5 0 1 1 13 0' />
                      <rect x='4' y='11.5' width='3.5' height='6' rx='1.2' />
                      <rect x='16.5' y='11.5' width='3.5' height='6' rx='1.2' />
                      <path d='M16.5 18.5c0 1.1-.9 2-2 2H12' />
                    </svg>
                  ) : null}
                  <span className='text-[11px] font-medium leading-tight text-slate-700'>{item.label}</span>
                </button>
              ))}
            </div>
          </section>

          <div className='fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur'>
            <button
              type='button'
              onClick={handleMobileNext}
              disabled={isSavingAddress || !hasCartItems}
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
                    <span className='font-semibold text-slate-900'>{formatFeeOrFree(shippingFee)}</span>
                  </div>
                  {protectionFee > 0 ? (
                    <div className='flex items-center justify-between text-slate-600'>
                      <span>Order Protection</span>
                      <span className='font-semibold text-slate-900'>{formatMoney(protectionFee)}</span>
                    </div>
                  ) : null}
                  <div className='border-t border-slate-200 pt-2 flex items-center justify-between'>
                    <span className='font-semibold text-slate-900'>Total payment</span>
                    <span className='font-bold text-slate-900'>{formatMoney(shippingStepTotal)}</span>
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
                onClick={() => setIsMobileInfoMenuOpen(false)}
                className='absolute inset-0 bg-black/40'
                aria-label='Close info menu'
              />
              <section className='absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-4'>
                <div className='mb-3 flex items-center justify-between'>
                  <h3 className='text-base font-semibold text-slate-900'>
                    {activeMobileInfoKey === 'all' ? 'Shop Safely and Sustainably' : activeMobileInfoContent.title}
                  </h3>
                  <button
                    type='button'
                    onClick={() => setIsMobileInfoMenuOpen(false)}
                    className='text-2xl font-bold leading-none text-slate-600'
                    aria-label='Close'
                  >
                    ×
                  </button>
                </div>
                {activeMobileInfoKey === 'all' ? (
                  <div className='space-y-3'>
                    {mobileInfoSections.map((section, index) => (
                      <div key={`mobile-info-all-${section.key}`} className={index > 0 ? 'border-t border-slate-200 pt-3' : ''}>
                        <p className='text-sm font-semibold text-slate-900'>{section.title}</p>
                        <p className='mt-1 text-sm leading-6 text-slate-600'>{section.body}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className='text-sm leading-6 text-slate-600'>{activeMobileInfoContent.body}</p>
                )}
              </section>
            </div>
          ) : null}

        </section>

        <div className='mt-3 hidden gap-3 sm:grid lg:grid-cols-2'>
          <section className='p-0 sm:rounded-lg sm:border sm:border-slate-200 sm:bg-white sm:p-5'>
            <div className='flex items-start justify-between gap-3'>
              <div>
                <h1 className='text-[25px] font-semibold leading-none text-slate-900'>
                  Select delevery address
                </h1>
                <p className='mt-1 text-sm text-slate-500'>
                  Please confirm your delivery address and shipping method before proceeding.
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
              {isLoadingAddresses ? (
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

            {addresses.length > 0 ? (
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
              <h2 className='text-xl font-semibold text-slate-900'>Delivery Options</h2>
              <p className='mt-1 text-sm text-slate-500'>Select your preferred delivery method.</p>

              <div className='mt-3 px-0 py-1 text-xs text-slate-500 sm:rounded-lg sm:border sm:border-slate-200 sm:bg-slate-50 sm:px-3 sm:py-2'>
                Delivery speed may vary based on the time your order is placed.
              </div>

              <div className='mt-3 space-y-3'>
                {DELIVERY_OPTIONS.map((option) => {
                  const isActive = selectedDeliveryOptionId === option.id
                  const isPickup = checkoutMode === 'pickup'
                  return (
                    <button
                      key={option.id}
                      type='button'
                      onClick={() => setSelectedDeliveryOptionId(option.id)}
                      disabled={isPickup}
                      className={`w-full p-0 text-left transition sm:rounded-lg sm:border sm:p-4 ${
                        isActive && !isPickup
                          ? 'sm:border-sky-400 sm:bg-sky-50/40 sm:shadow-sm'
                          : 'sm:border-slate-200 sm:bg-white'
                      } ${isPickup ? 'cursor-not-allowed opacity-50' : 'sm:hover:border-slate-300'}`}
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
                          <p className='mt-1 text-xs text-slate-500'>Estimation {option.estimate}</p>
                        </div>
                        <div className='flex items-center gap-3'>
                          <span className='text-sm font-semibold text-slate-900'>
                            {option.fee > 0 ? formatMoney(option.fee) : 'FREE'}
                          </span>
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full border ${
                              isActive && !isPickup
                                ? 'border-sky-500 bg-sky-500'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isActive && !isPickup ? (
                              <span className='h-2 w-2 rounded-full bg-white' />
                            ) : null}
                          </span>
                        </div>
                      </div>
                      {option.note ? (
                        <p className='mt-3 px-0 py-1 text-xs text-slate-600 sm:rounded-md sm:border sm:border-slate-200 sm:bg-white sm:px-3 sm:py-2'>
                          {option.note}
                        </p>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className='mt-5'>
              <button
                type='button'
                onClick={goToPayment}
                disabled={!hasCartItems || !hasSelectedAddress}
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
              <h2 className='text-2xl font-semibold leading-none text-slate-900'>Order Summary</h2>

            <div className='mt-4 space-y-3'>
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
              <h3 className='text-2xl font-semibold leading-none text-slate-900'>Promotion Code</h3>
              <div className='mt-2 flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2'>
                <input
                  type='text'
                  value={promoCode}
                  onChange={(event) => {
                    setPromoCode(event.target.value)
                    if (promoError) setPromoError('')
                  }}
                  placeholder='Add promo code'
                  className='w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400'
                />
                <button
                  type='button'
                  onClick={applyPromoCode}
                  className='inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-slate-500'
                  aria-label='Apply promo code'
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
                  <span className='font-semibold text-slate-900'>{formatFeeOrFree(shippingFee)}</span>
                </div>
                <div className='flex items-center justify-between text-slate-600'>
                  <span>Tax ({Math.round(TAX_RATE * 100)}%)</span>
                  <span className='font-semibold text-slate-900'>{formatMoney(taxAmount)}</span>
                </div>
                {protectionFee > 0 ? (
                  <div className='flex items-center justify-between text-slate-600'>
                    <span>Order Protection</span>
                    <span className='font-semibold text-slate-900'>{formatMoney(protectionFee)}</span>
                  </div>
                ) : null}
                <div className='border-t border-slate-200 pt-2 flex items-center justify-between text-base font-semibold'>
                  <span className='text-slate-900'>Total</span>
                  <span className='text-sky-600'>{formatMoney(totalAmount)}</span>
                </div>
              </div>
            </div>

              {!isReady || !isServerReady ? (
                <p className='mt-3 text-xs text-slate-500'>Refreshing cart details...</p>
              ) : null}
            </aside>

            <aside className='hidden rounded-lg border border-slate-200 bg-white p-4 lg:block'>
              <h3 className='text-base font-semibold text-slate-900'>Shop Safely and Sustainably</h3>
              <div className='mt-2 space-y-4'>
                <div>
                  <p className='flex items-center gap-2 text-sm font-semibold text-emerald-700'>
                    <svg viewBox='0 0 24 24' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                      <path d='M12 3.8 18.5 6v5.3c0 3.6-2.3 6.8-6.5 8.9-4.2-2.1-6.5-5.3-6.5-8.9V6z' />
                      <path d='M9.3 11.9 11.2 13.8 14.7 10.3' strokeLinecap='round' strokeLinejoin='round' />
                    </svg>
                    Payment Security
                  </p>
                  <p className='mt-1 text-xs leading-5 text-slate-600'>
                    Your payment information is protected and shared only with trusted payment
                    service providers required to complete checkout.
                  </p>
                  <div className='mt-2 flex flex-wrap items-center gap-2'>
                    <span className='text-[11px] font-extrabold tracking-tight text-[#1A1F71]'>VISA</span>
                    <span className='text-[11px] font-extrabold text-[#eb001b]'>Mastercard</span>
                    <span className='text-[11px] font-bold text-[#0046ad]'>ID Check</span>
                    <span className='text-[11px] font-bold text-[#0b57d0]'>SafeKey</span>
                    <span className='text-[11px] font-bold text-[#1f4fa3]'>JCB</span>
                  </div>
                </div>

                <div className='border-t border-slate-200 pt-3'>
                  <p className='flex items-center gap-2 text-sm font-semibold text-emerald-700'>
                    <svg viewBox='0 0 24 24' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                      <rect x='5.2' y='10.3' width='13.6' height='9.2' rx='1.3' />
                      <path d='M8 10.3V8.8a4 4 0 1 1 8 0v1.5' />
                    </svg>
                    Security & Privacy
                  </p>
                  <p className='mt-1 text-xs leading-5 text-slate-600'>
                    We use industry-standard safeguards to protect your personal details and checkout data.
                  </p>
                <button type='button' className='mt-1 text-[11px] font-semibold text-slate-700'>
                  Learn more
                  <svg viewBox='0 0 20 20' className='ml-1 inline-block h-3.5 w-3.5' fill='none' stroke='currentColor' strokeWidth='2' aria-hidden='true'>
                    <path d='M8 5l5 5-5 5' strokeLinecap='round' strokeLinejoin='round' />
                  </svg>
                </button>
              </div>

                <div className='border-t border-slate-200 pt-3'>
                  <p className='flex items-center gap-2 text-sm font-semibold text-emerald-700'>
                    <svg viewBox='0 0 24 24' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                      <path d='M3.5 8.5h10v7h-10z' />
                      <path d='M13.5 10.5h4l2 2v3h-6z' />
                      <circle cx='7' cy='16.5' r='1.2' />
                      <circle cx='16.5' cy='16.5' r='1.2' />
                    </svg>
                    Secure Shipment Guarantee
                  </p>
                  <p className='mt-1 text-xs leading-5 text-slate-600'>
                    Covered support is available for eligible lost, returned, or damaged packages.
                  </p>
                </div>

                <div className='border-t border-slate-200 pt-3'>
                  <p className='flex items-center gap-2 text-sm font-semibold text-emerald-700'>
                    <svg viewBox='0 0 24 24' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                      <path d='M5.5 11.5a6.5 6.5 0 1 1 13 0' />
                      <rect x='4' y='11.5' width='3.5' height='6' rx='1.2' />
                      <rect x='16.5' y='11.5' width='3.5' height='6' rx='1.2' />
                      <path d='M16.5 18.5c0 1.1-.9 2-2 2H12' />
                    </svg>
                    Customer Support
                  </p>
                  <p className='mt-1 text-xs leading-5 text-slate-600'>
                    Need help with your order? Our support team is available to assist you.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>

        <div className='fixed inset-x-0 bottom-0 z-40 hidden border-t border-slate-200 bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur sm:block lg:hidden'>
          <button
            type='button'
            onClick={goToPayment}
            disabled={!hasCartItems || !hasSelectedAddress}
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

      {isAddressModalOpen ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4'>
          <div className='mx-auto w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-5 shadow-2xl transition duration-300 max-h-[calc(100vh-6rem)] overflow-y-auto'>
            <div className='flex items-center justify-between gap-3'>
              <h2 className='text-lg font-semibold text-slate-900'>
                {editingAddressId ? 'Edit address' : 'Add new address'}
              </h2>
              <button
                type='button'
                onClick={closeAddressModal}
                className='inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition duration-200 hover:bg-slate-50'
                aria-label='Close editor'
              >
                <svg
                  className='h-5 w-5'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  aria-hidden='true'
                >
                  <path strokeLinecap='round' strokeLinejoin='round' d='M6 6l12 12M18 6l-12 12' />
                </svg>
              </button>
            </div>

            <div className='mt-4 grid grid-cols-1 gap-4 md:grid-cols-2'>
              <div className='md:col-span-2'>
                <label className='text-xs font-medium text-slate-500'>Address label</label>
                <input
                  className={inputClassName}
                  placeholder='Eg. Apartment address'
                  type='text'
                  value={draftAddress.label}
                  onChange={(event) => updateDraftAddress('label', event.target.value)}
                />
              </div>
              <div>
                <label className='text-xs font-medium text-slate-500'>Address line 1*</label>
                <input
                  className={inputClassName}
                  placeholder='Street address'
                  type='text'
                  value={draftAddress.line1}
                  onChange={(event) => updateDraftAddress('line1', event.target.value)}
                />
              </div>
              <div>
                <label className='text-xs font-medium text-slate-500'>Address line 2</label>
                <input
                  className={inputClassName}
                  placeholder='Apartment, suite'
                  type='text'
                  value={draftAddress.line2}
                  onChange={(event) => updateDraftAddress('line2', event.target.value)}
                />
              </div>
              <div>
                <label className='text-xs font-medium text-slate-500'>City*</label>
                <input
                  className={inputClassName}
                  placeholder='City'
                  type='text'
                  value={draftAddress.city}
                  onChange={(event) => updateDraftAddress('city', event.target.value)}
                />
              </div>
              <div>
                <label className='text-xs font-medium text-slate-500'>State</label>
                <input
                  className={inputClassName}
                  placeholder='State'
                  type='text'
                  value={draftAddress.state}
                  onChange={(event) => updateDraftAddress('state', event.target.value)}
                />
              </div>
              <div>
                <label className='text-xs font-medium text-slate-500'>Postal code</label>
                <input
                  className={inputClassName}
                  placeholder='Postal code'
                  type='text'
                  value={draftAddress.postalCode}
                  onChange={(event) => updateDraftAddress('postalCode', event.target.value)}
                />
              </div>
              <div>
                <label className='text-xs font-medium text-slate-500'>Country*</label>
                <div className='mt-1 rounded-lg border border-slate-100 bg-slate-50/60 p-2'>
                  <p className='text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500'>
                    Location mode
                  </p>
                  <div className='relative mt-1.5'>
                    <span className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 overflow-hidden rounded-sm border border-slate-200'>
                      <span className='h-full w-1/3 bg-[#118647]' />
                      <span className='h-full w-1/3 bg-white' />
                      <span className='h-full w-1/3 bg-[#118647]' />
                    </span>
                    <select
                      className='h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-900 shadow-sm outline-none transition duration-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10'
                      value={draftAddress.country}
                      onChange={(event) => updateDraftAddress('country', event.target.value)}
                    >
                      {ACCEPTED_COUNTRIES.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                    <svg
                      className='pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-600'
                      viewBox='0 0 20 20'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='1.8'
                      aria-hidden='true'
                    >
                      <path strokeLinecap='round' strokeLinejoin='round' d='m6 8 4 4 4-4' />
                    </svg>
                  </div>
                </div>
              </div>
              <label className='md:col-span-2 inline-flex items-center gap-2 text-sm text-slate-700'>
                <input
                  className='h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500'
                  type='checkbox'
                  checked={draftAddress.isDefault}
                  onChange={(event) => updateDraftAddress('isDefault', event.target.checked)}
                />
                Use as default address
              </label>
            </div>

            {addressError ? (
              <p className='mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700'>
                {addressError}
              </p>
            ) : null}

            <div className='mt-5 flex flex-wrap items-center justify-end gap-2'>
              <button
                type='button'
                onClick={closeAddressModal}
                className='rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition duration-200 hover:border-slate-300 hover:bg-slate-50'
              >
                Cancel
              </button>
              <button
                type='button'
                onClick={saveAddress}
                disabled={isSavingAddress}
                className='rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition duration-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50'
              >
                {isSavingAddress
                  ? 'Saving...'
                  : editingAddressId
                    ? 'Update address'
                    : 'Save address'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default ShippingDetailsPage
