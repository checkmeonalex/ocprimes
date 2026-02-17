'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminSidebar from '@/components/AdminSidebar'
import AdminDesktopHeader from '@/components/admin/AdminDesktopHeader'
import CreateAccountModal from './components/CreateAccountModal'
import VendorsTable from './components/VendorsTable'

const formatMonthTrend = (current, previous) => {
  const safeCurrent = Number(current || 0)
  const safePrevious = Number(previous || 0)
  if (safePrevious <= 0) {
    return { direction: safeCurrent > 0 ? 'up' : 'flat', label: safeCurrent > 0 ? '100%' : '0%' }
  }
  const delta = ((safeCurrent - safePrevious) / safePrevious) * 100
  if (Math.abs(delta) < 0.1) return { direction: 'flat', label: '0%' }
  return { direction: delta > 0 ? 'up' : 'down', label: `${Math.round(Math.abs(delta))}%` }
}

const monthKey = (date) => `${date.getFullYear()}-${date.getMonth()}`

export default function AdminBrandsManagementPage() {
  const router = useRouter()
  const [users, setUsers] = useState([])
  const [brands, setBrands] = useState([])
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [brandAccountModalOpen, setBrandAccountModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [createError, setCreateError] = useState('')

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const loadAllBrands = async () => {
        const perPage = 50
        const maxPages = 20
        let page = 1
        let pages = 1
        const all = []

        while (page <= pages && page <= maxPages) {
          const response = await fetch(`/api/admin/brands?page=${page}&per_page=${perPage}`, {
            cache: 'no-store',
            credentials: 'include',
          })
          const payload = await response.json().catch(() => null)
          if (!response.ok) {
            throw new Error(payload?.error || 'Unable to load brands.')
          }
          const items = Array.isArray(payload?.items) ? payload.items : []
          all.push(...items)
          pages = Math.max(1, Number(payload?.pages || 1))
          page += 1
        }

        return all
      }

      const [usersRes, allBrands] = await Promise.all([
        fetch('/api/admin/users', { cache: 'no-store', credentials: 'include' }),
        loadAllBrands(),
      ])

      const usersPayload = await usersRes.json().catch(() => null)

      if (!usersRes.ok) throw new Error(usersPayload?.error || 'Unable to load users.')

      const usersList = Array.isArray(usersPayload?.items) ? usersPayload.items : []
      setUsers(usersList)
      setBrands(allBrands)
    } catch (loadError) {
      setError(loadError?.message || 'Unable to load brand data.')
      setUsers([])
      setBrands([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const brandRows = useMemo(() => {
    const userMap = new Map(users.map((user) => [String(user?.id || ''), user]))

    const source = brands.map((brand) => {
      const ownerUserId = String(brand?.created_by || '').trim()
      const ownerUser = userMap.get(ownerUserId)
      return {
        id: String(brand?.id || ''),
        brand_name: String(brand?.name || ''),
        brand_slug: String(brand?.slug || ''),
        created_at: brand?.created_at || null,
        owner_user_id: ownerUserId,
        owner_email: String(ownerUser?.email || ''),
        owner_role: String(ownerUser?.role || ''),
      }
    })

    const term = query.trim().toLowerCase()
    if (!term) return source
    return source.filter((item) => {
      const haystack = `${item.brand_name} ${item.brand_slug} ${item.owner_email}`
      return haystack.toLowerCase().includes(term)
    })
  }, [brands, query, users])

  const stats = useMemo(() => {
    const now = new Date()
    const currentMonth = monthKey(now)
    const previousDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const previousMonth = monthKey(previousDate)

    let currentCount = 0
    let previousCount = 0

    brandRows.forEach((brand) => {
      const date = new Date(brand.created_at || '')
      if (Number.isNaN(date.getTime())) return
      const key = monthKey(date)
      if (key === currentMonth) currentCount += 1
      if (key === previousMonth) previousCount += 1
    })

    return {
      totalBrands: brands.length,
      linkedAccounts: brandRows.filter((item) => Boolean(String(item?.owner_user_id || '').trim())).length,
      newBrandsThisMonth: currentCount,
      trend: formatMonthTrend(currentCount, previousCount),
    }
  }, [brandRows, brands.length])

  const handleCreate = async (payload) => {
    setIsSaving(true)
    setCreateError('')
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || 'Unable to create account.')
      setBrandAccountModalOpen(false)
      await loadData()
    } catch (saveError) {
      setCreateError(saveError?.message || 'Unable to create account.')
    } finally {
      setIsSaving(false)
    }
  }

  const openBrandWorkspace = (item) => {
    const userId = String(item?.owner_user_id || '').trim()
    if (!userId) return
    router.push(`/backend/admin/vendors/${encodeURIComponent(userId)}`)
  }

  if (isLoading) {
    return (
      <div className='min-h-screen bg-[#f5f7fb]'>
        <div className='flex min-h-screen'>
          <AdminSidebar />
          <main className='flex-1 px-4 pb-6 sm:px-6 lg:px-10'>
            <AdminDesktopHeader />
            <p className='mt-8 text-sm text-slate-500'>Loading brands...</p>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-[#f5f7fb] text-slate-900'>
      <div className='flex min-h-screen'>
        <AdminSidebar />

        <main className='flex-1 px-4 pb-6 sm:px-6 lg:px-10'>
          <AdminDesktopHeader />
          <div className='mx-auto w-full max-w-6xl'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <h1 className='text-[26px] font-semibold tracking-tight text-slate-900'>Brands</h1>
              <button
                type='button'
                onClick={() => setBrandAccountModalOpen(true)}
                className='inline-flex h-10 items-center gap-2 rounded-full bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700'
              >
                <span className='inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20'>
                  <svg viewBox='0 0 24 24' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='2'>
                    <path d='M12 5v14M5 12h14' strokeLinecap='round' />
                  </svg>
                </span>
                Add Brand Account
              </button>
            </div>

            <div className='mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white'>
              <div className='grid gap-3 px-5 py-5 sm:grid-cols-3'>
                <div className='rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-4'>
                  <p className='text-[11px] uppercase tracking-[0.16em] text-slate-400'>Total Brands</p>
                  <p className='mt-2 text-3xl font-semibold text-slate-900'>{stats.totalBrands.toLocaleString()}</p>
                </div>
                <div className='rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-4'>
                  <p className='text-[11px] uppercase tracking-[0.16em] text-slate-400'>Linked Accounts</p>
                  <p className='mt-2 text-3xl font-semibold text-slate-900'>{stats.linkedAccounts.toLocaleString()}</p>
                </div>
                <div className='rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-4'>
                  <p className='text-[11px] uppercase tracking-[0.16em] text-slate-400'>New This Month</p>
                  <p className='mt-2 text-3xl font-semibold text-slate-900'>{stats.newBrandsThisMonth.toLocaleString()}</p>
                  <p
                    className={`mt-1 text-xs ${
                      stats.trend.direction === 'down'
                        ? 'text-rose-500'
                        : stats.trend.direction === 'flat'
                          ? 'text-slate-500'
                          : 'text-emerald-600'
                    }`}
                  >
                    {stats.trend.direction === 'down' ? '↓' : stats.trend.direction === 'flat' ? '→' : '↑'}{' '}
                    {stats.trend.label} vs last month
                  </p>
                </div>
              </div>
            </div>

            <div className='mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white'>
              <div className='flex flex-wrap items-center justify-between gap-3 px-5 py-5'>
                <p className='text-lg font-semibold text-slate-900'>Brand List</p>
                <label className='flex h-10 w-full items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-sm text-slate-500 sm:w-72'>
                  <svg viewBox='0 0 24 24' className='h-4 w-4 text-slate-400' fill='none' stroke='currentColor' strokeWidth='2'>
                    <circle cx='11' cy='11' r='6' />
                    <path d='m15.5 15.5 4 4' />
                  </svg>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className='w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400'
                    placeholder='Search brand, slug, owner email'
                  />
                </label>
              </div>

              {error ? <p className='px-5 pb-2 text-sm text-rose-500'>{error}</p> : null}
              <VendorsTable items={brandRows} onOpenBrand={openBrandWorkspace} />
            </div>
          </div>
        </main>
      </div>

      <CreateAccountModal
        open={brandAccountModalOpen}
        role='vendor'
        isSaving={isSaving}
        error={createError}
        onClose={() => {
          if (isSaving) return
          setBrandAccountModalOpen(false)
          setCreateError('')
        }}
        onSubmit={handleCreate}
      />
    </div>
  )
}
