'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAlerts } from '@/context/AlertContext'
import { ACCEPTED_COUNTRIES } from '@/lib/user/accepted-countries'

const emptyAddress = {
  id: '',
  label: '',
  isDefault: false,
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
}

const inputClassName =
  'mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition duration-200 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10'
const countrySelectInputClass =
  'h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-900 shadow-sm outline-none transition duration-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10'

const ADDRESS_LABEL_SUGGESTIONS = [
  'Eg. My home',
  'Eg. My work address',
  "Eg. A friend's house",
  'Eg. Family home',
  'Eg. Pickup point',
  'Eg. Apartment address',
  'Eg. Office reception',
  'Eg. Weekend place',
  'Eg. Campus address',
  'Eg. Neighbourhood store',
  'Eg. Relative home',
  'Eg. Temporary stay',
]

const formatAddressSummary = (address) => {
  const chunks = [
    address.line1,
    address.line2,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ].filter(Boolean)
  return chunks.join(', ')
}

const createAddressId = () =>
  `addr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

const getRandomAddressLabelSuggestion = (existingLabels = []) => {
  const normalized = existingLabels
    .map((label) => (label || '').trim().toLowerCase())
    .filter(Boolean)

  const available = ADDRESS_LABEL_SUGGESTIONS.filter(
    (label) => !normalized.includes(label.toLowerCase()),
  )

  const pool = available.length > 0 ? available : ADDRESS_LABEL_SUGGESTIONS
  return pool[Math.floor(Math.random() * pool.length)]
}

export default function AddressesPage() {
  const [addressType, setAddressType] = useState('shipping')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [profile, setProfile] = useState(null)
  const [addresses, setAddresses] = useState([])
  const [billingAddresses, setBillingAddresses] = useState([])

  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [draft, setDraft] = useState(emptyAddress)
  const [draftLabelSuggestion, setDraftLabelSuggestion] = useState('My home')
  const { pushAlert } = useAlerts()

  const managedAddresses = addressType === 'billing' ? billingAddresses : addresses
  const hasAnyAddress = managedAddresses.length > 0
  const defaultAddress = useMemo(
    () => managedAddresses.find((item) => item.isDefault) || managedAddresses[0] || null,
    [managedAddresses],
  )

  useEffect(() => {
    let isMounted = true
    const loadProfile = async () => {
      try {
        const response = await fetch('/api/user/profile')
        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.error || 'Unable to load addresses.')
        }
        const payload = await response.json()
        if (!isMounted) return

        const nextProfile = payload?.profile || {}
        setProfile(nextProfile)

        const profileAddresses = Array.isArray(nextProfile?.addresses)
          ? nextProfile.addresses
          : []
        const profileBillingAddresses = Array.isArray(nextProfile?.billingAddresses)
          ? nextProfile.billingAddresses
          : []

        if (profileAddresses.length > 0) {
          const normalized = profileAddresses
            .slice(0, 5)
            .map((item, index) => ({
              ...emptyAddress,
              ...item,
              id: item.id || createAddressId(),
              label: item.label || `Address ${index + 1}`,
            }))
          const hasDefaultFlag = normalized.some((item) => item.isDefault)
          setAddresses(
            hasDefaultFlag
              ? normalized
              : normalized.map((item, index) => ({
                  ...item,
                  isDefault: index === 0,
                })),
          )
        } else {
          const legacy = nextProfile?.deliveryAddress || {}
          const legacyHasValue = Object.values(legacy).some(Boolean)
          if (legacyHasValue) {
            setAddresses([
              {
                ...emptyAddress,
                ...legacy,
                id: createAddressId(),
                label: 'Address 1',
                isDefault: true,
              },
            ])
          } else {
            setAddresses([])
          }
        }

        if (profileBillingAddresses.length > 0) {
          const normalizedBilling = profileBillingAddresses
            .slice(0, 5)
            .map((item, index) => ({
              ...emptyAddress,
              ...item,
              id: item.id || createAddressId(),
              label: item.label || `Billing ${index + 1}`,
            }))
          const hasBillingDefault = normalizedBilling.some((item) => item.isDefault)
          setBillingAddresses(
            hasBillingDefault
              ? normalizedBilling
              : normalizedBilling.map((item, index) => ({
                  ...item,
                  isDefault: index === 0,
                })),
          )
        } else {
          setBillingAddresses([])
        }
      } catch (err) {
        if (!isMounted) return
        const message = err?.message || 'Unable to load addresses.'
        setError(message)
        pushAlert({ type: 'error', title: 'Addresses', message })
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void loadProfile()
    return () => {
      isMounted = false
    }
  }, [pushAlert])

  const persistAddresses = async (nextAddresses, type = addressType) => {
    if (!profile) return

    const normalized = nextAddresses.map((item, index) => ({
      ...emptyAddress,
      ...item,
      label: (item.label || '').trim() || `Address ${index + 1}`,
    }))
    const hasDefaultFlag = normalized.some((item) => item.isDefault)
    const withDefault = hasDefaultFlag
      ? normalized
      : normalized.map((item, index) => ({ ...item, isDefault: index === 0 }))

    const defaultItem = withDefault.find((item) => item.isDefault) || withDefault[0] || null
    const nextShippingAddresses = type === 'shipping' ? withDefault : addresses
    const nextBillingAddresses = type === 'billing' ? withDefault : billingAddresses
    const defaultShippingAddress =
      nextShippingAddresses.find((item) => item.isDefault) || nextShippingAddresses[0] || null
    const defaultBillingAddress =
      nextBillingAddresses.find((item) => item.isDefault) || nextBillingAddresses[0] || null
    const profileFirstName = String(profile?.firstName || profile?.displayName || 'Customer').trim() || 'Customer'
    const profileCountry =
      String(profile?.country || defaultItem?.country || defaultShippingAddress?.country || 'Unknown').trim() ||
      'Unknown'

    setIsSaving(true)
    setError('')
    setSuccess('')
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...profile,
          firstName: profileFirstName,
          country: profileCountry,
          addresses: nextShippingAddresses,
          deliveryAddress: defaultShippingAddress
            ? {
                line1: defaultShippingAddress.line1 || '',
                line2: defaultShippingAddress.line2 || '',
                city: defaultShippingAddress.city || '',
                state: defaultShippingAddress.state || '',
                postalCode: defaultShippingAddress.postalCode || '',
                country: defaultShippingAddress.country || '',
              }
            : {
                line1: '',
                line2: '',
                city: '',
                state: '',
                postalCode: '',
                country: '',
              },
          billingAddresses: nextBillingAddresses,
          billingAddress: defaultBillingAddress
            ? {
                line1: defaultBillingAddress.line1 || '',
                line2: defaultBillingAddress.line2 || '',
                city: defaultBillingAddress.city || '',
                state: defaultBillingAddress.state || '',
                postalCode: defaultBillingAddress.postalCode || '',
                country: defaultBillingAddress.country || '',
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
        throw new Error(payload?.error || 'Unable to save addresses.')
      }
      setAddresses(nextShippingAddresses)
      setBillingAddresses(nextBillingAddresses)
      setProfile((prev) => ({
        ...(prev || {}),
        addresses: nextShippingAddresses,
        deliveryAddress: defaultShippingAddress
          ? {
              line1: defaultShippingAddress.line1 || '',
              line2: defaultShippingAddress.line2 || '',
              city: defaultShippingAddress.city || '',
              state: defaultShippingAddress.state || '',
              postalCode: defaultShippingAddress.postalCode || '',
              country: defaultShippingAddress.country || '',
            }
          : {
              line1: '',
              line2: '',
              city: '',
              state: '',
              postalCode: '',
              country: '',
            },
        billingAddresses: nextBillingAddresses,
        billingAddress: defaultBillingAddress
          ? {
              line1: defaultBillingAddress.line1 || '',
              line2: defaultBillingAddress.line2 || '',
              city: defaultBillingAddress.city || '',
              state: defaultBillingAddress.state || '',
              postalCode: defaultBillingAddress.postalCode || '',
              country: defaultBillingAddress.country || '',
            }
          : {
              line1: '',
              line2: '',
              city: '',
              state: '',
              postalCode: '',
              country: '',
            },
      }))
      setSuccess(
        type === 'billing' ? 'Billing addresses updated.' : 'Shipping addresses updated.',
      )
      pushAlert({
        type: 'success',
        title: 'Addresses',
        message: type === 'billing' ? 'Billing addresses updated.' : 'Shipping addresses updated.',
      })
    } catch (err) {
      const message =
        err?.message ||
        (type === 'billing' ? 'Unable to save billing addresses.' : 'Unable to save addresses.')
      setError(message)
      pushAlert({ type: 'error', title: 'Addresses', message })
    } finally {
      setIsSaving(false)
    }
  }

  const openNewAddressEditor = () => {
    setError('')
    setSuccess('')
    if (managedAddresses.length >= 5) {
      const message = 'You can only save up to 5 addresses. Remove one to add another.'
      setError(message)
      pushAlert({ type: 'error', title: 'Addresses', message })
      return
    }
    setEditingId('')
    const suggestion = getRandomAddressLabelSuggestion(managedAddresses.map((item) => item.label))
    setDraftLabelSuggestion(suggestion)
    setDraft({
      ...emptyAddress,
      id: createAddressId(),
      label: '',
      isDefault: managedAddresses.length === 0,
    })
    setIsEditorOpen(true)
  }

  const openEditAddressEditor = (address) => {
    setEditingId(address.id)
    setDraftLabelSuggestion(address.label || getRandomAddressLabelSuggestion())
    setDraft({ ...emptyAddress, ...address })
    setIsEditorOpen(true)
  }

  const closeEditor = () => {
    setIsEditorOpen(false)
    setEditingId('')
    setDraft(emptyAddress)
    setDraftLabelSuggestion('My home')
  }

  const updateDraft = (key, value) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const validateDraft = () => {
    if (!draft.line1.trim()) return 'Address line 1 is required.'
    if (!draft.city.trim()) return 'City is required.'
    if (!draft.country.trim()) return 'Country is required.'
    return ''
  }

  const handleSaveDraft = async () => {
    const validationMessage = validateDraft()
    if (validationMessage) {
      setError(validationMessage)
      pushAlert({ type: 'error', title: 'Addresses', message: validationMessage })
      return
    }

    const draftToSave = { ...draft, label: draft.label.trim() }

    const next = editingId
      ? managedAddresses.map((item) => (item.id === editingId ? draftToSave : item))
      : [...managedAddresses, draftToSave]

    const ensureDefault = draftToSave.isDefault
      ? next.map((item) => ({ ...item, isDefault: item.id === draftToSave.id }))
      : next
    await persistAddresses(ensureDefault, addressType)
    closeEditor()
  }

  const handleDeleteAddress = async (id) => {
    const next = managedAddresses.filter((item) => item.id !== id)
    await persistAddresses(next, addressType)
  }

  const setDefaultAddress = async (id) => {
    const next = managedAddresses.map((item) => ({
      ...item,
      isDefault: item.id === id,
    }))
    await persistAddresses(next, addressType)
  }

  if (isLoading) {
    return <div className='text-sm text-slate-500'>Loading addresses...</div>
  }

  return (
    <div className='relative min-h-[calc(100vh-220px)] space-y-5'>
      <section className='relative overflow-hidden rounded-2xl border border-slate-200 bg-[linear-gradient(145deg,#ffffff_0%,#f8fafc_58%,#f1f5f9_100%)] p-5 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.45)]'>
        <div className='pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-slate-200/70 blur-3xl' />
        <div className='pointer-events-none absolute -bottom-20 -left-20 h-52 w-52 rounded-full bg-slate-300/55 blur-3xl' />

        <div className='relative flex flex-wrap items-start justify-between gap-4'>
          <div>
            <h1 className='text-xl font-semibold text-slate-900'>Address book</h1>
            <p className='mt-1 text-sm text-slate-600'>
              Manage shipping and billing addresses for checkout.
            </p>
            <div className='mt-3 inline-flex rounded-xl border border-slate-200 bg-white p-1 text-xs font-semibold'>
              <button
                type='button'
                onClick={() => setAddressType('shipping')}
                className={`rounded-lg px-3 py-1.5 transition ${
                  addressType === 'shipping'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Shipping
              </button>
              <button
                type='button'
                onClick={() => setAddressType('billing')}
                className={`rounded-lg px-3 py-1.5 transition ${
                  addressType === 'billing'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Billing
              </button>
            </div>
            <div className='mt-3 inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600'>
              Saved: {managedAddresses.length} {managedAddresses.length === 1 ? 'address' : 'addresses'}
            </div>
          </div>
          <button
            type='button'
            onClick={openNewAddressEditor}
            className='inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-slate-800'
          >
            <svg
              className='h-4 w-4'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              aria-hidden='true'
            >
              <path strokeLinecap='round' strokeLinejoin='round' d='M12 5v14M5 12h14' />
            </svg>
            {addressType === 'billing' ? 'Add billing address' : 'Add new address'}
          </button>
        </div>
      </section>

      {error ? (
        <div className='rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700'>
          {error}
        </div>
      ) : null}
      {success ? (
        <div className='rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700'>
          {success}
        </div>
      ) : null}

      {!hasAnyAddress ? (
        <section className='rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm transition duration-300 hover:border-slate-400'>
          <div className='mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500'>
            <svg
              className='h-8 w-8'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.7'
              aria-hidden='true'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M12 20s6-6.6 6-10a6 6 0 1 0-12 0c0 3.4 6 10 6 10z'
              />
              <circle cx='12' cy='10' r='2.2' />
            </svg>
          </div>
          <h2 className='mt-4 text-lg font-semibold text-slate-900'>No address yet</h2>
          <p className='mt-1 text-sm text-slate-600'>
            {addressType === 'billing'
              ? 'Add your first billing address for payment details.'
              : 'Add your first delivery address to speed up checkout.'}
          </p>
          <button
            type='button'
            onClick={openNewAddressEditor}
            className='mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition duration-200 hover:bg-slate-800'
          >
            Create address
          </button>
        </section>
      ) : (
        <section className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
          {managedAddresses.map((item, index) => {
            const summary = formatAddressSummary(item)
            return (
              <article
                key={item.id}
                className={`group rounded-2xl border p-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md ${
                  item.isDefault
                    ? 'border-slate-900 bg-[linear-gradient(160deg,#ffffff_0%,#f8fafc_100%)]'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className='flex items-start justify-between gap-3'>
                  <div className='min-w-0'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <h3 className='truncate text-sm font-semibold text-slate-900'>
                        {item.label || `Address ${index + 1}`}
                      </h3>
                      {item.isDefault ? (
                        <span className='rounded-full bg-slate-900 px-2.5 py-0.5 text-[11px] font-semibold text-white'>
                          Default
                        </span>
                      ) : null}
                    </div>
                    <p className='mt-2 text-sm leading-6 text-slate-600'>
                      {summary || 'Address details not set.'}
                    </p>
                  </div>
                  <button
                    type='button'
                    onClick={() => setDefaultAddress(item.id)}
                    className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${
                      item.isDefault
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-300 bg-white text-transparent group-hover:border-slate-700'
                    }`}
                    aria-label='Set as default address'
                    title='Set as default address'
                  >
                    <svg
                      className='h-3.5 w-3.5'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='3'
                      aria-hidden='true'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        d='M5 12.5 10 17l9-9'
                      />
                    </svg>
                  </button>
                </div>

                <div className='mt-4 flex flex-wrap items-center gap-2'>
                  <button
                    type='button'
                    onClick={() => openEditAddressEditor(item)}
                    className='rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition duration-200 hover:border-slate-300 hover:bg-slate-50'
                  >
                    Edit
                  </button>
                  <button
                    type='button'
                    onClick={() => handleDeleteAddress(item.id)}
                    disabled={isSaving}
                    className='rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition duration-200 hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60'
                  >
                    Remove
                  </button>
                </div>
              </article>
            )
          })}
        </section>
      )}

      {isEditorOpen ? (
        <div className='fixed inset-x-0 bottom-0 top-[55px] z-[1000] overflow-y-auto bg-slate-900/55 p-4 backdrop-blur-sm'>
          <div className='mx-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl transition duration-300 max-h-[calc(100vh-6rem)] overflow-y-auto'>
            <div className='flex items-center justify-between gap-3'>
              <h2 className='text-lg font-semibold text-slate-900'>
                {editingId
                  ? addressType === 'billing'
                    ? 'Edit billing address'
                    : 'Edit address'
                  : addressType === 'billing'
                    ? 'Add billing address'
                    : 'Add new address'}
              </h2>
              <button
                type='button'
                onClick={closeEditor}
                className='inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition duration-200 hover:bg-slate-50'
                aria-label='Close editor'
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

            <div className='mt-4 grid grid-cols-1 gap-4 md:grid-cols-2'>
              <div className='md:col-span-2'>
                <label className='text-xs font-medium text-slate-500'>Address label</label>
                <input
                  type='text'
                  value={draft.label}
                  onChange={(event) => updateDraft('label', event.target.value)}
                  className={inputClassName}
                  placeholder={draftLabelSuggestion}
                />
              </div>
              <div>
                <label className='text-xs font-medium text-slate-500'>Address line 1*</label>
                <input
                  type='text'
                  value={draft.line1}
                  onChange={(event) => updateDraft('line1', event.target.value)}
                  className={inputClassName}
                  placeholder='Street address'
                />
              </div>
              <div>
                <label className='text-xs font-medium text-slate-500'>Address line 2</label>
                <input
                  type='text'
                  value={draft.line2}
                  onChange={(event) => updateDraft('line2', event.target.value)}
                  className={inputClassName}
                  placeholder='Apartment, suite'
                />
              </div>
              <div>
                <label className='text-xs font-medium text-slate-500'>City*</label>
                <input
                  type='text'
                  value={draft.city}
                  onChange={(event) => updateDraft('city', event.target.value)}
                  className={inputClassName}
                  placeholder='City'
                />
              </div>
              <div>
                <label className='text-xs font-medium text-slate-500'>State</label>
                <input
                  type='text'
                  value={draft.state}
                  onChange={(event) => updateDraft('state', event.target.value)}
                  className={inputClassName}
                  placeholder='State'
                />
              </div>
              <div>
                <label className='text-xs font-medium text-slate-500'>Postal code</label>
                <input
                  type='text'
                  value={draft.postalCode}
                  onChange={(event) => updateDraft('postalCode', event.target.value)}
                  className={inputClassName}
                  placeholder='Postal code'
                />
              </div>
              <div>
                <label className='text-xs font-medium text-slate-500'>Country*</label>
                <div className='mt-1 rounded-2xl border border-slate-100 bg-slate-50/60 p-2'>
                  <p className='text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500'>Ship to</p>
                  <div className='relative mt-1.5'>
                    <span className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 inline-flex h-5 w-5 overflow-hidden rounded-sm border border-slate-200'>
                      <span className='h-full w-1/3 bg-[#118647]' />
                      <span className='h-full w-1/3 bg-white' />
                      <span className='h-full w-1/3 bg-[#118647]' />
                    </span>
                    <select
                      value={draft.country}
                      onChange={(event) => updateDraft('country', event.target.value)}
                      className={countrySelectInputClass}
                    >
                      <option value=''>Select country</option>
                      {ACCEPTED_COUNTRIES.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                    <svg
                      className='pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600'
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
                  type='checkbox'
                  checked={draft.isDefault}
                  onChange={(event) => updateDraft('isDefault', event.target.checked)}
                  className='h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500'
                />
                Use as default address
              </label>
            </div>

            <div className='mt-5 flex flex-wrap items-center justify-end gap-2'>
              <button
                type='button'
                onClick={closeEditor}
                className='rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition duration-200 hover:border-slate-300 hover:bg-slate-50'
              >
                Cancel
              </button>
              <button
                type='button'
                onClick={handleSaveDraft}
                className='rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition duration-200 hover:bg-slate-800'
              >
                {editingId
                  ? addressType === 'billing'
                    ? 'Update billing address'
                    : 'Update address'
                  : addressType === 'billing'
                    ? 'Save billing address'
                    : 'Save address'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {defaultAddress ? (
        <div className='rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600'>
          {addressType === 'billing' ? 'Default billing address:' : 'Default for checkout:'}{' '}
          <span className='font-semibold text-slate-800'>{defaultAddress.label}</span>
        </div>
      ) : null}
    </div>
  )
}
