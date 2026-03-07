'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import AdminSidebar from '@/components/AdminSidebar'
import AdminDesktopHeader from '@/components/admin/AdminDesktopHeader'
import ProductImageLibraryModal from '../products/ProductImageLibraryModal.jsx'
import { normalizeOrderProtectionConfig, ORDER_PROTECTION_DEFAULTS } from '@/lib/order-protection/config'

const defaultCheckoutProgress = {
  enabled: true,
  standardFreeShippingThreshold: 50,
  expressFreeShippingThreshold: 100,
}

const EMPTY_FORM = {
  text: '',
  imageUrl: '',
  targetUrl: '',
  sortOrder: '0',
  isActive: true,
}

const sortItems = (items) =>
  [...items].sort((left, right) => {
    const orderDiff = Number(left?.sortOrder || 0) - Number(right?.sortOrder || 0)
    if (orderDiff !== 0) return orderDiff
    return String(left?.text || '').localeCompare(String(right?.text || ''))
  })

export default function ExtraPage() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingControls, setIsLoadingControls] = useState(true)
  const [isSavingCartShippingProgress, setIsSavingCartShippingProgress] = useState(false)
  const [isSavingOrderProtection, setIsSavingOrderProtection] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isImageLibraryOpen, setIsImageLibraryOpen] = useState(false)
  const [checkoutProgressForm, setCheckoutProgressForm] = useState({ ...defaultCheckoutProgress })
  const [orderProtectionForm, setOrderProtectionForm] = useState({
    ...ORDER_PROTECTION_DEFAULTS,
  })

  const isEditing = Boolean(editingId)

  const loadControls = async () => {
    setIsLoadingControls(true)

    try {
      const [shippingResponse, protectionResponse] = await Promise.all([
        fetch('/api/admin/cart-shipping-progress-settings', {
          cache: 'no-store',
          credentials: 'include',
        }),
        fetch('/api/admin/order-protection-settings', {
          cache: 'no-store',
          credentials: 'include',
        }),
      ])

      const shippingPayload = await shippingResponse.json().catch(() => null)
      const protectionPayload = await protectionResponse.json().catch(() => null)

      if (shippingResponse.ok) {
        setCheckoutProgressForm({
          enabled: shippingPayload?.enabled !== false,
          standardFreeShippingThreshold:
            Number(shippingPayload?.standardFreeShippingThreshold) >= 0
              ? Number(shippingPayload.standardFreeShippingThreshold)
              : defaultCheckoutProgress.standardFreeShippingThreshold,
          expressFreeShippingThreshold:
            Number(shippingPayload?.expressFreeShippingThreshold) >= 0
              ? Number(shippingPayload.expressFreeShippingThreshold)
              : defaultCheckoutProgress.expressFreeShippingThreshold,
        })
      } else {
        setCheckoutProgressForm({ ...defaultCheckoutProgress })
      }

      if (protectionResponse.ok) {
        setOrderProtectionForm(normalizeOrderProtectionConfig(protectionPayload))
      } else {
        setOrderProtectionForm({ ...ORDER_PROTECTION_DEFAULTS })
      }
    } catch {
      setCheckoutProgressForm({ ...defaultCheckoutProgress })
      setOrderProtectionForm({ ...ORDER_PROTECTION_DEFAULTS })
    } finally {
      setIsLoadingControls(false)
    }
  }

  const loadItems = async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/search-popular-items', {
        method: 'GET',
        cache: 'no-store',
        credentials: 'include',
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        setError(payload?.error || 'Unable to load popular right now items.')
        setItems([])
        return
      }
      setItems(sortItems(Array.isArray(payload?.items) ? payload.items : []))
    } catch {
      setError('Unable to load popular right now items.')
      setItems([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadItems()
    void loadControls()
  }, [])

  const activeCount = useMemo(
    () => items.filter((item) => item?.isActive).length,
    [items],
  )
  const selectedLibraryImages = useMemo(() => {
    if (!form.imageUrl) return []

    return [
      {
        id: form.imageUrl,
        url: form.imageUrl,
        title: form.text || 'Popular right now image',
      },
    ]
  }, [form.imageUrl, form.text])

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
  }

  const handleFieldChange = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const handleOpenImageLibrary = () => {
    setError('')
    setSuccessMessage('')
    setIsImageLibraryOpen(true)
  }

  const handleRemoveImage = () => {
    handleFieldChange('imageUrl', '')
  }

  const handleEdit = (item) => {
    setForm({
      text: item.text || '',
      imageUrl: item.imageUrl || '',
      targetUrl: item.targetUrl || '',
      sortOrder: String(item.sortOrder ?? 0),
      isActive: Boolean(item.isActive),
    })
    setEditingId(item.id)
    setError('')
    setSuccessMessage('')
  }

  const handleDelete = async (id) => {
    if (!id || !window.confirm('Delete this popular right now item?')) {
      return
    }

    setError('')
    setSuccessMessage('')

    try {
      const response = await fetch(`/api/admin/search-popular-items/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        setError(payload?.error || 'Unable to delete item.')
        return
      }

      setItems((current) => current.filter((item) => item.id !== id))
      if (editingId === id) {
        resetForm()
      }
      setSuccessMessage('Item deleted.')
    } catch {
      setError('Unable to delete item.')
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccessMessage('')
    setIsSaving(true)

    const payload = {
      text: form.text,
      imageUrl: form.imageUrl,
      targetUrl: form.targetUrl,
      sortOrder: Number(form.sortOrder || 0),
      isActive: Boolean(form.isActive),
    }

    try {
      const response = await fetch(
        isEditing
          ? `/api/admin/search-popular-items/${editingId}`
          : '/api/admin/search-popular-items',
        {
          method: isEditing ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(payload),
        },
      )
      const result = await response.json().catch(() => null)
      if (!response.ok) {
        setError(result?.error || 'Unable to save item.')
        return
      }

      const savedItem = result?.item
      if (!savedItem) {
        setError('Unable to save item.')
        return
      }

      setItems((current) =>
        sortItems(
          isEditing
            ? current.map((item) => (item.id === savedItem.id ? savedItem : item))
            : [...current, savedItem],
        ),
      )
      setSuccessMessage(isEditing ? 'Item updated.' : 'Item created.')
      resetForm()
    } catch {
      setError('Unable to save item.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleImageLibraryApply = ({ gallery }) => {
    const selected = Array.isArray(gallery) ? gallery[0] : null
    const nextImageUrl = String(selected?.url || '').trim()
    if (!nextImageUrl) return

    handleFieldChange('imageUrl', nextImageUrl)
    setIsImageLibraryOpen(false)
  }

  const saveCartShippingProgressSection = async () => {
    setError('')
    setSuccessMessage('')
    setIsSavingCartShippingProgress(true)

    try {
      const payload = {
        enabled: Boolean(checkoutProgressForm.enabled),
        standardFreeShippingThreshold: Math.max(
          0,
          Number(checkoutProgressForm.standardFreeShippingThreshold) || 0,
        ),
        expressFreeShippingThreshold: Math.max(
          0,
          Number(checkoutProgressForm.expressFreeShippingThreshold) || 0,
        ),
      }

      const response = await fetch('/api/admin/cart-shipping-progress-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to save shipping progress settings.')
      }

      setCheckoutProgressForm({
        enabled: data?.enabled !== false,
        standardFreeShippingThreshold: Number(data?.standardFreeShippingThreshold) || 0,
        expressFreeShippingThreshold: Number(data?.expressFreeShippingThreshold) || 0,
      })
      setSuccessMessage('Shipping progress settings saved.')
    } catch (saveError) {
      setError(saveError?.message || 'Unable to save shipping progress settings.')
    } finally {
      setIsSavingCartShippingProgress(false)
    }
  }

  const saveOrderProtectionSection = async () => {
    setError('')
    setSuccessMessage('')
    setIsSavingOrderProtection(true)

    try {
      const normalized = normalizeOrderProtectionConfig(orderProtectionForm)
      const response = await fetch('/api/admin/order-protection-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(normalized),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to save order protection settings.')
      }

      setOrderProtectionForm(normalizeOrderProtectionConfig(payload))
      setSuccessMessage('Order protection settings saved.')
    } catch (saveError) {
      setError(saveError?.message || 'Unable to save order protection settings.')
    } finally {
      setIsSavingOrderProtection(false)
    }
  }

  return (
    <div className='min-h-screen bg-slate-50 text-slate-900'>
      <div className='flex min-h-screen'>
        <div className='sticky top-0 self-start h-screen'>
          <AdminSidebar />
        </div>
        <main className='flex-1 px-4 pb-8 sm:px-6 lg:px-10'>
          <AdminDesktopHeader />
          <div className='mx-auto w-full max-w-7xl py-5'>
            <div className='flex flex-col gap-3 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between'>
              <div>
                <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>
                  Extra
                </p>
                <h1 className='mt-2 text-2xl font-semibold text-slate-900'>
                  Extra controls
                </h1>
                <p className='mt-2 max-w-2xl text-sm text-slate-500'>
                  Control shared storefront extras from one place, including popular search chips,
                  cart shipping progress, and order protection settings.
                </p>
              </div>

              <div className='grid grid-cols-2 gap-3 sm:w-auto'>
                <div className='rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm'>
                  <p className='text-xs font-medium uppercase tracking-[0.15em] text-slate-400'>
                    Total items
                  </p>
                  <p className='mt-2 text-2xl font-semibold text-slate-900'>{items.length}</p>
                </div>
                <div className='rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm'>
                  <p className='text-xs font-medium uppercase tracking-[0.15em] text-slate-400'>
                    Active now
                  </p>
                  <p className='mt-2 text-2xl font-semibold text-slate-900'>{activeCount}</p>
                </div>
              </div>
            </div>

            <div className='mt-6 grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]'>
              <section className='rounded-3xl border border-slate-200 bg-white p-5 shadow-sm'>
                <div className='flex items-center justify-between gap-3'>
                  <div>
                    <h2 className='text-lg font-semibold text-slate-900'>
                      {isEditing ? 'Edit item' : 'Add item'}
                    </h2>
                    <p className='mt-1 text-sm text-slate-500'>
                      Use an internal path like `/products?search=men` or a full `https://` URL.
                    </p>
                  </div>
                  {isEditing ? (
                    <button
                      type='button'
                      onClick={resetForm}
                      className='rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50'
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>

                <form className='mt-5 space-y-4' onSubmit={handleSubmit}>
                  <label className='block'>
                    <span className='text-sm font-medium text-slate-700'>Text</span>
                    <input
                      type='text'
                      value={form.text}
                      onChange={(event) => handleFieldChange('text', event.target.value)}
                      placeholder='high quality men clothes'
                      className='mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900'
                      maxLength={80}
                      required
                    />
                  </label>

                  <label className='block'>
                    <span className='text-sm font-medium text-slate-700'>Image URL</span>
                    <div className='mt-2 rounded-2xl border border-slate-200 p-3'>
                      <div className='flex flex-wrap items-center gap-2'>
                        <button
                          type='button'
                          onClick={handleOpenImageLibrary}
                          className='rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110'
                        >
                          {form.imageUrl ? 'Change image' : 'Select or upload image'}
                        </button>
                        {form.imageUrl ? (
                          <button
                            type='button'
                            onClick={handleRemoveImage}
                            className='rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50'
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>
                      <p className='mt-3 text-xs text-slate-500'>
                        Uses the existing component image library. You can pick an existing image or upload a new one from the modal.
                      </p>
                      <input type='hidden' value={form.imageUrl} required readOnly />
                    </div>
                  </label>

                  <label className='block'>
                    <span className='text-sm font-medium text-slate-700'>Destination URL</span>
                    <input
                      type='text'
                      value={form.targetUrl}
                      onChange={(event) => handleFieldChange('targetUrl', event.target.value)}
                      placeholder='/products?search=men'
                      className='mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900'
                      required
                    />
                  </label>

                  <div className='grid gap-4 sm:grid-cols-[140px_minmax(0,1fr)]'>
                    <label className='block'>
                      <span className='text-sm font-medium text-slate-700'>Sort order</span>
                      <input
                        type='number'
                        min='0'
                        max='9999'
                        value={form.sortOrder}
                        onChange={(event) => handleFieldChange('sortOrder', event.target.value)}
                        className='mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900'
                        required
                      />
                    </label>

                    <label className='flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700'>
                      <input
                        type='checkbox'
                        checked={form.isActive}
                        onChange={(event) => handleFieldChange('isActive', event.target.checked)}
                        className='h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900'
                      />
                      Show this item on the frontend
                    </label>
                  </div>

                  {form.imageUrl ? (
                    <div className='rounded-2xl border border-dashed border-slate-200 p-3'>
                      <p className='mb-3 text-xs font-medium uppercase tracking-[0.15em] text-slate-400'>
                        Preview
                      </p>
                      <div className='flex items-center gap-3 rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-700'>
                        <Image
                          src={form.imageUrl}
                          alt=''
                          width={36}
                          height={36}
                          className='h-9 w-9 rounded-full object-cover'
                          unoptimized
                        />
                        <span className='truncate'>{form.text || 'Popular right now item'}</span>
                      </div>
                    </div>
                  ) : null}

                  {error ? (
                    <div className='rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>
                      {error}
                    </div>
                  ) : null}

                  {successMessage ? (
                    <div className='rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700'>
                      {successMessage}
                    </div>
                  ) : null}

                  <button
                    type='submit'
                    disabled={isSaving}
                    className='inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60'
                  >
                    {isSaving ? 'Saving...' : isEditing ? 'Update item' : 'Add item'}
                  </button>
                </form>
              </section>

              <section className='rounded-3xl border border-slate-200 bg-white p-5 shadow-sm'>
                <div className='flex items-center justify-between gap-3'>
                  <div>
                    <h2 className='text-lg font-semibold text-slate-900'>Current items</h2>
                    <p className='mt-1 text-sm text-slate-500'>
                      These are the chips sent to the search menu on the storefront.
                    </p>
                  </div>
                </div>

                {isLoading ? (
                  <div className='mt-5 space-y-3'>
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={`extra-skeleton-${index}`}
                        className='h-20 animate-pulse rounded-2xl bg-slate-100'
                      />
                    ))}
                  </div>
                ) : items.length ? (
                  <div className='mt-5 space-y-3'>
                    {items.map((item) => (
                      <article
                        key={item.id}
                        className='flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between'
                      >
                        <div className='flex min-w-0 items-center gap-4'>
                          <Image
                            src={item.imageUrl}
                            alt=''
                            width={56}
                            height={56}
                            className='h-14 w-14 rounded-2xl object-cover'
                            unoptimized
                          />
                          <div className='min-w-0'>
                            <div className='flex flex-wrap items-center gap-2'>
                              <p className='truncate text-sm font-semibold text-slate-900'>
                                {item.text}
                              </p>
                              <span
                                className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                                  item.isActive
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {item.isActive ? 'Active' : 'Hidden'}
                              </span>
                            </div>
                            <p className='mt-1 truncate text-sm text-slate-500'>
                              {item.targetUrl}
                            </p>
                            <p className='mt-1 text-xs text-slate-400'>
                              Sort order: {item.sortOrder}
                            </p>
                          </div>
                        </div>

                        <div className='flex items-center gap-2'>
                          <button
                            type='button'
                            onClick={() => handleEdit(item)}
                            className='rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50'
                          >
                            Edit
                          </button>
                          <button
                            type='button'
                            onClick={() => handleDelete(item.id)}
                            className='rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50'
                          >
                            Delete
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className='mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500'>
                    No popular right now items yet.
                  </div>
                )}
              </section>
            </div>

            <div className='mt-6 grid gap-6 xl:grid-cols-2'>
              <section className='rounded-3xl border border-slate-200 bg-white p-5 shadow-sm'>
                <div className='flex items-start justify-between gap-4'>
                  <div>
                    <h2 className='text-lg font-semibold text-slate-900'>Cart shipping progress</h2>
                    <p className='mt-1 text-sm text-slate-500'>
                      Configure the standard and express free-shipping milestones shown in cart.
                    </p>
                  </div>
                </div>

                {isLoadingControls ? (
                  <div className='mt-5 space-y-3'>
                    <div className='h-12 animate-pulse rounded-2xl bg-slate-100' />
                    <div className='h-12 animate-pulse rounded-2xl bg-slate-100' />
                    <div className='h-12 animate-pulse rounded-2xl bg-slate-100' />
                  </div>
                ) : (
                  <div className='mt-5 space-y-4'>
                    <div className='grid gap-4 sm:grid-cols-2'>
                      <label className='block'>
                        <span className='text-sm font-medium text-slate-700'>
                          Standard free-shipping threshold
                        </span>
                        <input
                          className='mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900'
                          type='number'
                          min='0'
                          value={checkoutProgressForm.standardFreeShippingThreshold}
                          onChange={(event) =>
                            setCheckoutProgressForm((prev) => ({
                              ...prev,
                              standardFreeShippingThreshold: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <label className='block'>
                        <span className='text-sm font-medium text-slate-700'>
                          Express free-shipping threshold
                        </span>
                        <input
                          className='mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900'
                          type='number'
                          min='0'
                          value={checkoutProgressForm.expressFreeShippingThreshold}
                          onChange={(event) =>
                            setCheckoutProgressForm((prev) => ({
                              ...prev,
                              expressFreeShippingThreshold: event.target.value,
                            }))
                          }
                        />
                      </label>
                    </div>
                    <label className='flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700'>
                      <input
                        type='checkbox'
                        checked={Boolean(checkoutProgressForm.enabled)}
                        onChange={(event) =>
                          setCheckoutProgressForm((prev) => ({
                            ...prev,
                            enabled: event.target.checked,
                          }))
                        }
                        className='h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900'
                      />
                      Enable progress bar in cart
                    </label>
                    <button
                      type='button'
                      onClick={saveCartShippingProgressSection}
                      disabled={isSavingCartShippingProgress}
                      className='inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60'
                    >
                      {isSavingCartShippingProgress ? 'Saving...' : 'Save shipping progress settings'}
                    </button>
                  </div>
                )}
              </section>

              <section className='rounded-3xl border border-slate-200 bg-white p-5 shadow-sm'>
                <div className='flex items-start justify-between gap-4'>
                  <div>
                    <h2 className='text-lg font-semibold text-slate-900'>Order protection settings</h2>
                    <p className='mt-1 text-sm text-slate-500'>
                      Controls fee calculation and claim deadline for all shoppers.
                    </p>
                  </div>
                </div>

                {isLoadingControls ? (
                  <div className='mt-5 space-y-3'>
                    <div className='h-12 animate-pulse rounded-2xl bg-slate-100' />
                    <div className='h-12 animate-pulse rounded-2xl bg-slate-100' />
                    <div className='h-12 animate-pulse rounded-2xl bg-slate-100' />
                    <div className='h-12 animate-pulse rounded-2xl bg-slate-100' />
                  </div>
                ) : (
                  <div className='mt-5 grid gap-4 sm:grid-cols-2'>
                    <label className='block'>
                      <span className='text-sm font-medium text-slate-700'>
                        Protection percentage (0-1)
                      </span>
                      <input
                        className='mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900'
                        type='number'
                        min='0.001'
                        max='1'
                        step='0.001'
                        value={orderProtectionForm.percentage}
                        onChange={(event) =>
                          setOrderProtectionForm((prev) => ({
                            ...prev,
                            percentage: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className='block'>
                      <span className='text-sm font-medium text-slate-700'>
                        Claim window (hours)
                      </span>
                      <input
                        className='mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900'
                        type='number'
                        min='1'
                        max='720'
                        step='1'
                        value={orderProtectionForm.claimWindowHours}
                        onChange={(event) =>
                          setOrderProtectionForm((prev) => ({
                            ...prev,
                            claimWindowHours: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className='block'>
                      <span className='text-sm font-medium text-slate-700'>Minimum fee</span>
                      <input
                        className='mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900'
                        type='number'
                        min='0'
                        step='0.01'
                        value={orderProtectionForm.minimumFee}
                        onChange={(event) =>
                          setOrderProtectionForm((prev) => ({
                            ...prev,
                            minimumFee: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className='block'>
                      <span className='text-sm font-medium text-slate-700'>Maximum cap</span>
                      <input
                        className='mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900'
                        type='number'
                        min='0'
                        step='0.01'
                        value={orderProtectionForm.maximumFee}
                        onChange={(event) =>
                          setOrderProtectionForm((prev) => ({
                            ...prev,
                            maximumFee: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <div className='sm:col-span-2'>
                      <button
                        type='button'
                        onClick={saveOrderProtectionSection}
                        disabled={isSavingOrderProtection}
                        className='inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60'
                      >
                        {isSavingOrderProtection ? 'Saving...' : 'Save order protection settings'}
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        </main>
      </div>
      <ProductImageLibraryModal
        isOpen={isImageLibraryOpen}
        onClose={() => setIsImageLibraryOpen(false)}
        onApply={handleImageLibraryApply}
        selectedImages={selectedLibraryImages}
        maxSelection={1}
        listEndpoint='/api/admin/component-media'
        uploadEndpoint='/api/admin/component-media/upload'
        deleteEndpointBase='/api/admin/component-media'
        title='Component Image Library'
        zIndexClass='z-[80]'
        zIndex={4000}
      />
    </div>
  )
}
