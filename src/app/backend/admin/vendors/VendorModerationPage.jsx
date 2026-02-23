'use client'

import CustomSelect from '@/components/common/CustomSelect'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AdminSidebar from '@/components/AdminSidebar'
import AdminDesktopHeader from '@/components/admin/AdminDesktopHeader'
import { useAlerts } from '@/context/AlertContext'
import VendorTakeDownModal from './components/VendorTakeDownModal'
import VendorModerationSkeleton from './components/VendorModerationSkeleton'

const STATUS_OPTIONS = [
  { value: 'publish', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'archived', label: 'Archived' },
]

const TABS = [
  { id: 'products', label: 'Product controls' },
  { id: 'library', label: 'Library controls' },
  { id: 'messages', label: 'Seller messages' },
  { id: 'actions', label: 'Actions' },
]

const toDateLabel = (value) => {
  const date = new Date(value || '')
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const normalizeName = (vendor) =>
  String(vendor?.full_name || '').trim() || String(vendor?.email || '').trim() || 'Vendor'

const formatMetricValue = (value) => Math.max(0, Number(value) || 0).toLocaleString()

export default function VendorModerationPage() {
  const params = useParams()
  const router = useRouter()
  const { pushAlert } = useAlerts()
  const vendorId = Array.isArray(params?.vendorId) ? params.vendorId[0] : params?.vendorId

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [vendor, setVendor] = useState(null)
  const [products, setProducts] = useState([])
  const [media, setMedia] = useState([])
  const [activeTab, setActiveTab] = useState('products')
  const [visibleMediaCount, setVisibleMediaCount] = useState(10)
  const [productActionId, setProductActionId] = useState('')
  const [mediaActionId, setMediaActionId] = useState('')
  const [takeDownTarget, setTakeDownTarget] = useState(null)
  const [takeDownMode, setTakeDownMode] = useState('automatic')
  const [takeDownReason, setTakeDownReason] = useState('')
  const [messageTitle, setMessageTitle] = useState('')
  const [messageBody, setMessageBody] = useState('')
  const [isSendingMessage, setIsSendingMessage] = useState(false)

  const [settingsForm, setSettingsForm] = useState({
    useCustomMetrics: false,
    customFollowers: '0',
    customSold: '0',
    isTrustedVendor: false,
    requireProductReviewForPublish: false,
  })
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [isAccessActionLoading, setIsAccessActionLoading] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [isDeleteActionLoading, setIsDeleteActionLoading] = useState(false)

  const vendorDisplayName = useMemo(() => normalizeName(vendor), [vendor])
  const realProfileFollowers = Math.max(0, Number(vendor?.brand?.real_profile_followers) || 0)
  const realProfileSold = Math.max(0, Number(vendor?.brand?.real_profile_sold) || 0)
  const realProfileProducts = Math.max(0, Number(vendor?.brand?.real_profile_products) || 0)
  const displayedMedia = useMemo(
    () => (Array.isArray(media) ? media.slice(0, visibleMediaCount) : []),
    [media, visibleMediaCount],
  )
  const hasMoreMedia = displayedMedia.length < media.length

  const sendMessage = async ({
    title,
    message,
    severity = 'info',
    type = 'admin_message',
    entityType,
    entityId,
  }) => {
    if (!vendorId) throw new Error('Vendor id is missing.')
    const response = await fetch(`/api/admin/vendors/${vendorId}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        title,
        message,
        severity,
        type,
        entity_type: entityType,
        entity_id: entityId,
      }),
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) throw new Error(payload?.error || 'Unable to send message.')
  }

  const loadVendor = async () => {
    if (!vendorId) return
    setIsLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/vendors/${vendorId}`, {
        cache: 'no-store',
        credentials: 'include',
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to load vendor workspace.')

      const nextVendor = payload?.vendor || null
      setVendor(nextVendor)
      setProducts(Array.isArray(payload?.products) ? payload.products : [])
      setMedia(Array.isArray(payload?.media) ? payload.media : [])
      setVisibleMediaCount(10)
      setMessageTitle(`Update from admin for ${normalizeName(nextVendor)}`)
      setSettingsForm({
        useCustomMetrics: Boolean(nextVendor?.brand?.use_custom_profile_metrics),
        customFollowers: String(Math.max(0, Number(nextVendor?.brand?.custom_profile_followers) || 0)),
        customSold: String(Math.max(0, Number(nextVendor?.brand?.custom_profile_sold) || 0)),
        isTrustedVendor: Boolean(nextVendor?.brand?.is_trusted_vendor),
        requireProductReviewForPublish: Boolean(nextVendor?.brand?.require_product_review_for_publish),
      })
      setDeleteConfirmation('')
    } catch (loadError) {
      const nextError = loadError?.message || 'Unable to load vendor workspace.'
      setVendor(null)
      setProducts([])
      setMedia([])
      setError(nextError)
      pushAlert({ type: 'error', title: 'Vendor moderation', message: nextError })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadVendor()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId])

  const updateProductStatus = async (
    product,
    nextStatus,
    notificationOptions = { enabled: false, mode: 'automatic', reason: '' },
  ) => {
    if (!product?.id || !nextStatus || productActionId) return
    setProductActionId(String(product.id))
    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: nextStatus }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to update product status.')

      setProducts((prev) =>
        prev.map((item) =>
          String(item?.id || '') === String(product.id)
            ? { ...item, status: nextStatus, updated_at: new Date().toISOString() }
            : item,
        ),
      )

      if (notificationOptions?.enabled) {
        const productName = String(product?.name || 'A product')
        const customReason = String(notificationOptions?.reason || '').trim()
        const automaticNote =
          nextStatus === 'archived'
            ? `${productName} was removed.\nReview and update the product before republishing, or contact support for help.`
            : `${productName} status was updated by admin to "${nextStatus}".`
        const note = notificationOptions?.mode === 'custom' && customReason ? customReason : automaticNote
        await sendMessage({
          title: nextStatus === 'archived' ? `Product taken down: ${productName}` : `Product moderation update: ${productName}`,
          message: note,
          severity: nextStatus === 'archived' ? 'warning' : 'info',
          type: 'product_moderation',
          entityType: 'product',
          entityId: String(product.id),
        })
      }

      pushAlert({
        type: 'success',
        title: 'Product updated',
        message: `${String(product?.name || 'Product')} updated.`,
      })
    } catch (actionError) {
      pushAlert({
        type: 'error',
        title: 'Product update failed',
        message: actionError?.message || 'Unable to update product.',
      })
    } finally {
      setProductActionId('')
    }
  }

  const removeMedia = async (item) => {
    if (!item?.id || mediaActionId) return
    setMediaActionId(String(item.id))
    try {
      const response = await fetch(`/api/admin/media/${item.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to remove media.')
      setMedia((prev) => prev.filter((entry) => String(entry?.id || '') !== String(item.id)))
      pushAlert({ type: 'success', title: 'Library updated', message: 'Library item removed.' })
    } catch (removeError) {
      pushAlert({
        type: 'error',
        title: 'Library update failed',
        message: removeError?.message || 'Unable to remove media.',
      })
    } finally {
      setMediaActionId('')
    }
  }

  const openTakeDownDialog = (product) => {
    setTakeDownTarget(product || null)
    setTakeDownMode('automatic')
    setTakeDownReason('')
  }

  const closeTakeDownDialog = () => {
    if (productActionId) return
    setTakeDownTarget(null)
    setTakeDownMode('automatic')
    setTakeDownReason('')
  }

  const confirmTakeDown = async () => {
    if (!takeDownTarget?.id || productActionId) return
    await updateProductStatus(takeDownTarget, 'archived', {
      enabled: true,
      mode: takeDownMode,
      reason: takeDownReason,
    })
    setTakeDownTarget(null)
    setTakeDownMode('automatic')
    setTakeDownReason('')
  }

  const handleCustomMessage = async (event) => {
    event.preventDefault()
    if (!messageTitle.trim() || !messageBody.trim() || isSendingMessage) return
    setIsSendingMessage(true)
    try {
      await sendMessage({
        title: messageTitle.trim(),
        message: messageBody.trim(),
        severity: 'info',
        type: 'admin_custom_message',
        entityType: 'vendor',
        entityId: String(vendorId || ''),
      })
      setMessageBody('')
      pushAlert({ type: 'success', title: 'Message sent', message: 'Custom message sent to seller.' })
    } catch (sendError) {
      pushAlert({ type: 'error', title: 'Message failed', message: sendError?.message || 'Unable to send custom message.' })
    } finally {
      setIsSendingMessage(false)
    }
  }

  const handleSaveSettings = async (event) => {
    event.preventDefault()
    if (!vendor?.brand?.id || isSavingSettings) return
    setIsSavingSettings(true)
    try {
      const response = await fetch(`/api/admin/vendors/${vendorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          use_custom_profile_metrics: settingsForm.useCustomMetrics,
          custom_profile_followers: Math.max(0, Number(settingsForm.customFollowers) || 0),
          custom_profile_sold: Math.max(0, Number(settingsForm.customSold) || 0),
          is_trusted_vendor: settingsForm.isTrustedVendor,
          require_product_review_for_publish: settingsForm.requireProductReviewForPublish,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to save action settings.')
      pushAlert({ type: 'success', title: 'Saved', message: 'Vendor action settings updated.' })
      await loadVendor()
    } catch (saveError) {
      pushAlert({ type: 'error', title: 'Save failed', message: saveError?.message || 'Unable to save action settings.' })
    } finally {
      setIsSavingSettings(false)
    }
  }

  const runAccessAction = async (action) => {
    if (isAccessActionLoading || isDeleteActionLoading) return
    setIsAccessActionLoading(true)
    try {
      const response = await fetch(`/api/admin/vendors/${vendorId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Action failed.')
      pushAlert({
        type: 'success',
        title: action === 'deactivate' ? 'Vendor deactivated' : 'Vendor reactivated',
        message: action === 'deactivate' ? 'Vendor access is now deactivated.' : 'Vendor access is now active.',
      })
      setVendor((prev) =>
        prev
          ? { ...prev, role: action === 'deactivate' ? 'customer' : 'vendor', access_state: action === 'deactivate' ? 'deactivated' : 'active' }
          : prev,
      )
    } catch (accessError) {
      pushAlert({ type: 'error', title: 'Action failed', message: accessError?.message || 'Unable to update vendor access.' })
    } finally {
      setIsAccessActionLoading(false)
    }
  }

  const handleDeleteVendor = async () => {
    if (isDeleteActionLoading || isAccessActionLoading) return
    setIsDeleteActionLoading(true)
    try {
      const response = await fetch(`/api/admin/vendors/${vendorId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'delete_user',
          confirmation: deleteConfirmation,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to delete vendor account.')
      pushAlert({ type: 'success', title: 'Vendor deleted', message: 'Vendor account and related data were removed.' })
      router.push('/backend/admin/brands')
    } catch (deleteError) {
      pushAlert({ type: 'error', title: 'Delete failed', message: deleteError?.message || 'Unable to delete vendor account.' })
    } finally {
      setIsDeleteActionLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-[#f5f7fb] text-slate-900'>
      <div className='flex min-h-screen'>
        <AdminSidebar />
        <main className='flex-1 px-4 pb-6 sm:px-6 lg:px-10'>
          <AdminDesktopHeader />
          <div className='mx-auto w-full max-w-6xl'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <div>
                <p className='text-xs font-semibold uppercase tracking-[0.22em] text-slate-400'>Vendor moderation</p>
                <h1 className='mt-2 text-2xl font-semibold text-slate-900'>{vendorDisplayName}</h1>
                <p className='mt-1 text-sm text-slate-500'>Control products, library assets, seller notifications, and account actions.</p>
              </div>
              <Link
                href='/backend/admin/brands'
                className='inline-flex h-10 items-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50'
              >
                Back to vendors
              </Link>
            </div>

            {isLoading ? <VendorModerationSkeleton /> : null}
            {!isLoading && error ? <p className='mt-6 text-sm text-rose-600'>{error}</p> : null}

            {!isLoading && !error && vendor ? (
              <>
                <section className='mobile-full-bleed mt-6 rounded-none border border-x-0 border-slate-200 bg-white p-5 sm:rounded-2xl sm:border-x'>
                  <div className='flex flex-wrap items-center gap-4'>
                    {vendor?.brand?.logo_url ? (
                      <img
                        src={vendor.brand.logo_url}
                        alt={vendor.brand.name || vendorDisplayName}
                        className='h-14 w-14 rounded-full border border-slate-200 object-cover'
                      />
                    ) : (
                      <div className='flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-lg font-semibold text-slate-700'>
                        {vendorDisplayName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className='min-w-0'>
                      <p className='text-sm font-semibold text-slate-900'>{vendorDisplayName}</p>
                      <p className='text-xs text-slate-500'>{vendor?.email || '--'}</p>
                      <p className='text-xs text-slate-500'>
                        Brand: {vendor?.brand?.name || '--'} {vendor?.brand?.slug ? `(@${vendor.brand.slug})` : ''}
                      </p>
                    </div>
                  </div>
                </section>

                <section className='mobile-full-bleed mt-6 rounded-none border border-x-0 border-slate-200 bg-white p-5 sm:rounded-2xl sm:border-x'>
                  <div className='mb-4 flex flex-wrap items-center gap-2'>
                    {TABS.map((tab) => (
                      <button
                        key={tab.id}
                        type='button'
                        onClick={() => setActiveTab(tab.id)}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                          activeTab === tab.id
                            ? 'bg-slate-900 text-white'
                            : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {activeTab === 'products' ? (
                    <>
                      <div className='mb-4 flex items-center justify-between'>
                        <h2 className='text-lg font-semibold text-slate-900'>Product controls</h2>
                        <span className='text-xs text-slate-500'>{products.length} products</span>
                      </div>
                      {!products.length ? (
                        <p className='text-sm text-slate-500'>No vendor products found.</p>
                      ) : (
                        <div className='space-y-3'>
                          {products.map((product) => {
                            const isBusy = productActionId === String(product.id)
                            return (
                              <article key={product.id} className='rounded-xl border border-slate-200 px-4 py-3'>
                                <div className='flex flex-wrap items-center justify-between gap-3'>
                                  <div>
                                    <p className='text-sm font-semibold text-slate-900'>{product.name || '--'}</p>
                                    <p className='text-xs text-slate-500'>
                                      Status: {product.status || '--'} • Updated {toDateLabel(product.updated_at || product.created_at)}
                                    </p>
                                  </div>
                                  <div className='flex flex-wrap items-center gap-2'>
                                    <CustomSelect
                                      value={String(product.status || 'draft')}
                                      onChange={(event) =>
                                        updateProductStatus(product, event.target.value, { enabled: false })
                                      }
                                      disabled={isBusy}
                                      className='h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700'
                                    >
                                      {STATUS_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </CustomSelect>
                                    <button
                                      type='button'
                                      onClick={() => openTakeDownDialog(product)}
                                      disabled={isBusy}
                                      className='h-9 rounded-lg border border-rose-300 bg-rose-50 px-3 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60'
                                    >
                                      Take down + notify
                                    </button>
                                    <Link
                                      href={`/backend/admin/products/${encodeURIComponent(String(product.id || ''))}`}
                                      className='inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50'
                                    >
                                      Edit
                                    </Link>
                                  </div>
                                </div>
                              </article>
                            )
                          })}
                        </div>
                      )}
                    </>
                  ) : null}

                  {activeTab === 'library' ? (
                    <>
                      <div className='mb-4 flex items-center justify-between'>
                        <h2 className='text-lg font-semibold text-slate-900'>Vendor library controls</h2>
                        <span className='text-xs text-slate-500'>{media.length} media items</span>
                      </div>
                      {!media.length ? (
                        <p className='text-sm text-slate-500'>No media items found for this seller.</p>
                      ) : (
                        <>
                          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
                            {displayedMedia.map((item) => {
                              const isBusy = mediaActionId === String(item.id)
                              return (
                                <article key={item.id} className='overflow-hidden rounded-xl border border-slate-200'>
                                  <div className='aspect-video w-full bg-slate-100'>
                                    {item.url ? (
                                      <img src={item.url} alt={item.alt_text || 'Vendor media'} className='h-full w-full object-cover' />
                                    ) : null}
                                  </div>
                                  <div className='space-y-2 p-3'>
                                    <p className='truncate text-xs text-slate-500'>Uploaded {toDateLabel(item.created_at)}</p>
                                    <button
                                      type='button'
                                      onClick={() => removeMedia(item)}
                                      disabled={isBusy}
                                      className='inline-flex h-8 items-center rounded-md border border-rose-300 bg-rose-50 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60'
                                    >
                                      {isBusy ? 'Removing...' : 'Remove from library'}
                                    </button>
                                  </div>
                                </article>
                              )
                            })}
                          </div>
                          {hasMoreMedia ? (
                            <div className='mt-4 flex justify-center'>
                              <button
                                type='button'
                                onClick={() => setVisibleMediaCount((prev) => prev + 10)}
                                className='h-10 rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50'
                              >
                                View more
                              </button>
                            </div>
                          ) : null}
                        </>
                      )}
                    </>
                  ) : null}

                  {activeTab === 'messages' ? (
                    <>
                      <h2 className='text-lg font-semibold text-slate-900'>Send custom message to seller</h2>
                      <p className='mt-1 text-sm text-slate-500'>Use this for manual moderation notes and vendor guidance.</p>
                      <form onSubmit={handleCustomMessage} className='mt-4 space-y-3'>
                        <input
                          value={messageTitle}
                          onChange={(event) => setMessageTitle(event.target.value)}
                          placeholder='Message title'
                          className='h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-800'
                          maxLength={120}
                          required
                        />
                        <textarea
                          value={messageBody}
                          onChange={(event) => setMessageBody(event.target.value)}
                          placeholder='Write your message to the seller...'
                          className='min-h-28 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800'
                          maxLength={1000}
                          required
                        />
                        <button
                          type='submit'
                          disabled={isSendingMessage}
                          className='inline-flex h-10 items-center rounded-full bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-70'
                        >
                          {isSendingMessage ? 'Sending...' : 'Send message'}
                        </button>
                      </form>
                    </>
                  ) : null}

                  {activeTab === 'actions' ? (
                    <div className='space-y-6'>
                      <div className='rounded-xl border border-slate-200 bg-slate-50/60 p-4'>
                        <h2 className='text-base font-semibold text-slate-900'>Real profile metrics</h2>
                        <p className='mt-1 text-xs text-slate-500'>
                          This shows the current real numbers from your platform data.
                        </p>
                        <div className='mt-3 grid gap-3 sm:grid-cols-3'>
                          <div className='rounded-lg border border-slate-200 bg-white px-3 py-2'>
                            <p className='text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400'>Real followers</p>
                            <p className='mt-1 text-lg font-semibold text-slate-900'>{formatMetricValue(realProfileFollowers)}</p>
                          </div>
                          <div className='rounded-lg border border-slate-200 bg-white px-3 py-2'>
                            <p className='text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400'>Real sold</p>
                            <p className='mt-1 text-lg font-semibold text-slate-900'>{formatMetricValue(realProfileSold)}</p>
                          </div>
                          <div className='rounded-lg border border-slate-200 bg-white px-3 py-2'>
                            <p className='text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400'>Real products</p>
                            <p className='mt-1 text-lg font-semibold text-slate-900'>{formatMetricValue(realProfileProducts)}</p>
                          </div>
                        </div>
                      </div>

                      <div className='rounded-xl border border-slate-200 p-4'>
                        <h2 className='text-base font-semibold text-slate-900'>Storefront data controls</h2>
                        <p className='mt-1 text-xs text-slate-500'>Set custom prop values for followers and sold when needed.</p>

                        <form onSubmit={handleSaveSettings} className='mt-4 space-y-4'>
                          <label className='flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2'>
                            <span className='text-sm font-semibold text-slate-700'>Use custom profile metrics</span>
                            <input
                              type='checkbox'
                              checked={settingsForm.useCustomMetrics}
                              onChange={(event) =>
                                setSettingsForm((prev) => ({ ...prev, useCustomMetrics: event.target.checked }))
                              }
                            />
                          </label>

                          <div className='grid gap-3 sm:grid-cols-2'>
                            <label className='space-y-1'>
                              <span className='text-xs font-semibold uppercase tracking-[0.14em] text-slate-400'>Custom followers</span>
                              <input
                                type='number'
                                min='0'
                                value={settingsForm.customFollowers}
                                onChange={(event) =>
                                  setSettingsForm((prev) => ({ ...prev, customFollowers: event.target.value }))
                                }
                                className='h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-800'
                              />
                            </label>
                            <label className='space-y-1'>
                              <span className='text-xs font-semibold uppercase tracking-[0.14em] text-slate-400'>Custom sold</span>
                              <input
                                type='number'
                                min='0'
                                value={settingsForm.customSold}
                                onChange={(event) =>
                                  setSettingsForm((prev) => ({ ...prev, customSold: event.target.value }))
                                }
                                className='h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-800'
                              />
                            </label>
                          </div>

                          <label className='flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2'>
                            <span className='text-sm font-semibold text-slate-700'>Verification enabled</span>
                            <input
                              type='checkbox'
                              checked={settingsForm.isTrustedVendor}
                              onChange={(event) =>
                                setSettingsForm((prev) => ({ ...prev, isTrustedVendor: event.target.checked }))
                              }
                            />
                          </label>

                          <label className='flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2'>
                            <span className='text-sm font-semibold text-slate-700'>Require admin review before publish</span>
                            <input
                              type='checkbox'
                              checked={settingsForm.requireProductReviewForPublish}
                              onChange={(event) =>
                                setSettingsForm((prev) => ({
                                  ...prev,
                                  requireProductReviewForPublish: event.target.checked,
                                }))
                              }
                            />
                          </label>

                          <button
                            type='submit'
                            disabled={isSavingSettings}
                            className='h-10 rounded-full bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-70'
                          >
                            {isSavingSettings ? 'Saving...' : 'Save action settings'}
                          </button>
                        </form>
                      </div>

                      <div className='rounded-xl border border-amber-200 bg-amber-50/50 p-4'>
                        <h3 className='text-base font-semibold text-slate-900'>Vendor access</h3>
                        <p className='mt-1 text-xs text-slate-600'>
                          Current state: <span className='font-semibold'>{String(vendor?.access_state || 'active')}</span>
                        </p>
                        <div className='mt-3'>
                          {String(vendor?.access_state || 'active') === 'active' ? (
                            <button
                              type='button'
                              onClick={() => runAccessAction('deactivate')}
                              disabled={isAccessActionLoading}
                              className='h-9 rounded-full border border-amber-300 bg-amber-100 px-4 text-sm font-semibold text-amber-800 hover:bg-amber-200 disabled:opacity-60'
                            >
                              {isAccessActionLoading ? 'Processing...' : 'Deactivate vendor account'}
                            </button>
                          ) : (
                            <button
                              type='button'
                              onClick={() => runAccessAction('reactivate')}
                              disabled={isAccessActionLoading}
                              className='h-9 rounded-full border border-emerald-300 bg-emerald-100 px-4 text-sm font-semibold text-emerald-800 hover:bg-emerald-200 disabled:opacity-60'
                            >
                              {isAccessActionLoading ? 'Processing...' : 'Reactivate vendor account'}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className='rounded-xl border border-rose-300 bg-rose-50/50 p-4'>
                        <h3 className='text-base font-semibold text-rose-900'>Red zone</h3>
                        <p className='mt-1 text-xs text-rose-700'>
                          Deleting this user removes vendor account data (products, library, notifications, and linked vendor records).
                        </p>
                        <label className='mt-3 block space-y-1'>
                          <span className='text-xs font-semibold uppercase tracking-[0.14em] text-rose-500'>Type DELETE to confirm</span>
                          <input
                            type='text'
                            value={deleteConfirmation}
                            onChange={(event) => setDeleteConfirmation(event.target.value)}
                            className='h-10 w-full rounded-lg border border-rose-300 bg-white px-3 text-sm text-slate-800'
                            placeholder='DELETE'
                          />
                        </label>
                        <button
                          type='button'
                          onClick={handleDeleteVendor}
                          disabled={isDeleteActionLoading || String(deleteConfirmation || '').trim() !== 'DELETE'}
                          className='mt-3 h-10 rounded-full bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-60'
                        >
                          {isDeleteActionLoading ? 'Deleting user...' : 'Delete user account'}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </section>
              </>
            ) : null}
          </div>
        </main>
      </div>

      <VendorTakeDownModal
        open={Boolean(takeDownTarget)}
        productName={String(takeDownTarget?.name || '')}
        mode={takeDownMode}
        reason={takeDownReason}
        isSubmitting={Boolean(productActionId)}
        onModeChange={setTakeDownMode}
        onReasonChange={setTakeDownReason}
        onClose={closeTakeDownDialog}
        onConfirm={confirmTakeDown}
      />
    </div>
  )
}
