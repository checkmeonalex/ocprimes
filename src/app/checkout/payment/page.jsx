'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useCart } from '@/context/CartContext'
import { useUserI18n } from '@/lib/i18n/useUserI18n'
import { useAuthUser } from '@/lib/auth/useAuthUser'
import { ACCEPTED_COUNTRIES } from '@/lib/user/accepted-countries'
import paystackLogo from './paystack.webp'

const SHIPPING_FEE = 5
const TAX_RATE = 0.05
const MAX_ADDRESSES = 5
const DEFAULT_DIAL_CODE = '1'
const COUNTRY_DIAL_CODES = {
  nigeria: '234',
  ghana: '233',
  kenya: '254',
  uganda: '256',
  tanzania: '255',
  southafrica: '27',
  egypt: '20',
  morocco: '212',
  unitedstates: '1',
  usa: '1',
  canada: '1',
  unitedkingdom: '44',
  uk: '44',
  ireland: '353',
}
const COUNTRY_FLAGS = {
  nigeria: 'NG',
  ghana: 'GH',
  kenya: 'KE',
  uganda: 'UG',
  tanzania: 'TZ',
  southafrica: 'ZA',
  egypt: 'EG',
  morocco: 'MA',
  unitedstates: 'US',
  usa: 'US',
  canada: 'CA',
  unitedkingdom: 'GB',
  uk: 'GB',
  ireland: 'IE',
  germany: 'DE',
  georgia: 'GE',
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
  country: '',
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

export default function CheckoutPaymentPage() {
  const router = useRouter()
  const { formatMoney } = useUserI18n()
  const { user, isLoading: isAuthLoading } = useAuthUser()
  const { items, summary, updateQuantity, isReady, isServerReady } = useCart()

  const [promoCode, setPromoCode] = useState('')
  const [phoneCountry, setPhoneCountry] = useState('')
  const [phoneSearch, setPhoneSearch] = useState('')
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
  const phoneSelectorRef = useRef(null)
  const hasPrefilledPhoneRef = useRef(false)
  const hasManualPhoneCountryRef = useRef(false)

  const taxAmount = useMemo(
    () => Math.round(summary.subtotal * TAX_RATE * 100) / 100,
    [summary.subtotal],
  )
  const protectionFee = Number(summary.protectionFee || 0)
  const shippingFee =
    Number(summary.subtotal || 0) >= Number(shippingProgressConfig.standardFreeShippingThreshold || 50)
      ? 0
      : SHIPPING_FEE
  const totalAmount = summary.subtotal + shippingFee + taxAmount + protectionFee
  const selectedPhoneCountry = phoneCountry || profile?.country || user?.country || 'United States'
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
  const filteredPhoneCountryOptions = useMemo(() => {
    const query = String(phoneSearch || '').toLowerCase().trim()
    if (!query) return phoneCountryOptions
    return phoneCountryOptions.filter((entry) =>
      String(entry.country || '').toLowerCase().includes(query),
    )
  }, [phoneCountryOptions, phoneSearch])
  const defaultPaymentMethodId =
    PAYMENT_METHOD_GROUPS[0]?.methods?.[0]?.id || ''
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState(defaultPaymentMethodId)
  const selectedPaystackChannels = useMemo(
    () => getPaystackChannelsForMethod(selectedPaymentMethodId),
    [selectedPaymentMethodId],
  )
  const [useShippingAsBilling, setUseShippingAsBilling] = useState(false)
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
    const inferredCountry = profile?.country || user?.country || 'United States'
    if (hasManualPhoneCountryRef.current) return
    if (!inferredCountry) return
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
      setPhoneSearch('')
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

  const incrementItemQty = (item) => {
    updateQuantity(item.key, Number(item.quantity || 0) + 1)
  }

  const decrementItemQty = (item) => {
    const nextQty = Math.max(1, Number(item.quantity || 1) - 1)
    updateQuantity(item.key, nextQty)
  }

  const removeItem = (item) => {
    updateQuantity(item.key, 0)
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
      country: profile?.country || '',
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
      country: address.country || '',
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
      String(profile?.country || defaultItem?.country || draftAddress.country || 'Unknown').trim() ||
      'Unknown'

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
            country: String(profile.deliveryAddress.country || ''),
          }
        : {
            line1: '',
            line2: '',
            city: '',
            state: '',
            postalCode: '',
            country: '',
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
                country: defaultItem.country || '',
              }
            : {
                line1: '',
                line2: '',
                city: '',
                state: '',
                postalCode: '',
                country: '',
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
    if (!items.length) return
    if (!paystackPublicKey) {
      setPaymentError('Missing Paystack public key configuration.')
      return
    }
    if (!window.PaystackPop || !isPaystackReady) {
      setPaymentError('Paystack is still loading. Please try again.')
      return
    }
    const phone = String(contactPhoneDigits || '').trim()
    if (!phone || String(contactPhoneLocal || '').length < minLocalPhoneLength) {
      setPaymentError(`Enter a valid contact phone number after country code +${selectedDialCode}.`)
      return
    }

    const email = String(paystackEmail || '').trim()
    if (!email) {
      setPaymentError('Unable to prepare payment contact details.')
      return
    }
    if (!selectedBillingAddress) {
      setPaymentError('Select a billing address before payment.')
      return
    }

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
          item_count: items.length,
          protection_item_count: Number(summary.protectedItemCount || 0),
          protection_fee: protectionFee,
          promo_code: promoCode.trim(),
          selected_payment_method: selectedPaymentMethodId,
          selected_payment_channel: selectedPaystackChannels[0] || '',
          contact_phone: `+${phone}`,
          billing_address_id: selectedBillingAddress.id,
          billing_address_label: selectedBillingAddress.label,
          billing_address_country: selectedBillingAddress.country,
          billing_address_line1: selectedBillingAddress.line1,
        },
        callback: (response) => {
          const ref = String(response?.reference || reference).trim()
          router.push(`/checkout/review?payment_reference=${encodeURIComponent(ref)}`)
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
    <div className='min-h-screen bg-[#eceff1] text-slate-900'>
      <div className='mx-auto w-full max-w-7xl px-4 pb-10 pt-4 sm:px-6'>
        <div className='grid gap-5 lg:grid-cols-[1.65fr_1fr]'>
          <section className='rounded-3xl border border-slate-200 bg-white p-4 sm:p-5'>
            <div>
              <h1 className='text-[26px] font-semibold leading-none text-slate-900'>Secure Checkout</h1>
              <p className='mt-1 text-sm text-slate-500'>
                Your payment details are encrypted and processed securely.
              </p>
            </div>

            <div className='mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4'>
              <div className='flex items-center justify-between gap-3'>
                <h2 className='text-sm font-semibold uppercase tracking-[0.08em] text-slate-500'>Billing Address</h2>
                <button
                  type='button'
                  onClick={openAddressModal}
                  className='rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700'
                >
                  + New
                </button>
              </div>
              {shippingAddresses.length > 0 ? (
                <label className='mt-2 inline-flex items-center gap-2 text-xs text-slate-600'>
                  <input
                    type='checkbox'
                    checked={useShippingAsBilling}
                    onChange={(event) => setUseShippingAsBilling(event.target.checked)}
                    className='h-4 w-4 rounded border-slate-300 text-slate-900'
                  />
                  Same as shipping address
                </label>
              ) : null}

              {isLoadingAddresses ? (
                <div className='mt-3 h-12 animate-pulse rounded-md bg-slate-200' />
              ) : selectedBillingAddress ? (
                <div className='mt-3 flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2'>
                  <button
                    type='button'
                    onClick={() => setSelectedBillingAddressId(selectedBillingAddress.id)}
                    className='flex items-start gap-2 text-left'
                  >
                    <span className='mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900'>
                      <span className='h-1.5 w-1.5 rounded-full bg-white' />
                    </span>
                    <span>
                      <p className='text-sm font-semibold text-slate-900'>{selectedBillingAddress.label}</p>
                      <p className='text-xs text-slate-500'>{formatAddressLine(selectedBillingAddress)}</p>
                    </span>
                  </button>
                  <button
                    type='button'
                    onClick={() => openEditAddressModal(selectedBillingAddress)}
                    className='inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:text-slate-700'
                    aria-label='Edit billing address'
                  >
                    <svg viewBox='0 0 20 20' className='h-5 w-5' fill='none' stroke='currentColor' strokeWidth='1.8'>
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
                <div className='mt-3 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2'>
                  <p className='text-xs text-slate-500'>No billing address yet. Add one to continue.</p>
                  <button
                    type='button'
                    onClick={openAddressModal}
                    className='rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white'
                  >
                    Add address
                  </button>
                </div>
              )}

              {!hasDedicatedBillingAddresses && displayedBillingAddresses.length > 0 ? (
                <p className='mt-2 text-xs text-slate-500'>
                  Using shipping address temporarily. Add a billing address to keep it separate.
                </p>
              ) : null}
              {useShippingAsBilling ? (
                <p className='mt-2 text-xs text-slate-500'>
                  Billing is currently set to your shipping address for this checkout.
                </p>
              ) : null}

              {activeBillingAddressPool.length > 0 ? (
                <div className='mt-3 flex flex-wrap gap-2'>
                  {activeBillingAddressPool.map((address) => (
                    <button
                      key={address.id}
                      type='button'
                      onClick={() => setSelectedBillingAddressId(address.id)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${
                        address.id === selectedBillingAddressId
                          ? 'border-sky-500 bg-sky-50 text-sky-700'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      {address.label}
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

              {addressSuccess ? (
                <p className='mt-2 text-xs text-emerald-600'>{addressSuccess}</p>
              ) : null}
              {addressError ? (
                <p className='mt-2 text-xs text-rose-600'>{addressError}</p>
              ) : null}
            </div>

            <div className='mt-5 rounded-2xl bg-white'>
              <div className='border-b border-slate-200 px-4 py-3'>
                <h2 className='text-sm font-semibold uppercase tracking-[0.08em] text-slate-500'>
                  Choose Payment Method
                </h2>
              </div>
              <div className='space-y-3 p-3'>
                {PAYMENT_METHOD_GROUPS.map((group) => (
                  <div key={group.id} className='overflow-hidden rounded-xl border border-slate-200'>
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

            <div className='mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4'>
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
                    <div className='border-b border-slate-200 p-2'>
                      <input
                        type='text'
                        value={phoneSearch}
                        onChange={(event) => setPhoneSearch(event.target.value)}
                        placeholder='Search for countries'
                        className='h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-slate-900'
                      />
                    </div>
                    <div className='max-h-64 overflow-y-auto py-1'>
                      {filteredPhoneCountryOptions.map((entry) => (
                        <button
                          key={entry.country}
                          type='button'
                          onClick={() => {
                            hasManualPhoneCountryRef.current = true
                            setPhoneCountry(entry.country)
                            setIsPhoneCountryMenuOpen(false)
                            setPhoneSearch('')
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
                {selectedFlagEmoji} +{selectedDialCode} {contactPhoneLocal || 'Phone number'}
              </p>
              {paymentError ? (
                <p className='mt-2 text-xs text-rose-600'>{paymentError}</p>
              ) : null}
            </div>

            <div className='mt-5 grid items-center gap-3 sm:grid-cols-2'>
              <div className='flex items-center justify-center'>
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
                onClick={handlePayWithPaystack}
                disabled={
                  !items.length ||
                  isAuthLoading ||
                  isStartingPayment ||
                  !isPaystackReady ||
                  !selectedBillingAddress ||
                  !contactPhoneLocal ||
                  contactPhoneLocal.length < minLocalPhoneLength
                }
                className='inline-flex h-10 w-full items-center justify-center gap-2 self-center rounded-md bg-black px-5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(0,0,0,0.25)] disabled:cursor-not-allowed disabled:opacity-60'
              >
                {isStartingPayment ? (
                  'Connecting to Paystack...'
                ) : (
                  <>
                    <span>Proceed to pay</span>
                    <svg
                      viewBox='0 0 20 20'
                      className='h-4 w-4'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2'
                      aria-hidden='true'
                    >
                      <path d='M4 10h11m0 0-4-4m4 4-4 4' strokeLinecap='round' strokeLinejoin='round' />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </section>

          <aside className='rounded-3xl border border-slate-200 bg-white p-4 sm:p-5'>
            <h2 className='text-2xl font-semibold leading-none text-slate-900'>Order Summary</h2>

            <div className='mt-4 space-y-3'>
              {items.map((item) => (
                <div key={item.key} className='flex items-start gap-3'>
                  <img
                    src={item.image || '/favicon.ico'}
                    alt={item.name}
                    className='h-14 w-14 rounded-xl border border-slate-200 object-cover'
                    draggable={false}
                    onDragStart={(event) => event.preventDefault()}
                  />
                  <div className='min-w-0 flex-1'>
                    <p className='truncate text-sm font-semibold text-slate-900'>{item.name}</p>
                    <p className='text-sm font-semibold text-slate-700'>{formatMoney(item.price)}</p>
                  </div>
                  <div className='flex items-center gap-2'>
                    <button
                      type='button'
                      onClick={() => removeItem(item)}
                      className='text-slate-400 hover:text-slate-600'
                      aria-label='Remove item'
                    >
                      x
                    </button>
                    <div className='inline-flex items-center gap-2 rounded-full border border-slate-200 px-2 py-1'>
                      <button
                        type='button'
                        onClick={() => decrementItemQty(item)}
                        className='inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold text-slate-700'
                        aria-label='Decrease quantity'
                      >
                        -
                      </button>
                      <span className='w-4 text-center text-sm font-semibold text-slate-800'>{item.quantity}</span>
                      <button
                        type='button'
                        onClick={() => incrementItemQty(item)}
                        className='inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold text-slate-700'
                        aria-label='Increase quantity'
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className='mt-5'>
              <h3 className='text-2xl font-semibold leading-none text-slate-900'>Promotion Code</h3>
              <div className='mt-2 flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2'>
                <input
                  type='text'
                  value={promoCode}
                  onChange={(event) => setPromoCode(event.target.value)}
                  placeholder='Add Promo Code'
                  className='w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400'
                />
                <button
                  type='button'
                  className='inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-600'
                  aria-label='Apply promo code'
                >
                  <svg viewBox='0 0 20 20' className='h-5 w-5' fill='none' stroke='currentColor' strokeWidth='2'>
                    <path d='m7 5 6 5-6 5' strokeLinecap='round' strokeLinejoin='round' />
                  </svg>
                </button>
              </div>
            </div>

            <div className='mt-5'>
              <h3 className='text-2xl font-semibold leading-none text-slate-900'>Order Total</h3>
              <div className='mt-3 space-y-2 text-sm'>
                <div className='flex items-center justify-between text-slate-600'>
                  <span>Subtotal</span>
                  <span className='font-semibold text-slate-900'>{formatMoney(summary.subtotal)}</span>
                </div>
                <div className='flex items-center justify-between text-slate-600'>
                  <span>Shipping</span>
                  <span className='font-semibold text-slate-900'>{formatMoney(shippingFee)}</span>
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
                <div className='flex items-center justify-between border-t border-slate-200 pt-2 text-base font-semibold'>
                  <span className='text-slate-900'>Total</span>
                  <span className='text-sky-600'>{formatMoney(totalAmount)}</span>
                </div>
              </div>
            </div>

            <div className='mt-5 space-y-3'>
              <section className='rounded-xl border border-slate-200 bg-slate-100 px-3 py-2'>
                <div className='flex items-center gap-2'>
                  <svg
                    viewBox='0 0 20 20'
                    className='h-4 w-4 text-emerald-600'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='1.8'
                    aria-hidden='true'
                  >
                    <rect x='5.4' y='9' width='9.2' height='7' rx='1.2' />
                    <path d='M7.3 9V7.3a2.7 2.7 0 1 1 5.4 0V9' />
                  </svg>
                  <p className='text-sm font-semibold text-slate-900'>Payment Security</p>
                </div>
                <p className='mt-1 text-xs leading-5 text-slate-600'>
                  Your payment details are encrypted and securely processed. We never store your
                  full card details on OCPRIMES.
                </p>
                <button type='button' className='mt-1 text-[11px] font-semibold text-slate-700'>
                  Learn more
                  <span className='ml-1' aria-hidden='true'>
                    ›
                  </span>
                </button>
              </section>

              <section className='rounded-xl border border-slate-200 bg-slate-100 px-3 py-2'>
                <div className='flex items-center gap-2'>
                  <svg
                    viewBox='0 0 20 20'
                    className='h-4 w-4 text-blue-600'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='1.8'
                    aria-hidden='true'
                  >
                    <path d='M4.5 5.5h11v9h-11z' />
                    <path d='M6.7 9.3h6.6M6.7 12h4.2' />
                  </svg>
                  <p className='text-sm font-semibold text-slate-900'>Return Policy</p>
                </div>
                <p className='mt-1 text-xs leading-5 text-slate-600'>
                  Eligible products can be returned based on seller policy. Order Protection can
                  override no-return items for covered issues.
                </p>
                <button type='button' className='mt-1 text-[11px] font-semibold text-slate-700'>
                  Learn more
                  <span className='ml-1' aria-hidden='true'>
                    ›
                  </span>
                </button>
              </section>

              <section className='rounded-xl border border-slate-200 bg-slate-100 px-3 py-2'>
                <div className='flex items-center gap-2'>
                  <svg
                    viewBox='0 0 20 20'
                    className='h-4 w-4 text-violet-600'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='1.8'
                    aria-hidden='true'
                  >
                    <rect x='3.8' y='5.5' width='12.4' height='9' rx='1.4' />
                    <path d='M3.8 8.7h12.4' />
                  </svg>
                  <p className='text-sm font-semibold text-slate-900'>Save Payment Options</p>
                </div>
                <p className='mt-1 text-xs leading-5 text-slate-600'>
                  Save your preferred payment method for faster future checkout. You can manage
                  saved options anytime in your account settings.
                </p>
                <button type='button' className='mt-1 text-[11px] font-semibold text-slate-700'>
                  Learn more
                  <span className='ml-1' aria-hidden='true'>
                    ›
                  </span>
                </button>
              </section>
            </div>

            {!isReady || !isServerReady ? (
              <p className='mt-3 text-xs text-slate-500'>Refreshing cart details...</p>
            ) : null}
          </aside>
        </div>
      </div>

      {isAddressModalOpen ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4'>
          <div className='mx-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl max-h-[calc(100vh-6rem)] overflow-y-auto'>
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
                <select
                  value={draftAddress.country}
                  onChange={(event) =>
                    setDraftAddress((prev) => ({ ...prev, country: event.target.value }))
                  }
                  className='mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-slate-900'
                >
                  <option value=''>Select country</option>
                  {ACCEPTED_COUNTRIES.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
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
