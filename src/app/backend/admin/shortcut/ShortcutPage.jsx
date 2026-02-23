'use client'

import CustomSelect from '@/components/common/CustomSelect'
import { useEffect, useState } from 'react'
import AdminSidebar from '@/components/AdminSidebar'
import AdminDesktopHeader from '@/components/admin/AdminDesktopHeader'
import { PRODUCT_CONDITION_OPTIONS } from '@/lib/admin/product-conditions'
import { PRODUCT_PACKAGING_OPTIONS } from '@/lib/admin/product-packaging'
import { PRODUCT_RETURN_POLICY_OPTIONS } from '@/lib/admin/product-returns'
import ProductCategorySelector from '../products/ProductCategorySelector'
import ProductTagSelector from '../products/ProductTagSelector'

const inputClass =
  'h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400'
const labelClass = 'mb-1.5 block text-xs font-semibold text-slate-500'

const buildSafeProfilePayload = (profile, patch = {}) => {
  const base = profile && typeof profile === 'object' ? profile : {}
  const contactInfo = base.contactInfo && typeof base.contactInfo === 'object' ? base.contactInfo : {}
  return {
    ...base,
    firstName: String(base.firstName || '').trim() || 'User',
    country: String(base.country || base.location || 'Nigeria').trim() || 'Nigeria',
    contactInfo,
    ...patch,
  }
}

const normalizeIdArray = (value) =>
  Array.isArray(value)
    ? value.map((item) => String(item || '').trim()).filter(Boolean)
    : []

export default function ShortcutPage() {
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingShortcutCategories, setIsLoadingShortcutCategories] = useState(false)
  const [isLoadingShortcutTags, setIsLoadingShortcutTags] = useState(false)
  const [isSavingShortcuts, setIsSavingShortcuts] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [shortcutCategories, setShortcutCategories] = useState([])
  const [shortcutTags, setShortcutTags] = useState([])
  const [shortcutsForm, setShortcutsForm] = useState({
    enabled: true,
    defaultTagIds: [],
    defaultCategoryIds: [],
    conditionCheck: '',
    packagingStyle: '',
    returnPolicy: '',
  })

  const redirectToSignIn = () => {
    if (typeof window === 'undefined') return
    window.location.href = '/login?next=/backend/admin/shortcut'
  }

  const shouldRedirectForAuthFailure = (status) => status === 401 || status === 403

  const loadProfile = async () => {
    setIsLoading(true)
    setError('')
    try {
      const response = await fetch('/api/user/profile', {
        cache: 'no-store',
        credentials: 'include',
      })
      if (shouldRedirectForAuthFailure(response.status)) {
        redirectToSignIn()
        return
      }
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to load shortcut defaults.')

      const nextProfile = payload?.profile && typeof payload.profile === 'object' ? payload.profile : {}
      const shortcutDefaults = nextProfile?.shortcuts?.productDefaults || {}
      const defaultTagIds = normalizeIdArray(shortcutDefaults.defaultTagIds)
      const defaultCategoryIds = normalizeIdArray(shortcutDefaults.defaultCategoryIds)
      setProfile(nextProfile)
      setShortcutsForm({
        enabled: shortcutDefaults.enabled !== false,
        defaultTagIds:
          defaultTagIds.length > 0
            ? defaultTagIds
            : String(shortcutDefaults.defaultTagId || '').trim()
              ? [String(shortcutDefaults.defaultTagId || '').trim()]
              : [],
        defaultCategoryIds:
          defaultCategoryIds.length > 0
            ? defaultCategoryIds
            : String(shortcutDefaults.defaultCategoryId || '').trim()
              ? [String(shortcutDefaults.defaultCategoryId || '').trim()]
              : [],
        conditionCheck: String(shortcutDefaults.conditionCheck || '').trim(),
        packagingStyle: String(shortcutDefaults.packagingStyle || '').trim(),
        returnPolicy: String(shortcutDefaults.returnPolicy || '').trim(),
      })
    } catch (loadError) {
      setError(loadError?.message || 'Unable to load shortcut defaults.')
    } finally {
      setIsLoading(false)
    }
  }

  const loadShortcutCategories = async () => {
    setIsLoadingShortcutCategories(true)
    try {
      const params = new URLSearchParams({ limit: '500' })
      const response = await fetch(`/api/admin/categories/tree?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      })
      if (shouldRedirectForAuthFailure(response.status)) {
        redirectToSignIn()
        return
      }
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to load categories.')
      const items = Array.isArray(payload?.items) ? payload.items : []
      setShortcutCategories(items)
    } catch (_loadError) {
      setShortcutCategories([])
    } finally {
      setIsLoadingShortcutCategories(false)
    }
  }

  const loadShortcutTags = async () => {
    setIsLoadingShortcutTags(true)
    try {
      const params = new URLSearchParams({ page: '1', per_page: '50' })
      const response = await fetch(`/api/admin/tags?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      })
      if (shouldRedirectForAuthFailure(response.status)) {
        redirectToSignIn()
        return
      }
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to load tags.')
      const items = Array.isArray(payload?.items) ? payload.items : []
      setShortcutTags(items)
    } catch (_loadError) {
      setShortcutTags([])
    } finally {
      setIsLoadingShortcutTags(false)
    }
  }

  useEffect(() => {
    loadProfile()
    loadShortcutCategories()
    loadShortcutTags()
  }, [])

  const saveShortcutsSection = async () => {
    setError('')
    setSuccess('')
    setIsSavingShortcuts(true)
    try {
      const currentProfile = buildSafeProfilePayload(profile)
      const payload = buildSafeProfilePayload(currentProfile, {
        shortcuts: {
          ...(currentProfile?.shortcuts && typeof currentProfile.shortcuts === 'object'
            ? currentProfile.shortcuts
            : {}),
          productDefaults: {
            enabled: Boolean(shortcutsForm.enabled),
            defaultTagIds: normalizeIdArray(shortcutsForm.defaultTagIds),
            defaultTagId: String(shortcutsForm.defaultTagIds?.[0] || '').trim(),
            defaultCategoryIds: normalizeIdArray(shortcutsForm.defaultCategoryIds),
            defaultCategoryId: String(shortcutsForm.defaultCategoryIds?.[0] || '').trim(),
            conditionCheck: String(shortcutsForm.conditionCheck || '').trim(),
            packagingStyle: String(shortcutsForm.packagingStyle || '').trim(),
            returnPolicy: String(shortcutsForm.returnPolicy || '').trim(),
          },
        },
      })
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      if (shouldRedirectForAuthFailure(response.status)) {
        redirectToSignIn()
        return
      }
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error || 'Unable to save shortcut defaults.')
      setProfile(result?.profile || payload)
      setSuccess('Shortcut defaults saved.')
    } catch (saveError) {
      setError(saveError?.message || 'Unable to save shortcut defaults.')
    } finally {
      setIsSavingShortcuts(false)
    }
  }

  return (
    <div className='min-h-screen bg-[#f6f7f9] text-slate-900'>
      <div className='flex min-h-screen'>
        <AdminSidebar />
        <main className='flex-1 px-4 pb-6 pt-0 sm:px-6 lg:px-10'>
          <AdminDesktopHeader />
          <div className='mx-auto w-full max-w-6xl space-y-6'>
            <section className='px-3 sm:px-1'>
              <h1 className='text-[34px] font-semibold tracking-tight text-slate-900'>Shortcut</h1>
              <p className='mt-2 text-sm text-slate-500'>
                Set default selections for this user so new products are prefilled automatically.
              </p>
            </section>

            {error ? <p className='rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>{error}</p> : null}
            {success ? <p className='rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700'>{success}</p> : null}

            <section className='space-y-5'>
              {isLoading ? (
                <div className='space-y-4'>
                  <div className='h-12 w-full animate-pulse rounded-xl bg-slate-200/85' />
                  <div className='grid gap-4 sm:grid-cols-2'>
                    <div className='h-12 w-full animate-pulse rounded-xl bg-slate-200/75' />
                    <div className='h-12 w-full animate-pulse rounded-xl bg-slate-200/75' />
                    <div className='h-12 w-full animate-pulse rounded-xl bg-slate-200/75' />
                    <div className='h-12 w-full animate-pulse rounded-xl bg-slate-200/75' />
                  </div>
                  <div className='h-10 w-44 animate-pulse rounded-xl bg-slate-200/80' />
                </div>
              ) : (
                <div className='space-y-5 px-3 sm:rounded-3xl sm:border sm:border-slate-200 sm:bg-white sm:p-5 sm:shadow-sm sm:px-5'>
                  <label className='flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3'>
                    <span className='text-sm font-medium text-slate-700'>Enable product shortcuts</span>
                    <input
                      type='checkbox'
                      checked={Boolean(shortcutsForm.enabled)}
                      onChange={(event) =>
                        setShortcutsForm((prev) => ({ ...prev, enabled: event.target.checked }))
                      }
                    />
                  </label>

                  <div className='grid gap-4 sm:grid-cols-2'>
                    <div className='rounded-lg border border-slate-200 p-2 sm:rounded-none sm:border-0 sm:p-0'>
                      <label className={labelClass}>Default category</label>
                      <ProductCategorySelector
                        selectedCategories={shortcutsForm.defaultCategoryIds}
                        onSelectCategories={(next) =>
                          setShortcutsForm((prev) => ({
                            ...prev,
                            defaultCategoryIds: normalizeIdArray(next),
                          }))
                        }
                        categories={shortcutCategories}
                        pendingCategoryRequestIds={[]}
                        pendingCategoryRequests={[]}
                        isLoading={isLoadingShortcutCategories}
                        errorMessage=''
                        onOpen={loadShortcutCategories}
                        className='w-full'
                      />
                    </div>

                    <div className='rounded-lg border border-slate-200 p-2 sm:rounded-none sm:border-0 sm:p-0'>
                      <label className={labelClass}>Must use tag</label>
                      <ProductTagSelector
                        selectedTags={shortcutsForm.defaultTagIds}
                        onSelectTags={(next) =>
                          setShortcutsForm((prev) => ({
                            ...prev,
                            defaultTagIds: normalizeIdArray(next),
                          }))
                        }
                        tags={shortcutTags}
                        maxSelected={20}
                        isLoading={isLoadingShortcutTags}
                        isLoadingMore={false}
                        hasMore={false}
                        errorMessage=''
                        onOpen={loadShortcutTags}
                        className='w-full'
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Default condition check</label>
                      <CustomSelect
                        className={inputClass}
                        value={shortcutsForm.conditionCheck}
                        onChange={(event) =>
                          setShortcutsForm((prev) => ({ ...prev, conditionCheck: event.target.value }))
                        }
                      >
                        <option value=''>No default condition</option>
                        {PRODUCT_CONDITION_OPTIONS.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </CustomSelect>
                    </div>

                    <div>
                      <label className={labelClass}>Default packaging style</label>
                      <CustomSelect
                        className={inputClass}
                        value={shortcutsForm.packagingStyle}
                        onChange={(event) =>
                          setShortcutsForm((prev) => ({ ...prev, packagingStyle: event.target.value }))
                        }
                      >
                        <option value=''>No default packaging</option>
                        {PRODUCT_PACKAGING_OPTIONS.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </CustomSelect>
                    </div>

                    <div>
                      <label className={labelClass}>Default return policy</label>
                      <CustomSelect
                        className={inputClass}
                        value={shortcutsForm.returnPolicy}
                        onChange={(event) =>
                          setShortcutsForm((prev) => ({ ...prev, returnPolicy: event.target.value }))
                        }
                      >
                        <option value=''>No default policy</option>
                        {PRODUCT_RETURN_POLICY_OPTIONS.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </CustomSelect>
                    </div>
                  </div>

                  <div>
                    <button
                      type='button'
                      onClick={saveShortcutsSection}
                      disabled={isSavingShortcuts}
                      className='rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60'
                    >
                      {isSavingShortcuts ? 'Saving...' : 'Save shortcut defaults'}
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
