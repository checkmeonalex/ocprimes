'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import CustomSelect from '@/components/common/CustomSelect'
import CartQuantitySelect from '@/components/cart/CartQuantitySelect'
import { useCart } from '@/context/CartContext'
import { useUserI18n } from '@/lib/i18n/useUserI18n'
import { useAuthUser } from '@/lib/auth/useAuthUser'
import {
  filterItemsByCheckoutSelection,
  parseCheckoutSelectionParam,
} from '@/lib/cart/checkout-selection'
import {
  calculateOrderProtectionFee,
  isDigitalProductLike,
} from '@/lib/order-protection/config'
import { ACCEPTED_COUNTRIES } from '@/lib/user/accepted-countries'
import paystackLogo from './paystack.webp'

const SHIPPING_FEE = 5
const TAX_RATE = 0.05
const MAX_ADDRESSES = 5
const DEFAULT_COUNTRY = 'Nigeria'
const INTERNATIONAL_COUNTRY = 'International'
const ACCEPTED_COUNTRY_SET = new Set(ACCEPTED_COUNTRIES)
const DEFAULT_DIAL_CODE = '1'
const COUNTRY_DIAL_CODES = {
  nigeria: '234',
  international: '1',
  worldwide: '1',
}
const COUNTRY_FLAGS = {
  nigeria: 'NG',
  international: 'US',
  worldwide: 'US',
}
const PAYMENT_METHOD_GROUPS = [
  {
    id: 'card',
    title: 'Card',
    methods: [
      { id: 'visa', label: 'Visa Card', logo: 'visa' },
      { id: 'mastercard', label: 'MasterCard', logo: 'mastercard' },
      { id: 'verve', label: 'Verve Card', logo: 'verve' },
    ],
  },
  {
    id: 'bank',
    title: 'Bank',
    methods: [
      { id: 'bank-transfer', label: 'Bank Transfer', logo: 'bank-transfer' },
      { id: 'ussd', label: 'USSD', logo: 'ussd' },
    ],
  },
  {
    id: 'international-payment',
    title: 'International Payment',
    methods: [{ id: 'amex', label: 'American Express', logo: 'amex' }],
  },
]
const METHOD_TO_PAYSTACK_CHANNEL = {
  visa: 'card',
  mastercard: 'card',
  verve: 'card',
  amex: 'card',
  'bank-transfer': 'bank_transfer',
  ussd: 'ussd',
}

const emptyAddressDraft = {
  id: '',
  label: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: DEFAULT_COUNTRY,
  isDefault: false,
}

const createAddressId = () =>
  `addr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

const normalizeAddressCollection = (profile, key = 'addresses') => {
  const addresses = Array.isArray(profile?.[key]) ? profile[key] : []
  return addresses
    .filter((item) => item && typeof item === 'object')
    .slice(0, MAX_ADDRESSES)
    .map((item, index) => ({
      id: String(item.id || `address-${index + 1}`),
      label: String(item.label || `Address ${index + 1}`),
      line1: String(item.line1 || ''),
      line2: String(item.line2 || ''),
      city: String(item.city || ''),
      state: String(item.state || ''),
      postalCode: String(item.postalCode || ''),
      country: String(item.country || ''),
      isDefault: Boolean(item.isDefault),
    }))
}

const formatAddressLine = (address) => {
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

const getDefaultAddress = (entries) =>
  entries.find((entry) => entry.isDefault) || entries[0] || null

const normalizeCheckoutCountry = (country) => {
  const next = String(country || '').trim()
  if (!next) return DEFAULT_COUNTRY
  if (ACCEPTED_COUNTRY_SET.has(next)) return next
  if (next.toLowerCase() === 'nigeria') return DEFAULT_COUNTRY
  return INTERNATIONAL_COUNTRY
}

const getDialCodeByCountry = (country) => {
  const normalized = String(country || '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')
  return COUNTRY_DIAL_CODES[normalized] || DEFAULT_DIAL_CODE
}

const getFlagCodeByCountry = (country) => {
  const normalized = String(country || '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')
  return COUNTRY_FLAGS[normalized] || 'US'
}

const getPaystackChannelsForMethod = (methodId) => {
  const channel = METHOD_TO_PAYSTACK_CHANNEL[String(methodId || '').trim()]
  if (!channel) return []
  return [channel]
}

const isoToFlagEmoji = (code) => {
  const chars = String(code || 'US').toUpperCase().slice(0, 2).split('')
  if (chars.length !== 2) return '🏳️'
  return String.fromCodePoint(chars[0].charCodeAt(0) + 127397, chars[1].charCodeAt(0) + 127397)
}

function CheckoutPaymentPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { formatMoney } = useUserI18n()
  const { user, isLoading: isAuthLoading } = useAuthUser()
  const { items, summary, updateQuantity, isReady, isServerReady } = useCart()
  const selectedKeys = useMemo(
    () => parseCheckoutSelectionParam(searchParams?.get('selected')),
    [searchParams],
  )
  const checkoutItems = useMemo(
    () => filterItemsByCheckoutSelection(items, selectedKeys),
    [items, selectedKeys],
  )
  const checkoutSummary = useMemo(() => {
    const subtotal = checkoutItems.reduce(
      (sum, entry) => sum + Number(entry.price || 0) * Number(entry.quantity || 0),
      0,
    )
    const protectedSubtotal = checkoutItems.reduce((sum, entry) => {
      if (!entry.isProtected || isDigitalProductLike(entry)) return sum
      return sum + Number(entry.price || 0) * Number(entry.quantity || 0)
    }, 0)
    const protectedItemCount = checkoutItems.reduce((sum, entry) => {
      if (!entry.isProtected || isDigitalProductLike(entry)) return sum
      return sum + Number(entry.quantity || 0)
    }, 0)
    const protectionFee = calculateOrderProtectionFee(protectedSubtotal, summary?.protectionConfig)
    return { subtotal, protectionFee, protectedItemCount, itemCount: checkoutItems.length }
  }, [checkoutItems, summary?.protectionConfig])

  const [phoneCountry, setPhoneCountry] = useState('')
  const [isPhoneCountryMenuOpen, setIsPhoneCountryMenuOpen] = useState(false)
  const [contactPhoneLocal, setContactPhoneLocal] = useState('')
  const [isStartingPayment, setIsStartingPayment] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [isPaystackReady, setIsPaystackReady] = useState(false)
  const [shippingProgressConfig, setShippingProgressConfig] = useState({
    enabled: true,
    standardFreeShippingThreshold: 50,
    expressFreeShippingThreshold: 100,
  })

  const [profile, setProfile] = useState(null)
  const [billingAddresses, setBillingAddresses] = useState([])
  const [shippingAddresses, setShippingAddresses] = useState([])
  const [selectedBillingAddressId, setSelectedBillingAddressId] = useState('')
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true)
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)
  const [editingAddressId, setEditingAddressId] = useState('')
  const [draftAddress, setDraftAddress] = useState(emptyAddressDraft)
  const [addressError, setAddressError] = useState('')
  const [addressSuccess, setAddressSuccess] = useState('')
  const [isSavingAddress, setIsSavingAddress] = useState(false)
  const [isMobileOrderSummaryOpen, setIsMobileOrderSummaryOpen] = useState(false)
  const phoneSelectorRef = useRef(null)
  const billingSectionRef = useRef(null)
  const paymentMethodSectionRef = useRef(null)
  const contactPhoneSectionRef = useRef(null)
  const hasPrefilledPhoneRef = useRef(false)
  const hasManualPhoneCountryRef = useRef(false)

  const taxAmount = useMemo(
    () => Math.round(checkoutSummary.subtotal * TAX_RATE * 100) / 100,
    [checkoutSummary.subtotal],
  )
  const protectionFee = Number(checkoutSummary.protectionFee || 0)
  const shippingFee =
    Number(checkoutSummary.subtotal || 0) >=
    Number(shippingProgressConfig.standardFreeShippingThreshold || 50)
      ? 0
      : SHIPPING_FEE
  const totalAmount = checkoutSummary.subtotal + shippingFee + taxAmount + protectionFee
  const formatFeeOrFree = (amount) => (Number(amount || 0) <= 0 ? 'FREE' : formatMoney(amount))
  const selectedPhoneCountry = normalizeCheckoutCountry(phoneCountry || profile?.country || user?.country)
  const selectedDialCode = useMemo(
    () => getDialCodeByCountry(selectedPhoneCountry),
    [selectedPhoneCountry],
  )
  const selectedFlagEmoji = useMemo(
    () => isoToFlagEmoji(getFlagCodeByCountry(selectedPhoneCountry)),
    [selectedPhoneCountry],
  )
  const contactPhoneDigits = `${selectedDialCode}${String(contactPhoneLocal || '')
    .replace(/\D/g, '')
    .trim()}`
  const minLocalPhoneLength = 7
  const normalizedEmail = String(user?.email || '').trim()
  const paystackEmail =
    normalizedEmail || (contactPhoneDigits ? `customer_${contactPhoneDigits}@checkout.ocprimes.com` : '')
  const paystackPublicKey = String(process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '').trim()
  const phoneCountryOptions = useMemo(
    () =>
      ACCEPTED_COUNTRIES.map((country) => ({
        country,
        dialCode: getDialCodeByCountry(country),
        flagEmoji: isoToFlagEmoji(getFlagCodeByCountry(country)),
      })),
    [],
  )
  const defaultPaymentMethodId =
    PAYMENT_METHOD_GROUPS[0]?.methods?.[0]?.id || ''
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState(defaultPaymentMethodId)
  const selectedPaystackChannels = useMemo(
    () => getPaystackChannelsForMethod(selectedPaymentMethodId),
    [selectedPaymentMethodId],
  )
  const mobilePaymentMethods = useMemo(
    () => PAYMENT_METHOD_GROUPS.flatMap((group) => group.methods),
    [],
  )
  const [useShippingAsBilling, setUseShippingAsBilling] = useState(false)

  useEffect(() => {
    const promoParam = String(searchParams?.get('promo') || '').trim()
    if (!promoParam) return
    setPromoCode(promoParam)
  }, [searchParams])
  const hasDedicatedBillingAddresses = billingAddresses.length > 0
  const displayedBillingAddresses = hasDedicatedBillingAddresses
    ? billingAddresses
    : shippingAddresses
  const activeBillingAddressPool = useShippingAsBilling
    ? shippingAddresses
    : displayedBillingAddresses

  const selectedBillingAddress = useMemo(
    () => activeBillingAddressPool.find((entry) => entry.id === selectedBillingAddressId) || null,
    [activeBillingAddressPool, selectedBillingAddressId],
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.PaystackPop) {
      setIsPaystackReady(true)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://js.paystack.co/v1/inline.js'
    script.async = true
    script.onload = () => setIsPaystackReady(true)
    script.onerror = () => {
      setIsPaystackReady(false)
      setPaymentError('Unable to load Paystack. Please refresh and try again.')
    }
    document.body.appendChild(script)
    return () => {
      script.onload = null
      script.onerror = null
    }
  }, [])

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
        // keep defaults when settings are unavailable
      }
    }

    void loadShippingProgressSettings()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const loadProfile = async () => {
      setIsLoadingAddresses(true)
      try {
        const response = await fetch('/api/user/profile')
        if (!response.ok) {
          if (!cancelled) {
            setProfile(null)
            setBillingAddresses([])
            setShippingAddresses([])
            setSelectedBillingAddressId('')
          }
          return
        }
        const payload = await response.json().catch(() => null)
        const nextProfile = payload?.profile || {}
        const normalizedBilling = normalizeAddressCollection(nextProfile, 'billingAddresses')
        const normalizedShipping = normalizeAddressCollection(nextProfile, 'addresses')
        if (cancelled) return
        setProfile(nextProfile)
        setBillingAddresses(normalizedBilling)
        setShippingAddresses(normalizedShipping)
        const source = normalizedBilling.length > 0 ? normalizedBilling : normalizedShipping
        const selectedDefault = getDefaultAddress(source)
        setSelectedBillingAddressId(selectedDefault?.id || '')
      } finally {
        if (!cancelled) setIsLoadingAddresses(false)
      }
    }

    void loadProfile()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const inferredCountry = normalizeCheckoutCountry(profile?.country || user?.country)
    if (hasManualPhoneCountryRef.current) return
    if (phoneCountry === inferredCountry) return
    setPhoneCountry(inferredCountry)
  }, [profile?.country, user?.country, phoneCountry])

  useEffect(() => {
    if (hasPrefilledPhoneRef.current) return
    if (contactPhoneLocal) {
      hasPrefilledPhoneRef.current = true
      return
    }

    const rawPhone = String(
      profile?.phone || profile?.phoneNumber || user?.phone || user?.phoneNumber || '',
    )
      .replace(/\D/g, '')
      .trim()
    if (!rawPhone) return

    const dialCode = getDialCodeByCountry(phoneCountry || profile?.country || user?.country)
    if (rawPhone.startsWith(dialCode) && rawPhone.length > dialCode.length) {
      setContactPhoneLocal(rawPhone.slice(dialCode.length))
    } else {
      setContactPhoneLocal(rawPhone)
    }
    hasPrefilledPhoneRef.current = true
  }, [
    profile?.country,
    profile?.phone,
    profile?.phoneNumber,
    user?.country,
    user?.phone,
    user?.phoneNumber,
    phoneCountry,
    contactPhoneLocal,
  ])

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!phoneSelectorRef.current) return
      if (phoneSelectorRef.current.contains(event.target)) return
      setIsPhoneCountryMenuOpen(false)
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  useEffect(() => {
    const source = useShippingAsBilling ? shippingAddresses : displayedBillingAddresses
    if (source.length === 0) {
      setSelectedBillingAddressId('')
      return
    }
    const exists = source.some((entry) => entry.id === selectedBillingAddressId)
    if (exists) return
    const fallback = getDefaultAddress(source)
    setSelectedBillingAddressId(fallback?.id || '')
  }, [useShippingAsBilling, shippingAddresses, displayedBillingAddresses, selectedBillingAddressId])

  const removeItem = (item) => {
    updateQuantity(item.key, 0)
  }

  const scrollToSection = (sectionRef) => {
    if (!sectionRef?.current) return
    sectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const getPaymentBlockingIssue = () => {
    if (!checkoutItems.length) {
      return {
        message: 'Your checkout selection is empty. Add item(s) before payment.',
        sectionRef: paymentMethodSectionRef,
      }
    }
    if (isAuthLoading) {
      return {
        message: 'Checking your account. Please wait a moment.',
        sectionRef: contactPhoneSectionRef,
      }
    }
    if (isStartingPayment) {
      return {
        message: 'Payment is already starting. Please wait.',
        sectionRef: paymentMethodSectionRef,
      }
    }
    if (!isPaystackReady) {
      return {
        message: 'Paystack is still loading. Please try again.',
        sectionRef: paymentMethodSectionRef,
      }
    }
    if (!selectedPaymentMethodId) {
      return {
        message: 'Select a payment method to continue.',
        sectionRef: paymentMethodSectionRef,
      }
    }
    if (!selectedBillingAddress) {
      return {
        message: 'Select a billing address before payment.',
        sectionRef: billingSectionRef,
      }
    }
    if (!contactPhoneLocal || String(contactPhoneLocal || '').length < minLocalPhoneLength) {
      return {
        message: `Enter a valid contact phone number after country code +${selectedDialCode}.`,
        sectionRef: contactPhoneSectionRef,
      }
    }
    return null
  }

  const isProceedBlocked = Boolean(getPaymentBlockingIssue())

  const handleProceedClick = () => {
    const blockingIssue = getPaymentBlockingIssue()
    if (blockingIssue) {
      setPaymentError(blockingIssue.message)
      scrollToSection(blockingIssue.sectionRef)
      return
    }
    void handlePayWithPaystack()
  }

  const openAddressModal = () => {
    if (billingAddresses.length >= MAX_ADDRESSES) {
      setAddressError(`You can only save up to ${MAX_ADDRESSES} addresses.`)
      return
    }
    setAddressError('')
    setAddressSuccess('')
    setEditingAddressId('')
    setDraftAddress({
      ...emptyAddressDraft,
      isDefault: billingAddresses.length === 0,
      country: normalizeCheckoutCountry(profile?.country),
    })
    setIsAddressModalOpen(true)
  }

  const openEditAddressModal = (address) => {
    const isExistingBilling = billingAddresses.some((entry) => entry.id === address.id)
    setAddressError('')
    setAddressSuccess('')
    setEditingAddressId(isExistingBilling ? address.id : '')
    setDraftAddress({
      id: isExistingBilling ? address.id : '',
      label: address.label || '',
      line1: address.line1 || '',
      line2: address.line2 || '',
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
    setDraftAddress(emptyAddressDraft)
  }

  const validateDraftAddress = () => {
    if (!draftAddress.line1.trim()) return 'Address line 1 is required.'
    if (!draftAddress.city.trim()) return 'City is required.'
    if (!draftAddress.country.trim()) return 'Country is required.'
    return ''
  }

  const saveBillingAddress = async () => {
    const validationError = validateDraftAddress()
    if (validationError) {
      setAddressError(validationError)
      return
    }

    const fallbackIndex =
      editingAddressId && billingAddresses.findIndex((entry) => entry.id === editingAddressId) >= 0
        ? billingAddresses.findIndex((entry) => entry.id === editingAddressId) + 1
        : billingAddresses.length + 1
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
      ? billingAddresses.map((entry) => (entry.id === editingAddressId ? nextAddress : entry))
      : [...billingAddresses, nextAddress]
    const withDefault = nextAddress.isDefault
      ? withNew.map((entry) => ({ ...entry, isDefault: entry.id === nextAddress.id }))
      : withNew.some((entry) => entry.isDefault)
        ? withNew
        : withNew.map((entry, index) => ({ ...entry, isDefault: index === 0 }))
    const defaultItem = withDefault.find((entry) => entry.isDefault) || withDefault[0] || null

    const profileFirstName =
      String(profile?.firstName || profile?.displayName || 'Customer').trim() || 'Customer'
    const profileCountry =
      normalizeCheckoutCountry(profile?.country || defaultItem?.country || draftAddress.country)

    setIsSavingAddress(true)
    setAddressError('')
    setAddressSuccess('')
    try {
      const deliveryAddress = profile?.deliveryAddress && typeof profile.deliveryAddress === 'object'
        ? {
            line1: String(profile.deliveryAddress.line1 || ''),
            line2: String(profile.deliveryAddress.line2 || ''),
            city: String(profile.deliveryAddress.city || ''),
            state: String(profile.deliveryAddress.state || ''),
            postalCode: String(profile.deliveryAddress.postalCode || ''),
            country: normalizeCheckoutCountry(profile.deliveryAddress.country),
          }
        : {
            line1: '',
            line2: '',
            city: '',
            state: '',
            postalCode: '',
            country: DEFAULT_COUNTRY,
          }

      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(profile || {}),
          firstName: profileFirstName,
          country: profileCountry,
          addresses: shippingAddresses,
          billingAddresses: withDefault,
          billingAddress: defaultItem
            ? {
                line1: defaultItem.line1 || '',
                line2: defaultItem.line2 || '',
                city: defaultItem.city || '',
                state: defaultItem.state || '',
                postalCode: defaultItem.postalCode || '',
                country: normalizeCheckoutCountry(defaultItem.country),
              }
            : {
                line1: '',
                line2: '',
                city: '',
                state: '',
                postalCode: '',
                country: DEFAULT_COUNTRY,
              },
          deliveryAddress,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to save billing address.')
      }

      const nextProfile = payload?.profile || {}
      const normalizedBilling = normalizeAddressCollection(nextProfile, 'billingAddresses')
      const normalizedShipping = normalizeAddressCollection(nextProfile, 'addresses')
      const selected =
        normalizedBilling.find((entry) => entry.id === targetId) ||
        normalizedBilling.find((entry) => entry.isDefault) ||
        normalizedBilling[0] ||
        normalizedShipping.find((entry) => entry.isDefault) ||
        normalizedShipping[0] ||
        null
      setProfile(nextProfile)
      setBillingAddresses(normalizedBilling)
      setShippingAddresses(normalizedShipping)
      setSelectedBillingAddressId(selected?.id || '')
      setAddressSuccess('Billing address saved.')
      setIsAddressModalOpen(false)
      setEditingAddressId('')
      setDraftAddress(emptyAddressDraft)
    } catch (error) {
      setAddressError(error?.message || 'Unable to save billing address.')
    } finally {
      setIsSavingAddress(false)
    }
  }

  const handlePayWithPaystack = async () => {
    if (!checkoutItems.length) {
      scrollToSection(paymentMethodSectionRef)
      return
    }
    if (!paystackPublicKey) {
      setPaymentError('Missing Paystack public key configuration.')
      scrollToSection(paymentMethodSectionRef)
      return
    }
    if (!window.PaystackPop || !isPaystackReady) {
      setPaymentError('Paystack is still loading. Please try again.')
      scrollToSection(paymentMethodSectionRef)
      return
    }
    if (!selectedPaymentMethodId) {
      setPaymentError('Select a payment method to continue.')
      scrollToSection(paymentMethodSectionRef)
      return
    }
    const phone = String(contactPhoneDigits || '').trim()
    if (!phone || String(contactPhoneLocal || '').length < minLocalPhoneLength) {
      setPaymentError(`Enter a valid contact phone number after country code +${selectedDialCode}.`)
      scrollToSection(contactPhoneSectionRef)
      return
    }

    const email = String(paystackEmail || '').trim()
    if (!email) {
      setPaymentError('Unable to prepare payment contact details.')
      scrollToSection(contactPhoneSectionRef)
      return
    }
    if (!selectedBillingAddress) {
      setPaymentError('Select a billing address before payment.')
      scrollToSection(billingSectionRef)
      return
    }

    const rawDeliveryAddress =
      profile?.deliveryAddress && typeof profile.deliveryAddress === 'object'
        ? profile.deliveryAddress
        : shippingAddresses.find((entry) => entry.isDefault) || shippingAddresses[0] || null
    const resolvedShippingAddress = rawDeliveryAddress
      ? {
          label: String(rawDeliveryAddress.label || ''),
          line1: String(rawDeliveryAddress.line1 || ''),
          line2: String(rawDeliveryAddress.line2 || ''),
          city: String(rawDeliveryAddress.city || ''),
          state: String(rawDeliveryAddress.state || ''),
          postalCode: String(rawDeliveryAddress.postalCode || ''),
          country: normalizeCheckoutCountry(rawDeliveryAddress.country),
        }
      : null

    setIsStartingPayment(true)
    setPaymentError('')
    try {
      const amountInKobo = Math.round(Number(totalAmount || 0) * 100)
      if (!Number.isFinite(amountInKobo) || amountInKobo < 100) {
        throw new Error('Amount must be at least 1.00.')
      }

      const reference = `ocp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const handler = window.PaystackPop.setup({
        key: paystackPublicKey,
        email,
        amount: amountInKobo,
        currency: 'NGN',
        ref: reference,
        ...(selectedPaystackChannels.length > 0 ? { channels: selectedPaystackChannels } : {}),
        metadata: {
          source: 'checkout_payment_page',
          item_count: checkoutSummary.itemCount,
          protection_item_count: Number(checkoutSummary.protectedItemCount || 0),
          protection_fee: protectionFee,
          selected_payment_method: selectedPaymentMethodId,
          selected_payment_channel: selectedPaystackChannels[0] || '',
          contact_phone: `+${phone}`,
          billing_address_id: selectedBillingAddress.id,
          billing_address_label: selectedBillingAddress.label,
          billing_address_country: selectedBillingAddress.country,
          billing_address_line1: selectedBillingAddress.line1,
          shipping_address_label: resolvedShippingAddress?.label || '',
          shipping_address_line1: resolvedShippingAddress?.line1 || '',
          shipping_address_line2: resolvedShippingAddress?.line2 || '',
          shipping_address_city: resolvedShippingAddress?.city || '',
          shipping_address_state: resolvedShippingAddress?.state || '',
          shipping_address_postal_code: resolvedShippingAddress?.postalCode || '',
          shipping_address_country: resolvedShippingAddress?.country || '',
        },
        callback: (response) => {
          const ref = String(response?.reference || reference).trim()
          const selected = String(searchParams?.get('selected') || '').trim()
          router.push(
            selected
              ? `/checkout/review?payment_reference=${encodeURIComponent(ref)}&selected=${encodeURIComponent(selected)}`
              : `/checkout/review?payment_reference=${encodeURIComponent(ref)}`,
          )
        },
        onClose: () => {
          setIsStartingPayment(false)
        },
      })
      handler.openIframe()
      setIsStartingPayment(false)
    } catch (error) {
      setPaymentError(error?.message || 'Unable to initialize payment.')
      setIsStartingPayment(false)
    }
  }

  return (
    <div className='min-h-screen bg-white text-slate-900'>
      <div className='w-full pb-24 pt-4 sm:pb-24 lg:mx-auto lg:max-w-7xl lg:px-6 lg:pb-10'>
        <section className='pb-4 sm:hidden'>
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
              <div className='relative text-slate-900'>
                <span className='pointer-events-none absolute -left-[35%] top-2.5 z-0 h-0 w-[70%] border-t-2 border-dotted border-slate-300' aria-hidden='true' />
                <div className='relative z-10 mx-auto mb-1 inline-flex items-center justify-center bg-white px-0.5'>
                  <svg viewBox='0 0 24 24' className='h-7 w-7' fill='none' stroke='currentColor' aria-hidden='true'>
                    <rect x='3' y='6' width='18' height='13' rx='2' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round' />
                    <path d='M3 10H20.5' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round' />
                    <path d='M7 15H9' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round' />
                  </svg>
                </div>
                <p className='font-semibold'>Payment</p>
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
              <span className='mx-auto h-0.5 w-14 rounded-full bg-slate-900' />
              <span className='mx-auto h-0.5 w-14 rounded-full bg-slate-900' />
              <span className='mx-auto h-0.5 w-14 rounded-full bg-transparent' />
            </div>
          </div>
        </section>

        <div className='grid gap-5 lg:grid-cols-2'>
          <section className='rounded-lg border border-slate-200 bg-white p-4 sm:p-5'>
            <div>
              <h1 className='text-[26px] font-semibold leading-none text-slate-900'>Secure Checkout</h1>
              <p className='mt-1 text-sm text-slate-500'>
                Your payment details are encrypted and processed securely.
              </p>
            </div>

            <div ref={billingSectionRef} className='mt-5 sm:rounded-lg sm:border sm:border-slate-200 sm:bg-slate-50 sm:p-4'>
              <div>
                <div className='mt-2 flex items-center justify-between gap-2'>
                  <p className='text-sm font-semibold text-slate-900'>Select a billing address</p>
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
                  ) : activeBillingAddressPool.length > 0 ? (
                    <div className='space-y-2'>
                      {activeBillingAddressPool.map((address) => {
                        const isSelected = selectedBillingAddressId === address.id
                        const mobileAddressLine = [
                          address.line1,
                          address.line2,
                          [address.city, address.state].filter(Boolean).join(', '),
                          [address.postalCode, address.country].filter(Boolean).join(', '),
                        ]
                          .filter(Boolean)
                          .join(', ')

                        return (
                          <div key={`mobile-billing-address-${address.id}`} className='flex w-full items-start gap-2'>
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
                              onClick={() => setSelectedBillingAddressId(address.id)}
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
                                setSelectedBillingAddressId(address.id)
                                openEditAddressModal(address)
                              }}
                              className='inline-flex h-7 w-7 items-center justify-center text-slate-500'
                              aria-label='Edit billing address'
                            >
                              <svg viewBox='0 0 20 20' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
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
                    <p className='text-xs text-slate-500'>No billing address yet. Add one to continue.</p>
                  )}
                </div>
                {addressSuccess ? <p className='mt-2 text-xs text-emerald-600'>{addressSuccess}</p> : null}
                {addressError ? <p className='mt-2 text-xs text-rose-600'>{addressError}</p> : null}
              </div>

            </div>

            <div ref={paymentMethodSectionRef} className='mt-5 rounded-lg bg-white'>
              <div className='border-b border-slate-200 px-4 py-3'>
                <h2 className='text-sm font-semibold uppercase tracking-[0.08em] text-slate-500'>
                  Choose Payment Method
                </h2>
              </div>
              <div className='sm:hidden'>
                {mobilePaymentMethods.map((method, index) => (
                  <button
                    key={`mobile-payment-method-${method.id}`}
                    type='button'
                    onClick={() => setSelectedPaymentMethodId(method.id)}
                    className={`flex w-full items-center justify-between px-3 py-3 text-left ${
                      index < mobilePaymentMethods.length - 1 ? 'border-b border-slate-200' : ''
                    }`}
                  >
                    <div className='flex items-center gap-3'>
                      {method.logo === 'visa' ? (
                        <span className='text-base font-extrabold tracking-tight text-[#1A1F71]'>VISA</span>
                      ) : null}
                      {method.logo === 'mastercard' ? (
                        <svg
                          viewBox='0 -222 2000 2000'
                          className='h-7 w-12'
                          xmlns='http://www.w3.org/2000/svg'
                          aria-label='Mastercard'
                          role='img'
                        >
                          <path fill='#ff5f00' d='M1270.57 1104.15H729.71v-972h540.87Z' />
                          <path fill='#eb001b' d='M764 618.17c0-197.17 92.32-372.81 236.08-486A615.46 615.46 0 0 0 618.09 0C276.72 0 0 276.76 0 618.17s276.72 618.17 618.09 618.17a615.46 615.46 0 0 0 382-132.17C856.34 991 764 815.35 764 618.17' />
                          <path fill='#f79e1b' d='M2000.25 618.17c0 341.41-276.72 618.17-618.09 618.17a615.65 615.65 0 0 1-382.05-132.17c143.8-113.19 236.12-288.82 236.12-486s-92.32-372.81-236.12-486A615.65 615.65 0 0 1 1382.15 0c341.37 0 618.09 276.76 618.09 618.17' />
                        </svg>
                      ) : null}
                      {method.logo === 'bank-transfer' ? (
                        <span className='inline-flex h-6 items-center justify-center rounded border border-slate-300 bg-slate-100 px-2 text-[11px] font-bold text-slate-700'>
                          BANK
                        </span>
                      ) : null}
                      {method.logo === 'ussd' ? (
                        <span className='inline-flex h-6 items-center justify-center rounded border border-emerald-300 bg-emerald-50 px-2 text-[11px] font-bold text-emerald-700'>
                          *737#
                        </span>
                      ) : null}
                      {method.logo === 'amex' ? (
                        <span className='rounded bg-[#2E77BC] px-2 py-1 text-[10px] font-bold text-white'>
                          AMEX
                        </span>
                      ) : null}
                      {method.logo === 'verve' ? (
                        <span className='rounded bg-[#0b1d4d] px-2 py-1 text-[10px] font-bold text-white'>
                          VERVE
                        </span>
                      ) : null}
                      <span className='text-sm text-slate-900'>{method.label}</span>
                    </div>
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${
                        selectedPaymentMethodId === method.id
                          ? 'border-sky-600'
                          : 'border-slate-300'
                      }`}
                      aria-hidden='true'
                    >
                      {selectedPaymentMethodId === method.id ? (
                        <span className='h-2 w-2 rounded-full bg-sky-600' />
                      ) : null}
                    </span>
                  </button>
                ))}
              </div>
              <div className='hidden space-y-3 p-3 sm:block'>
                {PAYMENT_METHOD_GROUPS.map((group) => (
                  <div key={group.id} className='overflow-hidden rounded-lg border border-slate-200'>
                    <div className='bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500'>
                      {group.title}
                    </div>
                    {group.methods.map((method, index) => (
                      <button
                        key={method.id}
                        type='button'
                        onClick={() => setSelectedPaymentMethodId(method.id)}
                        className={`flex w-full items-center justify-between px-3 py-3 text-left ${
                          index < group.methods.length - 1 ? 'border-b border-slate-200' : ''
                        }`}
                      >
                        <div className='flex items-center gap-3'>
                          {method.logo === 'visa' ? (
                            <span className='text-lg font-extrabold tracking-tight text-[#1A1F71]'>VISA</span>
                          ) : null}
                          {method.logo === 'mastercard' ? (
                            <svg
                              viewBox='0 -222 2000 2000'
                              className='h-8 w-14'
                              xmlns='http://www.w3.org/2000/svg'
                              aria-label='Mastercard'
                              role='img'
                            >
                              <path
                                fill='#ff5f00'
                                d='M1270.57 1104.15H729.71v-972h540.87Z'
                              />
                              <path
                                fill='#eb001b'
                                d='M764 618.17c0-197.17 92.32-372.81 236.08-486A615.46 615.46 0 0 0 618.09 0C276.72 0 0 276.76 0 618.17s276.72 618.17 618.09 618.17a615.46 615.46 0 0 0 382-132.17C856.34 991 764 815.35 764 618.17'
                              />
                              <path
                                fill='#f79e1b'
                                d='M2000.25 618.17c0 341.41-276.72 618.17-618.09 618.17a615.65 615.65 0 0 1-382.05-132.17c143.8-113.19 236.12-288.82 236.12-486s-92.32-372.81-236.12-486A615.65 615.65 0 0 1 1382.15 0c341.37 0 618.09 276.76 618.09 618.17'
                              />
                            </svg>
                          ) : null}
                          {method.logo === 'bank-transfer' ? (
                            <span className='inline-flex h-7 items-center justify-center rounded border border-slate-300 bg-slate-100 px-2.5 text-xs font-bold text-slate-700'>
                              BANK
                            </span>
                          ) : null}
                          {method.logo === 'ussd' ? (
                            <span className='inline-flex h-7 items-center justify-center rounded border border-emerald-300 bg-emerald-50 px-2.5 text-xs font-bold text-emerald-700'>
                              *737#
                            </span>
                          ) : null}
                          {method.logo === 'amex' ? (
                            <span className='rounded bg-[#2E77BC] px-2.5 py-1.5 text-[11px] font-bold text-white'>
                              AMEX
                            </span>
                          ) : null}
                          {method.logo === 'verve' ? (
                            <span className='rounded bg-[#0b1d4d] px-2.5 py-1.5 text-xs font-bold text-white'>
                              VERVE
                            </span>
                          ) : null}
                          <span className='text-sm text-slate-900'>{method.label}</span>
                        </div>
                        <span
                          className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${
                            selectedPaymentMethodId === method.id
                              ? 'border-sky-600'
                              : 'border-slate-300'
                          }`}
                          aria-hidden='true'
                        >
                          {selectedPaymentMethodId === method.id ? (
                            <span className='h-2 w-2 rounded-full bg-sky-600' />
                          ) : null}
                        </span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div ref={contactPhoneSectionRef} className='mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4'>
              <label className='block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500'>
                Contact Phone Number
                <span className='ml-1 text-rose-500'>*</span>
              </label>
              <div ref={phoneSelectorRef} className='relative mt-2 grid gap-2 sm:grid-cols-[96px_1fr]'>
                <button
                  type='button'
                  onClick={() => setIsPhoneCountryMenuOpen((prev) => !prev)}
                  className='flex h-11 items-center justify-between rounded-xl border border-slate-300 bg-white px-2 text-sm text-slate-900'
                  aria-expanded={isPhoneCountryMenuOpen}
                  aria-label='Select phone country'
                >
                  <span className='flex min-w-0 items-center gap-1.5'>
                    <span>{selectedFlagEmoji}</span>
                    <span className='truncate'>+{selectedDialCode}</span>
                  </span>
                  <svg viewBox='0 0 20 20' className='h-5 w-5 text-slate-500' fill='none' stroke='currentColor' strokeWidth='1.8'>
                    <path d='m6 8 4 4 4-4' strokeLinecap='round' strokeLinejoin='round' />
                  </svg>
                </button>
                <input
                  type='tel'
                  value={contactPhoneLocal}
                  onChange={(event) => setContactPhoneLocal(event.target.value.replace(/\D/g, ''))}
                  inputMode='numeric'
                  pattern='[0-9]*'
                  placeholder='Phone number'
                  className='h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-slate-900'
                />

                {isPhoneCountryMenuOpen ? (
                  <div className='absolute z-30 mt-12 w-full max-w-[320px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl'>
                    <div className='max-h-64 overflow-y-auto py-1'>
                      {phoneCountryOptions.map((entry) => (
                        <button
                          key={entry.country}
                          type='button'
                          onClick={() => {
                            hasManualPhoneCountryRef.current = true
                            setPhoneCountry(entry.country)
                            setIsPhoneCountryMenuOpen(false)
                          }}
                          className='flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-50'
                        >
                          <span className='flex items-center gap-2 text-sm text-slate-800'>
                            <span>{entry.flagEmoji}</span>
                            <span>{entry.country}</span>
                            <span className='text-slate-500'>(+{entry.dialCode})</span>
                          </span>
                          {entry.country === selectedPhoneCountry ? (
                            <span className='text-sky-600'>✓</span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
              {isAuthLoading ? (
                <p className='mt-2 text-xs text-slate-500'>Checking account...</p>
              ) : null}
              <p className='mt-2 text-xs text-slate-500'>
                We will use this number to contact you about your delivery and payment updates.
              </p>
              {paymentError ? (
                <p className='mt-2 text-xs text-rose-600'>{paymentError}</p>
              ) : null}
            </div>

            <div className='mt-5 grid items-center gap-3 sm:grid-cols-2'>
              <div className='flex items-center justify-center sm:col-span-2 lg:col-span-1'>
                <Image
                  src={paystackLogo}
                  alt='Paystack'
                  className='h-20 w-auto object-contain'
                  draggable={false}
                  onDragStart={(event) => event.preventDefault()}
                  priority
                />
              </div>
              <button
                type='button'
                onClick={handleProceedClick}
                aria-disabled={isProceedBlocked || isStartingPayment}
                className={`hidden h-10 w-full items-center justify-center gap-2 self-center rounded-md bg-black px-5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(0,0,0,0.25)] lg:inline-flex ${
                  isProceedBlocked || isStartingPayment ? 'cursor-not-allowed opacity-60' : ''
                }`}
              >
                {isStartingPayment ? (
                  'Connecting to Paystack...'
                ) : (
                  <>
                    <span>{`Pay now ${formatMoney(totalAmount)}`}</span>
                    <svg
                      viewBox='0 0 20 20'
                      className='h-4 w-4'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2'
                      aria-hidden='true'
                    >
                      <path d='M8 5l5 5-5 5' strokeLinecap='round' strokeLinejoin='round' />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </section>

          <div className='self-start space-y-3 lg:col-start-2 lg:row-start-1'>
            <aside className='px-4 py-3 sm:rounded-lg sm:border sm:border-slate-200 sm:bg-white sm:p-5'>
              <div className='flex items-center justify-between py-2'>
                <button
                  type='button'
                  onClick={() => setIsMobileOrderSummaryOpen((prev) => !prev)}
                  className='text-left sm:cursor-default'
                >
                  <h2 className='text-xl font-semibold leading-none text-slate-900 sm:text-2xl'>Order Summary</h2>
                  <p className='mt-1 text-xs text-slate-500 sm:hidden'>
                    {`${checkoutSummary.itemCount} item${checkoutSummary.itemCount === 1 ? '' : 's'} • ${formatMoney(totalAmount)}`}
                  </p>
                </button>
                <button
                  type='button'
                  onClick={(event) => {
                    event.stopPropagation()
                    setIsMobileOrderSummaryOpen((prev) => !prev)
                  }}
                  className='inline-flex h-7 w-7 items-center justify-center text-slate-600 sm:hidden'
                  aria-label={isMobileOrderSummaryOpen ? 'Collapse order summary' : 'Expand order summary'}
                >
                  <svg
                    viewBox='0 0 20 20'
                    className={`h-4 w-4 transition-transform ${isMobileOrderSummaryOpen ? 'rotate-90' : ''}`}
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    aria-hidden='true'
                  >
                    <path d='M8 5l5 5-5 5' strokeLinecap='round' strokeLinejoin='round' />
                  </svg>
                </button>
              </div>

              <div className={`${isMobileOrderSummaryOpen ? 'mt-3 space-y-3' : 'hidden'} sm:mt-4 sm:block sm:space-y-3`}>
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
                        draggable={false}
                        onDragStart={(event) => event.preventDefault()}
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
                          onClick={() => removeItem(item)}
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

              <div className={`${isMobileOrderSummaryOpen ? 'mt-4' : 'hidden'} sm:mt-4 sm:block`}>
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
                <p className={`${isMobileOrderSummaryOpen ? 'mt-3' : 'hidden'} text-xs text-slate-500 sm:mt-3 sm:block`}>
                  Refreshing cart details...
                </p>
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

        <div className='fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur lg:hidden'>
          <button
            type='button'
            onClick={handleProceedClick}
            aria-disabled={isProceedBlocked || isStartingPayment}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-full bg-black px-4 py-3 text-sm font-semibold text-white ${
              isProceedBlocked || isStartingPayment ? 'cursor-not-allowed opacity-50' : ''
            }`}
          >
            {isStartingPayment ? (
              'Connecting to Paystack...'
            ) : (
              <>
                <span>{`Pay now ${formatMoney(totalAmount)}`}</span>
                <svg viewBox='0 0 20 20' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='2' aria-hidden='true'>
                  <path d='M8 5l5 5-5 5' strokeLinecap='round' strokeLinejoin='round' />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>

      {isAddressModalOpen ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4'>
          <div className='mx-auto w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-5 shadow-2xl max-h-[calc(100vh-6rem)] overflow-y-auto'>
            <div className='flex items-center justify-between gap-3'>
              <h2 className='text-lg font-semibold text-slate-900'>
                {editingAddressId ? 'Edit billing address' : 'Add billing address'}
              </h2>
              <button
                type='button'
                onClick={closeAddressModal}
                className='inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50'
                aria-label='Close billing address editor'
              >
                <svg viewBox='0 0 20 20' className='h-5 w-5' fill='none' stroke='currentColor' strokeWidth='1.8'>
                  <path d='M5 5l10 10M15 5 5 15' strokeLinecap='round' />
                </svg>
              </button>
            </div>

            <div className='mt-4 grid gap-3 sm:grid-cols-2'>
              <label className='text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 sm:col-span-2'>
                Address Label
                <input
                  value={draftAddress.label}
                  onChange={(event) =>
                    setDraftAddress((prev) => ({ ...prev, label: event.target.value }))
                  }
                  placeholder='Home, Office, etc.'
                  className='mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-slate-900'
                />
              </label>

              <label className='text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 sm:col-span-2'>
                Address Line 1
                <input
                  value={draftAddress.line1}
                  onChange={(event) =>
                    setDraftAddress((prev) => ({ ...prev, line1: event.target.value }))
                  }
                  className='mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-slate-900'
                />
              </label>

              <label className='text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 sm:col-span-2'>
                Address Line 2
                <input
                  value={draftAddress.line2}
                  onChange={(event) =>
                    setDraftAddress((prev) => ({ ...prev, line2: event.target.value }))
                  }
                  className='mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-slate-900'
                />
              </label>

              <label className='text-xs font-semibold uppercase tracking-[0.08em] text-slate-500'>
                City
                <input
                  value={draftAddress.city}
                  onChange={(event) =>
                    setDraftAddress((prev) => ({ ...prev, city: event.target.value }))
                  }
                  className='mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-slate-900'
                />
              </label>

              <label className='text-xs font-semibold uppercase tracking-[0.08em] text-slate-500'>
                State
                <input
                  value={draftAddress.state}
                  onChange={(event) =>
                    setDraftAddress((prev) => ({ ...prev, state: event.target.value }))
                  }
                  className='mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-slate-900'
                />
              </label>

              <label className='text-xs font-semibold uppercase tracking-[0.08em] text-slate-500'>
                Postal Code
                <input
                  value={draftAddress.postalCode}
                  onChange={(event) =>
                    setDraftAddress((prev) => ({ ...prev, postalCode: event.target.value }))
                  }
                  className='mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-slate-900'
                />
              </label>

              <label className='text-xs font-semibold uppercase tracking-[0.08em] text-slate-500'>
                Country
                <CustomSelect
                  value={draftAddress.country}
                  onChange={(event) =>
                    setDraftAddress((prev) => ({ ...prev, country: event.target.value }))
                  }
                  className='mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-slate-900'
                >
                  {ACCEPTED_COUNTRIES.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </CustomSelect>
              </label>

              <label className='sm:col-span-2 inline-flex items-center gap-2 text-sm text-slate-700'>
                <input
                  type='checkbox'
                  checked={Boolean(draftAddress.isDefault)}
                  onChange={(event) =>
                    setDraftAddress((prev) => ({ ...prev, isDefault: event.target.checked }))
                  }
                  className='h-4 w-4 rounded border-slate-300 text-slate-900'
                />
                Set as default address
              </label>
            </div>

            {addressError ? <p className='mt-3 text-xs text-rose-600'>{addressError}</p> : null}

            <div className='mt-5 grid gap-3 sm:grid-cols-2'>
              <button
                type='button'
                onClick={closeAddressModal}
                className='h-10 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700'
              >
                Cancel
              </button>
              <button
                type='button'
                onClick={saveBillingAddress}
                disabled={isSavingAddress}
                className='h-10 rounded-xl bg-[#0f1f35] text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60'
              >
                {isSavingAddress ? 'Saving...' : 'Save Address'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function PaymentPageFallback() {
  return (
    <div className='min-h-screen bg-white px-4 py-10 sm:px-6 lg:px-8'>
      <div className='mx-auto w-full max-w-6xl rounded-lg border border-slate-200 bg-white p-10 text-sm text-slate-500'>
        Loading checkout...
      </div>
    </div>
  )
}

export default function CheckoutPaymentPage() {
  return (
    <Suspense fallback={<PaymentPageFallback />}>
      <CheckoutPaymentPageContent />
    </Suspense>
  )
}
