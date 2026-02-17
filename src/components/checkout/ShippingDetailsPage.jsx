'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useCart } from '@/context/CartContext'
import { useUserI18n } from '@/lib/i18n/useUserI18n'
import { ACCEPTED_COUNTRIES } from '@/lib/user/accepted-countries'

const TAX_RATE = 0.1
const emptyAddressDraft = {
  label: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  isDefault: false,
}
const inputClassName =
  'mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition duration-200 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10'
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
    fee: 0,
    badge: '',
    note: '',
  },
  {
    id: 'economical',
    label: 'Economical Delivery',
    estimate: '50 - 60 min',
    fee: 0,
    badge: '',
    note: '',
  },
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
      country: String(item.country || ''),
      isDefault: Boolean(item.isDefault),
    }))
}

const ShippingDetailsPage = () => {
  const router = useRouter()
  const { formatMoney } = useUserI18n()
  const { items, summary, isReady, isServerReady, updateQuantity } = useCart()
  const [profile, setProfile] = useState(null)
  const [addresses, setAddresses] = useState([])
  const [selectedAddressId, setSelectedAddressId] = useState('')
  const [checkoutMode, setCheckoutMode] = useState('delivery')
  const [selectedDeliveryOptionId, setSelectedDeliveryOptionId] = useState('express')
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true)
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)
  const [editingAddressId, setEditingAddressId] = useState('')
  const [draftAddress, setDraftAddress] = useState(emptyAddressDraft)
  const [addressError, setAddressError] = useState('')
  const [isSavingAddress, setIsSavingAddress] = useState(false)

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

  const hasCartItems = items.length > 0
  const hasSelectedAddress = Boolean(selectedAddressId)
  const selectedDeliveryOption =
    DELIVERY_OPTIONS.find((option) => option.id === selectedDeliveryOptionId) ||
    DELIVERY_OPTIONS[0]
  const shippingFee = checkoutMode === 'pickup' ? 0 : selectedDeliveryOption.fee
  const taxAmount = Math.round(summary.subtotal * TAX_RATE * 100) / 100
  const totalAmount = summary.subtotal + shippingFee + taxAmount

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

  const incrementItemQty = (item) => {
    updateQuantity(item.key, Number(item.quantity || 0) + 1)
  }

  const decrementItemQty = (item) => {
    const nextQuantity = Math.max(1, Number(item.quantity || 1) - 1)
    updateQuantity(item.key, nextQuantity)
  }

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
      country: profile?.country || '',
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

  const saveAddress = async () => {
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
      String(profile?.country || defaultAddress?.country || draftAddress.country || 'Unknown').trim() ||
      'Unknown'

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
                country: defaultAddress.country || '',
              }
            : {
                line1: '',
                line2: '',
                city: '',
                state: '',
                postalCode: '',
                country: '',
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
      closeAddressModal()
    } catch (error) {
      setAddressError(error?.message || 'Unable to save address.')
    } finally {
      setIsSavingAddress(false)
    }
  }

  return (
    <div className='min-h-screen bg-[#f3f4f6] text-slate-900'>
      <div className='mx-auto w-full max-w-7xl px-4 pb-12 pt-2 sm:px-6'>
        <div className='mt-3 grid gap-5 lg:grid-cols-[1.65fr_1fr]'>
          <section className='rounded-2xl border border-slate-200 bg-white p-4 sm:p-5'>
            <div className='flex items-start justify-between gap-3'>
              <div>
                <h1 className='text-[25px] font-semibold leading-none text-slate-900'>
                  Delivery Info Details
                </h1>
                <p className='mt-1 text-sm text-slate-500'>
                  Review your delivery info before proceeding.
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

            <div className='mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3'>
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
              <h2 className='text-xl font-semibold text-slate-900'>Delivery Options Available</h2>
              <p className='mt-1 text-sm text-slate-500'>Choose when you want to receive your order.</p>

              <div className='mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500'>
                Some delivery options are affected by store operating hours.
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
                      className={`w-full rounded-xl border p-4 text-left transition ${
                        isActive && !isPickup
                          ? 'border-sky-400 bg-sky-50/40 shadow-sm'
                          : 'border-slate-200 bg-white'
                      } ${isPickup ? 'cursor-not-allowed opacity-50' : 'hover:border-slate-300'}`}
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
                        <p className='mt-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600'>
                          {option.note}
                        </p>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className='mt-5 grid gap-3 sm:grid-cols-2'>
              <button
                type='button'
                onClick={() => router.push('/cart')}
                className='rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700'
              >
                Back to Account
              </button>
              <button
                type='button'
                onClick={() => router.push('/checkout/payment')}
                disabled={!hasCartItems || !hasSelectedAddress}
                className='rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_0_2px_rgba(15,23,42,0.25)] disabled:cursor-not-allowed disabled:opacity-50'
              >
                Continue to Payment
              </button>
            </div>
          </section>

          <aside className='rounded-2xl border border-slate-200 bg-white p-4 sm:p-5'>
            <h2 className='text-2xl font-semibold leading-none text-slate-900'>Order Summary</h2>

            <div className='mt-4 space-y-3'>
              {items.map((item) => (
                <div key={item.key} className='flex items-start gap-3'>
                  <img
                    src={item.image || '/favicon.ico'}
                    alt={item.name}
                    className='h-16 w-16 rounded-xl border border-slate-200 object-cover'
                  />
                  <div className='min-w-0 flex-1'>
                    <p className='truncate text-sm font-semibold text-slate-900'>{item.name}</p>
                    <p className='text-sm font-semibold text-slate-700'>{formatMoney(item.price)}</p>
                  </div>
                  <div className='inline-flex items-center gap-2 rounded-full border border-slate-200 px-2 py-1'>
                    <button
                      type='button'
                      onClick={() => decrementItemQty(item)}
                      className='inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold text-slate-700'
                      aria-label='Decrease quantity'
                    >
                      -
                    </button>
                    <span className='w-4 text-center text-sm font-semibold text-slate-800'>
                      {item.quantity}
                    </span>
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
              ))}
            </div>

            <div className='mt-5'>
              <h3 className='text-2xl font-semibold leading-none text-slate-900'>Promotion Code</h3>
              <div className='mt-2 flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2'>
                <input
                  type='text'
                  placeholder='Add promo code'
                  className='w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400'
                />
                <button
                  type='button'
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
                <div className='border-t border-slate-200 pt-2 flex items-center justify-between text-base font-semibold'>
                  <span className='text-slate-900'>Total</span>
                  <span className='text-sky-600'>{formatMoney(totalAmount)}</span>
                </div>
              </div>
            </div>

            <div className='mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900'>
              Welcome to our checkout. By proceeding you agree to our terms and secure delivery policy.
            </div>

            {!isReady || !isServerReady ? (
              <p className='mt-3 text-xs text-slate-500'>Refreshing cart details...</p>
            ) : null}
          </aside>
        </div>
      </div>

      {isAddressModalOpen ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4'>
          <div className='mx-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl transition duration-300 max-h-[calc(100vh-6rem)] overflow-y-auto'>
            <div className='flex items-center justify-between gap-3'>
              <h2 className='text-lg font-semibold text-slate-900'>
                {editingAddressId ? 'Edit address' : 'Add new address'}
              </h2>
              <button
                type='button'
                onClick={closeAddressModal}
                className='inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition duration-200 hover:bg-slate-50'
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
                <div className='mt-1 rounded-2xl border border-slate-100 bg-slate-50/60 p-2'>
                  <p className='text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500'>
                    Ship to
                  </p>
                  <div className='relative mt-1.5'>
                    <span className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 overflow-hidden rounded-sm border border-slate-200'>
                      <span className='h-full w-1/3 bg-[#118647]' />
                      <span className='h-full w-1/3 bg-white' />
                      <span className='h-full w-1/3 bg-[#118647]' />
                    </span>
                    <select
                      className='h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-900 shadow-sm outline-none transition duration-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10'
                      value={draftAddress.country}
                      onChange={(event) => updateDraftAddress('country', event.target.value)}
                    >
                      <option value=''>Select country</option>
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
                className='rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition duration-200 hover:border-slate-300 hover:bg-slate-50'
              >
                Cancel
              </button>
              <button
                type='button'
                onClick={saveAddress}
                disabled={isSavingAddress}
                className='rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition duration-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50'
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
