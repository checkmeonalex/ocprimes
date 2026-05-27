'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import ShippingAddressOnboardingModal, {
  EMPTY_SHIPPING_ADDRESS_DRAFT,
} from '@/components/product/ShippingAddressOnboardingModal'
import {
  loadUserProfileBootstrap,
  primeUserProfileBootstrap,
} from '@/lib/user/profile-bootstrap-client'

const formatDeliveryDate = (value) => {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(value)
}

const buildDeliveryRange = () => {
  const today = new Date()
  const earliest = new Date(today)
  earliest.setDate(today.getDate() + 9)
  const latest = new Date(today)
  latest.setDate(today.getDate() + 24)
  return `${formatDeliveryDate(earliest)} and ${formatDeliveryDate(latest)}`
}

const createAddressId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `addr-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`
}

const hasAddressValue = (value) => {
  if (!value || typeof value !== 'object') return false
  return Object.values(value).some((entry) => String(entry || '').trim().length > 0)
}

const normalizeAddressBlock = (entry) => {
  const safe = entry && typeof entry === 'object' ? entry : {}
  return {
    line1: String(safe.line1 || '').trim(),
    line2: String(safe.line2 || '').trim(),
    phone: String(safe.phone || '').trim(),
    city: String(safe.city || '').trim(),
    state: String(safe.state || '').trim(),
    postalCode: String(safe.postalCode || '').trim(),
    country: String(safe.country || '').trim(),
  }
}

const normalizeAddressEntry = (entry, index, fallbackLabel = 'Address') => {
  const safe = entry && typeof entry === 'object' ? entry : {}
  return {
    id: String(safe.id || '').trim() || createAddressId(),
    label: String(safe.label || '').trim() || `${fallbackLabel} ${index + 1}`,
    isDefault: Boolean(safe.isDefault),
    line1: String(safe.line1 || '').trim(),
    line2: String(safe.line2 || '').trim(),
    phone: String(safe.phone || '').trim(),
    city: String(safe.city || '').trim(),
    state: String(safe.state || '').trim(),
    postalCode: String(safe.postalCode || '').trim(),
    country: String(safe.country || 'Nigeria').trim() || 'Nigeria',
  }
}

const normalizeAddressList = (entries, fallbackLabel = 'Address') => {
  if (!Array.isArray(entries)) return []
  const normalized = entries
    .slice(0, 5)
    .map((entry, index) => normalizeAddressEntry(entry, index, fallbackLabel))
  if (normalized.length === 0) return []
  const hasDefault = normalized.some((entry) => entry.isDefault)
  return hasDefault
    ? normalized
    : normalized.map((entry, index) => ({
        ...entry,
        isDefault: index === 0,
      }))
}

const resolveDefaultAddress = (addresses) =>
  addresses.find((entry) => entry.isDefault) || addresses[0] || null

const deriveShippingAddresses = (profile) => {
  const fromProfile = normalizeAddressList(profile?.addresses, 'Address')
  if (fromProfile.length > 0) return fromProfile

  const legacyAddress = normalizeAddressBlock(profile?.deliveryAddress)
  if (!hasAddressValue(legacyAddress)) return []

  return [
    {
      ...normalizeAddressEntry(legacyAddress, 0, 'Address'),
      isDefault: true,
      label: 'Address 1',
    },
  ]
}

const formatAddressSummary = (address) => {
  const line = [address.line1, address.line2].filter(Boolean).join(', ')
  const location = [address.city, address.state, address.country].filter(Boolean).join(', ')
  if (line && location) return `${line} - ${location}`
  if (line) return line
  if (location) return location
  return 'Address details not set'
}

const InfoIcon = () => (
  <svg
    viewBox='0 0 20 20'
    className='h-4 w-4 text-gray-800'
    fill='none'
    stroke='currentColor'
    strokeWidth='1.8'
    aria-hidden='true'
  >
    <circle cx='10' cy='10' r='7' />
    <path d='M10 8.25v4.8' strokeLinecap='round' />
    <circle cx='10' cy='5.9' r='0.9' fill='currentColor' stroke='none' />
  </svg>
)

const ChangeLocationIcon = () => (
  <svg
    viewBox='0 0 24 24'
    className='h-4 w-4 text-gray-800'
    fill='none'
    stroke='currentColor'
    strokeWidth='1.9'
    aria-hidden='true'
  >
    <path strokeLinecap='round' strokeLinejoin='round' d='M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z' />
    <circle cx='12' cy='11' r='2.1' />
  </svg>
)

const DELIVERY_TYPE_STANDARD = 'standard'
const DELIVERY_TYPE_EXPRESS = 'express'
const DEFAULT_AVAILABLE_DELIVERY_TYPES = [DELIVERY_TYPE_STANDARD, DELIVERY_TYPE_EXPRESS]

const normalizeDeliveryType = (value) =>
  String(value || '').trim().toLowerCase() === DELIVERY_TYPE_EXPRESS
    ? DELIVERY_TYPE_EXPRESS
    : DELIVERY_TYPE_STANDARD

const normalizeQuoteCountry = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized || normalized === 'nigeria') return 'Nigeria'
  if (normalized === 'international' || normalized === 'worldwide') return 'International'
  return 'International'
}

const normalizeAvailableDeliveryTypes = (value) => {
  if (!Array.isArray(value)) return DEFAULT_AVAILABLE_DELIVERY_TYPES
  const filtered = value
    .map((entry) => String(entry || '').trim().toLowerCase())
    .filter(
      (entry, index, list) =>
        (entry === DELIVERY_TYPE_STANDARD || entry === DELIVERY_TYPE_EXPRESS) &&
        list.indexOf(entry) === index,
    )
  return filtered.length > 0 ? filtered : DEFAULT_AVAILABLE_DELIVERY_TYPES
}

const InfoTooltipButton = ({ id, activeId, onToggle, tooltip, label }) => {
  const isOpen = activeId === id
  const triggerRef = useRef(null)
  const [tooltipStyle, setTooltipStyle] = useState(null)

  useEffect(() => {
    if (!isOpen) {
      setTooltipStyle(null)
      return undefined
    }

    const updateTooltipPosition = () => {
      if (!(triggerRef.current instanceof HTMLElement) || typeof window === 'undefined') return
      const triggerRect = triggerRef.current.getBoundingClientRect()
      const viewportPadding = 8
      const maxTooltipWidth = Math.max(160, window.innerWidth - viewportPadding * 2)
      const tooltipWidth = Math.min(320, maxTooltipWidth)
      const centeredLeft = triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2
      const safeLeft = Math.min(
        Math.max(viewportPadding, centeredLeft),
        window.innerWidth - tooltipWidth - viewportPadding,
      )
      const estimatedTooltipHeight = 132
      const shouldRenderAbove =
        triggerRect.bottom + estimatedTooltipHeight > window.innerHeight - viewportPadding &&
        triggerRect.top > estimatedTooltipHeight + viewportPadding

      setTooltipStyle({
        left: `${safeLeft}px`,
        width: `${tooltipWidth}px`,
        top: shouldRenderAbove
          ? `${Math.max(viewportPadding, triggerRect.top - 8)}px`
          : `${triggerRect.bottom + 8}px`,
        transform: shouldRenderAbove ? 'translateY(-100%)' : 'none',
      })
    }

    updateTooltipPosition()
    window.addEventListener('resize', updateTooltipPosition)
    window.addEventListener('scroll', updateTooltipPosition, true)
    return () => {
      window.removeEventListener('resize', updateTooltipPosition)
      window.removeEventListener('scroll', updateTooltipPosition, true)
    }
  }, [isOpen])

  return (
    <span ref={triggerRef} data-info-tooltip-root='true' className='relative inline-flex align-middle'>
      <button
        type='button'
        aria-label={label}
        aria-expanded={isOpen}
        aria-describedby={isOpen ? `${id}-tooltip` : undefined}
        onClick={() => onToggle(id)}
        className='inline-flex h-5 w-5 items-center justify-center rounded-full text-gray-700 transition hover:bg-gray-100 hover:text-gray-900'
      >
        <InfoIcon />
      </button>
      {isOpen ? (
        <span
          id={`${id}-tooltip`}
          role='tooltip'
          style={tooltipStyle || undefined}
          className='fixed z-[1400] rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium leading-relaxed text-white shadow-xl'
        >
          {tooltip}
        </span>
      ) : null}
    </span>
  )
}

const SkeletonLine = ({ className = '' }) => (
  <span
    aria-hidden='true'
    className={`block rounded-md bg-gray-200/90 animate-pulse ${className}`.trim()}
  />
)

const ShippingTabDetails = ({ shippingEstimate = '' }) => {
  const fallbackEstimateLabel = String(shippingEstimate || '').trim()
  const [deliveryType, setDeliveryType] = useState('standard')
  const [profile, setProfile] = useState(null)
  const [shippingAddresses, setShippingAddresses] = useState([])
  const [selectedAddressId, setSelectedAddressId] = useState('')
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)
  const [pendingAddressId, setPendingAddressId] = useState('')
  const [isSavingLocation, setIsSavingLocation] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [isAddAddressModalOpen, setIsAddAddressModalOpen] = useState(false)
  const [isSavingNewAddress, setIsSavingNewAddress] = useState(false)
  const [newAddressError, setNewAddressError] = useState('')
  const [newAddressDraft, setNewAddressDraft] = useState(EMPTY_SHIPPING_ADDRESS_DRAFT)
  const [activeInfoKey, setActiveInfoKey] = useState('')
  const [shippingState, setShippingState] = useState({
    isLoading: true,
    foundAddress: false,
    city: '',
    state: '',
    country: 'Nigeria',
    shippingPrice: 0,
    shippingCurrency: 'NGN',
    checkoutEstimate: '',
    availableDeliveryTypes: DEFAULT_AVAILABLE_DELIVERY_TYPES,
    isSelectedDeliveryTypeAvailable: true,
  })

  const selectedAddress = useMemo(
    () => shippingAddresses.find((entry) => entry.id === selectedAddressId) || null,
    [shippingAddresses, selectedAddressId],
  )

  useEffect(() => {
    let active = true

    const loadProfileContext = async () => {
      if (active) {
        setShippingState((prev) => ({
          ...prev,
          isLoading: true,
        }))
      }
      try {
        const payload = await loadUserProfileBootstrap()
        const nextProfile = payload?.profile && typeof payload.profile === 'object'
          ? payload.profile
          : {}
        const nextAddresses = deriveShippingAddresses(nextProfile)
        const defaultAddress = resolveDefaultAddress(nextAddresses)

        if (!active) return
        setProfile(nextProfile)
        setShippingAddresses(nextAddresses)
        setSelectedAddressId(defaultAddress?.id || '')

        if (!defaultAddress) {
          setShippingState((prev) => ({
            ...prev,
            isLoading: false,
            foundAddress: false,
          }))
          return
        }

        setShippingState((prev) => ({
          ...prev,
          isLoading: true,
          foundAddress: true,
          city: String(defaultAddress.city || ''),
          state: String(defaultAddress.state || ''),
          country: String(defaultAddress.country || 'Nigeria'),
          shippingPrice: Number(prev.shippingPrice || 0),
          shippingCurrency: String(prev.shippingCurrency || 'NGN'),
          checkoutEstimate: String(prev.checkoutEstimate || ''),
        }))
      } catch {
        if (!active) return
        setShippingState((prev) => ({
          ...prev,
          isLoading: false,
          foundAddress: false,
        }))
      }
    }

    void loadProfileContext()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true

    const loadShippingQuote = async () => {
      const destination = selectedAddress
      const city = String(destination?.city || '').trim()
      const state = String(destination?.state || '').trim()
      const country = String(destination?.country || 'Nigeria').trim() || 'Nigeria'
      const normalizedRequestedDeliveryType = normalizeDeliveryType(deliveryType)
      const logisticsCountry = normalizeQuoteCountry(country)

      if (!destination || !city || !state) {
        if (!active) return
        setShippingState((prev) => ({
          ...prev,
          isLoading: false,
          foundAddress: false,
          city,
          state,
          country,
          shippingPrice: null,
          shippingCurrency: 'NGN',
          checkoutEstimate: '',
          availableDeliveryTypes: DEFAULT_AVAILABLE_DELIVERY_TYPES,
          isSelectedDeliveryTypeAvailable: true,
        }))
        return
      }

      if (!active) return
      setShippingState((prev) => ({
        ...prev,
        isLoading: true,
        foundAddress: true,
        city,
        state,
        country,
      }))

      try {
        const params = new URLSearchParams({
          state,
          city,
          country: logisticsCountry,
          delivery_type: normalizedRequestedDeliveryType,
        })
        const response = await fetch(`/api/settings/logistics?${params.toString()}`, {
          cache: 'no-store',
        })
        const quote = await response.json().catch(() => null)
        if (!response.ok || !quote || typeof quote !== 'object') {
          throw new Error('Unable to load shipping quote')
        }
        const deliveryOptions =
          quote?.deliveryOptions && typeof quote.deliveryOptions === 'object'
            ? quote.deliveryOptions
            : null
        const availableDeliveryTypes = normalizeAvailableDeliveryTypes(quote?.availableDeliveryTypes)
        const isSelectedDeliveryTypeAvailable = availableDeliveryTypes.includes(
          normalizedRequestedDeliveryType,
        )
        const selectedDeliveryQuote =
          deliveryOptions &&
          deliveryOptions[normalizedRequestedDeliveryType] &&
          typeof deliveryOptions[normalizedRequestedDeliveryType] === 'object'
            ? deliveryOptions[normalizedRequestedDeliveryType]
            : null
        const fallbackDeliveryQuote =
          selectedDeliveryQuote ||
          (deliveryOptions &&
          deliveryOptions[availableDeliveryTypes[0]] &&
          typeof deliveryOptions[availableDeliveryTypes[0]] === 'object'
            ? deliveryOptions[availableDeliveryTypes[0]]
            : null)
        const quoteSource = selectedDeliveryQuote || fallbackDeliveryQuote || quote
        const displayPriceRaw =
          quoteSource?.displayPrice !== undefined && quoteSource?.displayPrice !== null
            ? Number(quoteSource.displayPrice)
            : Number(quoteSource?.price || 0)
        const normalizedPrice = Number.isFinite(displayPriceRaw) ? displayPriceRaw : 0
        const normalizedCurrency =
          String(quoteSource?.displayCurrency || quote?.displayCurrency || 'NGN').toUpperCase() || 'NGN'
        const normalizedEstimate = isSelectedDeliveryTypeAvailable
          ? String(quoteSource?.checkoutEstimate || quote?.checkoutEstimate || '').trim()
          : ''

        if (!active) return
        setShippingState({
          isLoading: false,
          foundAddress: true,
          city,
          state,
          country,
          shippingPrice: isSelectedDeliveryTypeAvailable ? normalizedPrice : null,
          shippingCurrency: normalizedCurrency,
          checkoutEstimate: normalizedEstimate,
          availableDeliveryTypes,
          isSelectedDeliveryTypeAvailable,
        })
      } catch {
        if (!active) return
        setShippingState((prev) => ({
          ...prev,
          isLoading: false,
          foundAddress: true,
          city,
          state,
          country,
          shippingPrice: null,
          shippingCurrency: 'NGN',
          checkoutEstimate: '',
          availableDeliveryTypes: DEFAULT_AVAILABLE_DELIVERY_TYPES,
          isSelectedDeliveryTypeAvailable: true,
        }))
      }
    }

    void loadShippingQuote()
    return () => {
      active = false
    }
  }, [deliveryType, selectedAddress])

  useEffect(() => {
    if (!isLocationModalOpen) return undefined
    const previousHtmlOverflow = document.documentElement.style.overflow
    const previousBodyOverflow = document.body.style.overflow
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow
      document.body.style.overflow = previousBodyOverflow
    }
  }, [isLocationModalOpen])

  useEffect(() => {
    if (!activeInfoKey) return undefined

    const closeInfoTooltip = (event) => {
      if (!(event.target instanceof Element)) return
      if (event.target.closest('[data-info-tooltip-root="true"]')) return
      setActiveInfoKey('')
    }

    const onEsc = (event) => {
      if (event.key === 'Escape') {
        setActiveInfoKey('')
      }
    }

    document.addEventListener('mousedown', closeInfoTooltip)
    window.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', closeInfoTooltip)
      window.removeEventListener('keydown', onEsc)
    }
  }, [activeInfoKey])

  useEffect(() => {
    const shouldHideExpandControl = isLocationModalOpen
    if (!shouldHideExpandControl) return undefined
    document.body.classList.add('shipping-address-editor-open')
    return () => {
      document.body.classList.remove('shipping-address-editor-open')
    }
  }, [isLocationModalOpen])

  const openLocationModal = () => {
    const defaultAddress = resolveDefaultAddress(shippingAddresses)
    setPendingAddressId(selectedAddressId || defaultAddress?.id || '')
    setLocationError('')
    setNewAddressError('')
    setIsAddAddressModalOpen(false)
    setIsLocationModalOpen(true)
  }

  const closeLocationModal = () => {
    if (isSavingLocation) return
    setIsAddAddressModalOpen(false)
    setIsLocationModalOpen(false)
    setLocationError('')
  }

  const openAddAddressModal = () => {
    if (shippingAddresses.length >= 5) {
      setLocationError('You can only save up to 5 addresses. Remove one to add another.')
      return
    }
    const preferredCountry =
      String(profile?.country || '').trim() ||
      String(shippingState.country || '').trim() ||
      EMPTY_SHIPPING_ADDRESS_DRAFT.country
    setNewAddressError('')
    setNewAddressDraft({
      ...EMPTY_SHIPPING_ADDRESS_DRAFT,
      id: createAddressId(),
      label: '',
      isDefault: shippingAddresses.length === 0,
      country: preferredCountry,
    })
    setIsAddAddressModalOpen(true)
  }

  const closeAddAddressModal = () => {
    if (isSavingNewAddress) return
    setIsAddAddressModalOpen(false)
    setNewAddressError('')
  }

  const persistShippingAddresses = async (
    nextShippingAddresses,
    { closeLocation = false } = {},
  ) => {
    if (!profile || typeof profile !== 'object') {
      throw new Error('Unable to update location right now.')
    }

    const normalizedShippingAddresses = normalizeAddressList(nextShippingAddresses, 'Address')
    const nextDefaultShipping = resolveDefaultAddress(normalizedShippingAddresses)
    if (!nextDefaultShipping) {
      throw new Error('No shipping address available. Add one from your address page.')
    }

    const nextBillingAddresses = normalizeAddressList(profile.billingAddresses, 'Billing')
    const nextDefaultBilling = resolveDefaultAddress(nextBillingAddresses)
    const profileFirstName = String(profile.firstName || profile.displayName || 'Customer').trim() || 'Customer'
    const profileCountry =
      String(profile.country || nextDefaultShipping.country || 'Unknown').trim() || 'Unknown'

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...profile,
          firstName: profileFirstName,
          country: profileCountry,
          addresses: normalizedShippingAddresses,
          deliveryAddress: normalizeAddressBlock(nextDefaultShipping),
          billingAddresses: nextBillingAddresses,
          billingAddress: nextDefaultBilling
            ? normalizeAddressBlock(nextDefaultBilling)
            : normalizeAddressBlock(profile.billingAddress),
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to update delivery location.')
      }

      primeUserProfileBootstrap(payload)
      const nextProfile =
        payload?.profile && typeof payload.profile === 'object'
          ? payload.profile
          : {
              ...profile,
              addresses: normalizedShippingAddresses,
              deliveryAddress: normalizeAddressBlock(nextDefaultShipping),
              billingAddresses: nextBillingAddresses,
              billingAddress: nextDefaultBilling
                ? normalizeAddressBlock(nextDefaultBilling)
                : normalizeAddressBlock(profile.billingAddress),
            }
      const refreshedAddresses = deriveShippingAddresses(nextProfile)
      const refreshedDefaultAddress = resolveDefaultAddress(refreshedAddresses)
      setProfile(nextProfile)
      setShippingAddresses(refreshedAddresses)
      setSelectedAddressId(refreshedDefaultAddress?.id || '')
      setPendingAddressId(refreshedDefaultAddress?.id || '')
      if (closeLocation) {
        setIsLocationModalOpen(false)
      }
    } catch (error) {
      throw new Error(
        error instanceof Error && error.message
          ? error.message
          : 'Unable to update delivery location.',
      )
    }
  }

  const validateNewAddressDraft = () => {
    if (!String(newAddressDraft.line1 || '').trim()) return 'Address line 1 is required.'
    if (!String(newAddressDraft.state || '').trim()) return 'State is required.'
    if (!String(newAddressDraft.city || '').trim()) return 'City is required.'
    if (!String(newAddressDraft.phone || '').trim()) return 'Phone number is required.'
    if (!String(newAddressDraft.country || '').trim()) return 'Country is required.'
    return ''
  }

  const saveNewAddress = async () => {
    const validationMessage = validateNewAddressDraft()
    if (validationMessage) {
      setNewAddressError(validationMessage)
      return
    }

    const nextAddress = normalizeAddressEntry(
      {
        ...newAddressDraft,
        id: newAddressDraft.id || createAddressId(),
        label: String(newAddressDraft.label || '').trim(),
        line1: String(newAddressDraft.line1 || '').trim(),
        line2: String(newAddressDraft.line2 || '').trim(),
        phone: String(newAddressDraft.phone || '').trim(),
        city: String(newAddressDraft.city || '').trim(),
        state: String(newAddressDraft.state || '').trim(),
        postalCode: String(newAddressDraft.postalCode || '').trim(),
        country: String(newAddressDraft.country || '').trim() || 'Nigeria',
      },
      shippingAddresses.length,
      'Address',
    )

    const withNewAddress = [...shippingAddresses, nextAddress]
    const nextShippingAddresses = nextAddress.isDefault
      ? withNewAddress.map((entry) => ({
          ...entry,
          isDefault: entry.id === nextAddress.id,
        }))
      : withNewAddress

    setIsSavingNewAddress(true)
    setNewAddressError('')
    try {
      await persistShippingAddresses(nextShippingAddresses)
      setPendingAddressId(nextAddress.id)
      setIsAddAddressModalOpen(false)
    } catch (error) {
      setNewAddressError(
        error instanceof Error && error.message
          ? error.message
          : 'Unable to save new address.',
      )
    } finally {
      setIsSavingNewAddress(false)
    }
  }

  const applySelectedLocation = async () => {
    if (!pendingAddressId) {
      setLocationError('Select an address to continue.')
      return
    }
    if (pendingAddressId === selectedAddressId) {
      closeLocationModal()
      return
    }

    setIsSavingLocation(true)
    setLocationError('')
    try {
      await persistShippingAddresses(
        shippingAddresses.map((entry) => ({
          ...entry,
          isDefault: entry.id === pendingAddressId,
        })),
        { closeLocation: true },
      )
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Unable to update delivery location.'
      setLocationError(message)
    } finally {
      setIsSavingLocation(false)
    }
  }

  const shippingPriceLabel = useMemo(() => {
    if (shippingState.shippingPrice === null || shippingState.shippingPrice === undefined) {
      return ''
    }
    const price = Number(shippingState.shippingPrice || 0)
    if (shippingState.shippingCurrency === 'USD') {
      return `US $${price.toFixed(2)}`
    }
    return `₦${price.toLocaleString('en-NG', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`
  }, [shippingState.shippingCurrency, shippingState.shippingPrice])

  const deliveryLine = useMemo(() => {
    if (!shippingState.foundAddress && !shippingState.isLoading && !fallbackEstimateLabel) {
      return 'Set a default delivery address to calculate delivery estimate'
    }
    if (
      shippingState.foundAddress &&
      !shippingState.isLoading &&
      !shippingState.isSelectedDeliveryTypeAvailable
    ) {
      return 'Estimated delivery: Not available for this location'
    }
    const estimate = String(shippingState.checkoutEstimate || '').trim()
    if (estimate) return `Estimated delivery: ${estimate}`
    if (fallbackEstimateLabel) return `Estimated delivery: ${fallbackEstimateLabel}`
    return `Estimated between ${buildDeliveryRange()}`
  }, [
    shippingState.checkoutEstimate,
    shippingState.foundAddress,
    shippingState.isLoading,
    shippingState.isSelectedDeliveryTypeAvailable,
    fallbackEstimateLabel,
  ])

  const shippingHeadline = shippingState.isLoading
    ? ''
    : shippingState.foundAddress
      ? shippingState.isSelectedDeliveryTypeAvailable
        ? `${shippingPriceLabel} ${deliveryType === 'express' ? 'Express' : 'Standard'} Shipping`
        : `${deliveryType === 'express' ? 'Express' : 'Standard'} Shipping: Not available`
      : `Set a default delivery address to view ${deliveryType} shipping`

  const destinationLabel = shippingState.foundAddress
    ? `${shippingState.city}, ${shippingState.state}, ${shippingState.country}`
    : 'Add a default delivery address in your account'
  const damageCoverageLabel =
    'Items damaged during delivery are covered under our protection policy.'
  const shippingInfoTooltip = shippingState.isLoading
    ? 'We are calculating shipping for your selected location.'
    : shippingState.foundAddress
      ? shippingState.isSelectedDeliveryTypeAvailable
        ? `This is your ${deliveryType} shipping fee to ${destinationLabel}.`
        : `${deliveryType === 'standard' ? 'Standard' : 'Express'} shipping is not available for this delivery location.`
      : 'Set a default delivery address to calculate shipping fees and available delivery options.'
  const deliveryInfoTooltip = shippingState.foundAddress
    ? shippingState.isSelectedDeliveryTypeAvailable
      ? 'Delivery time depends on your selected shipping option and destination.'
      : 'This shipping option is currently unavailable for your selected delivery location.'
    : 'Add a default delivery address to see an accurate delivery timeline.'
  const isShippingContentLoading = shippingState.isLoading
  const isEtaPending = isShippingContentLoading || !shippingState.foundAddress

  return (
    <div className='space-y-3 text-sm leading-relaxed text-gray-700'>
      <div className='grid grid-cols-[92px_1fr] gap-x-4'>
        <p className='font-semibold text-gray-900'>Shipping:</p>
        <div>
          <p className='font-semibold text-gray-900'>
            {isShippingContentLoading ? (
              <span className='inline-block w-full max-w-[280px] align-middle'>
                <SkeletonLine className='h-4 w-full' />
              </span>
            ) : (
              <>
                {shippingHeadline}
                {' '}
                <InfoTooltipButton
                  id='shipping-info'
                  activeId={activeInfoKey}
                  onToggle={(nextId) => setActiveInfoKey((prev) => (prev === nextId ? '' : nextId))}
                  tooltip={shippingInfoTooltip}
                  label='Shipping information'
                />
              </>
            )}
          </p>
          {isShippingContentLoading ? (
            <div className='mt-2 space-y-2'>
              <SkeletonLine className='h-3 w-40' />
              <SkeletonLine className='h-3 w-56' />
              <SkeletonLine className='h-3 w-28' />
            </div>
          ) : (
            <>
              {deliveryType === 'standard' ? (
                <button
                  type='button'
                  onClick={() => setDeliveryType('express')}
                  className='inline-flex items-center gap-1.5 font-medium text-gray-900 underline underline-offset-2 hover:text-black'
                >
                  <svg
                    className='h-4 w-4'
                    viewBox='0 0 32 32'
                    fill='currentColor'
                    aria-hidden='true'
                  >
                    <path d='M 0 6 L 0 8 L 19 8 L 19 23 L 12.84375 23 C 12.398438 21.28125 10.851563 20 9 20 C 7.148438 20 5.601563 21.28125 5.15625 23 L 4 23 L 4 18 L 2 18 L 2 25 L 5.15625 25 C 5.601563 26.71875 7.148438 28 9 28 C 10.851563 28 12.398438 26.71875 12.84375 25 L 21.15625 25 C 21.601563 26.71875 23.148438 28 25 28 C 26.851563 28 28.398438 26.71875 28.84375 25 L 32 25 L 32 16.84375 L 31.9375 16.6875 L 29.9375 10.6875 L 29.71875 10 L 21 10 L 21 6 Z M 1 10 L 1 12 L 10 12 L 10 10 Z M 21 12 L 28.28125 12 L 30 17.125 L 30 23 L 28.84375 23 C 28.398438 21.28125 26.851563 20 25 20 C 23.148438 20 21.601563 21.28125 21.15625 23 L 21 23 Z M 2 14 L 2 16 L 8 16 L 8 14 Z M 9 22 C 10.117188 22 11 22.882813 11 24 C 11 25.117188 10.117188 26 9 26 C 7.882813 26 7 25.117188 7 24 C 7 22.882813 7.882813 22 9 22 Z M 25 22 C 26.117188 22 27 22.882813 27 24 C 27 25.117188 26.117188 26 25 26 C 23.882813 26 23 25.117188 23 24 C 23 22.882813 23.882813 22 25 22 Z' />
                  </svg>
                  <span>Use Express shipping</span>
                </button>
              ) : (
                <button
                  type='button'
                  onClick={() => setDeliveryType('standard')}
                  className='inline-flex items-center gap-1.5 font-medium text-gray-900 underline underline-offset-2 hover:text-black'
                >
                  <svg
                    className='h-4 w-4'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='1.8'
                    aria-hidden='true'
                  >
                    <circle cx='12' cy='12' r='8' />
                    <path strokeLinecap='round' strokeLinejoin='round' d='M12 8v4l2.8 2.2' />
                  </svg>
                  <span>Use Standard shipping</span>
                </button>
              )}
              <p className='mt-1.5 text-gray-600'>Delivering to: {destinationLabel}</p>
              <button
                type='button'
                onClick={openLocationModal}
                className='mt-1 inline-flex items-center gap-1.5 font-semibold text-gray-900 underline underline-offset-2 hover:text-black'
              >
                <span>{shippingState.foundAddress ? 'Change location' : 'Set an address'}</span>
                <span className='inline-flex align-middle'>
                  <ChangeLocationIcon />
                </span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className='grid grid-cols-[92px_1fr] gap-x-4'>
        <p className='font-semibold text-gray-900'>Protection:</p>
        <p className='font-semibold text-gray-900'>
          {damageCoverageLabel}
          {' '}
          <InfoTooltipButton
            id='damage-info'
            activeId={activeInfoKey}
            onToggle={(nextId) => setActiveInfoKey((prev) => (prev === nextId ? '' : nextId))}
            tooltip='If your item is damaged in transit, you are protected and can request support under our policy.'
            label='Damage coverage information'
          />
        </p>
      </div>

      <div className='grid grid-cols-[92px_1fr] gap-x-4'>
        <p className='font-semibold text-gray-900'>Delivery:</p>
        <p className='font-semibold text-gray-900'>
          {isEtaPending ? (
            <span className='inline-flex items-center gap-2 align-middle'>
              <span>Estimated delivery:</span>
              <span className='inline-block w-28 align-middle'>
                <SkeletonLine className='h-4 w-full' />
              </span>
            </span>
          ) : (
            <>
              {deliveryLine}
              {' '}
              <InfoTooltipButton
                id='delivery-info'
                activeId={activeInfoKey}
                onToggle={(nextId) => setActiveInfoKey((prev) => (prev === nextId ? '' : nextId))}
                tooltip={deliveryInfoTooltip}
                label='Delivery estimate information'
              />
            </>
          )}
        </p>
      </div>

      <div className='grid grid-cols-[92px_1fr] gap-x-4'>
        <p className='font-semibold text-gray-900'>Returns:</p>
        <p className='text-gray-900'>
          You may return eligible items within 7 days of delivery. Return shipping is paid by the buyer and may be deducted from the refund amount.
          {' '}
          <a
            href='/returns-policy'
            className='font-medium underline underline-offset-2 hover:text-black'
          >
            See details
          </a>
        </p>
      </div>

      {isLocationModalOpen ? (
        <div
          className='fixed inset-0 z-[950] flex items-center justify-center bg-black/45 p-3 sm:p-5'
          onClick={closeLocationModal}
        >
          <div
            className='max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:p-5'
            onClick={(event) => event.stopPropagation()}
          >
            <div className='flex items-center justify-between gap-3'>
              <div>
                <p className='text-base font-semibold text-gray-900'>Change delivery location</p>
                <p className='text-xs text-gray-600'>
                  Select your default shipping address for this order.
                </p>
              </div>
              <button
                type='button'
                onClick={closeLocationModal}
                className='inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100'
                aria-label='Close location popup'
              >
                <svg
                  className='h-4 w-4'
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

            <div className='mt-3 max-h-[58vh] space-y-2 overflow-y-auto pr-1'>
              {shippingAddresses.length > 0 ? (
                shippingAddresses.map((entry, index) => (
                  <label
                    key={entry.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2 transition ${
                      pendingAddressId === entry.id ? 'bg-gray-100' : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type='radio'
                      name='shipping-location-option'
                      value={entry.id}
                      checked={pendingAddressId === entry.id}
                      onChange={() => setPendingAddressId(entry.id)}
                      className='mt-1 h-4 w-4 accent-gray-900'
                    />
                    <div className='min-w-0'>
                      <p className='text-sm font-semibold text-gray-900'>
                        {entry.label || `Address ${index + 1}`}
                        {entry.isDefault ? (
                          <span className='ml-2 text-[11px] font-medium uppercase tracking-wide text-gray-500'>
                            Default
                          </span>
                        ) : null}
                      </p>
                      <p className='text-xs text-gray-600'>{formatAddressSummary(entry)}</p>
                    </div>
                  </label>
                ))
              ) : (
                <div className='rounded-xl bg-gray-50 px-3 py-3 text-xs text-gray-600'>
                  No saved shipping address yet. Click Add new address to continue.
                </div>
              )}
            </div>

            {locationError ? (
              <p className='mt-2 text-xs font-medium text-red-600'>{locationError}</p>
            ) : null}

            <div className='mt-4 flex flex-wrap items-center justify-between gap-2'>
              <div className='flex items-center gap-2'>
                <button
                  type='button'
                  onClick={openAddAddressModal}
                  disabled={isSavingLocation || isSavingNewAddress || shippingAddresses.length >= 5}
                  className='rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-800 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60'
                >
                  Add new address
                </button>
              </div>
              <div className='flex items-center gap-2'>
                <button
                  type='button'
                  onClick={applySelectedLocation}
                  disabled={isSavingLocation || shippingAddresses.length === 0}
                  className='rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-500'
                >
                  {isSavingLocation ? 'Updating...' : 'Use selected address'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <ShippingAddressOnboardingModal
        isOpen={isLocationModalOpen && isAddAddressModalOpen}
        draft={newAddressDraft}
        setDraft={setNewAddressDraft}
        isSaving={isSavingNewAddress}
        errorMessage={newAddressError}
        onClose={closeAddAddressModal}
        onSave={saveNewAddress}
      />

      <style jsx global>{`
        body.shipping-address-editor-open button[title='Expand'] {
          display: none !important;
        }
      `}</style>
    </div>
  )
}

export default ShippingTabDetails
