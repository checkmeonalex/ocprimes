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

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-3.5 border-b border-slate-100 last:border-0">
      <div className="h-8 w-8 rounded-lg bg-slate-100 shrink-0 animate-pulse" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-36 rounded-full bg-slate-100 animate-pulse" />
        <div className="h-2.5 w-24 rounded-full bg-slate-100 animate-pulse" />
      </div>
      <div className="h-3 w-32 rounded-full bg-slate-100 animate-pulse hidden sm:block" />
      <div className="h-3 w-20 rounded-full bg-slate-100 animate-pulse hidden md:block" />
      <div className="h-5 w-14 rounded-full bg-slate-100 animate-pulse" />
      <div className="h-7 w-7 rounded-full bg-slate-100 animate-pulse" />
    </div>
  )
}

function StatCard({ label, value, icon, trend }) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white px-5 py-5 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="font-mono text-[10px] font-normal uppercase tracking-widest text-slate-400">{label}</p>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
          {icon}
        </span>
      </div>
      <div className="mt-4">
        <p className="font-mono text-3xl font-semibold tabular-nums text-slate-900" style={{ fontFeatureSettings: '"tnum"' }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        {trend && (
          <p className={`mt-1 font-mono text-[11px] font-normal ${
            trend.direction === 'down' ? 'text-rose-500' :
            trend.direction === 'flat' ? 'text-slate-400' : 'text-emerald-600'
          }`}>
            {trend.direction === 'down' ? '↓' : trend.direction === 'flat' ? '→' : '↑'}{' '}
            {trend.label} vs last month
          </p>
        )}
      </div>
    </div>
  )
}

export default function AdminBrandsManagementPage() {
  const router = useRouter()
  const [users, setUsers] = useState([])
  const [brands, setBrands] = useState([])
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
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
          const res = await fetch(`/api/admin/brands?page=${page}&per_page=${perPage}`, {
            cache: 'no-store', credentials: 'include',
          })
          const payload = await res.json().catch(() => null)
          if (!res.ok) throw new Error(payload?.error || 'Unable to load vendors.')
          all.push(...(Array.isArray(payload?.items) ? payload.items : []))
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
      setUsers(Array.isArray(usersPayload?.items) ? usersPayload.items : [])
      setBrands(allBrands)
    } catch (err) {
      setError(err?.message || 'Unable to load vendor data.')
      setUsers([])
      setBrands([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const brandRows = useMemo(() => {
    const userMap = new Map(users.map((u) => [String(u?.id || ''), u]))
    const source = brands.map((brand) => {
      const ownerUserId = String(brand?.created_by || '').trim()
      const ownerUser = userMap.get(ownerUserId)
      return {
        id: String(brand?.id || ''),
        brand_name: String(brand?.name || ''),
        brand_slug: String(brand?.slug || ''),
        logo_url: String(brand?.logo_url || ''),
        created_at: brand?.created_at || null,
        owner_user_id: ownerUserId,
        owner_email: String(ownerUser?.email || ''),
        owner_role: String(ownerUser?.role || ''),
      }
    })
    const term = query.trim().toLowerCase()
    if (!term) return source
    return source.filter((item) =>
      `${item.brand_name} ${item.brand_slug} ${item.owner_email}`.toLowerCase().includes(term)
    )
  }, [brands, query, users])

  const stats = useMemo(() => {
    const now = new Date()
    const currentMonth = monthKey(now)
    const previousMonth = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1))
    let currentCount = 0, previousCount = 0
    brandRows.forEach((brand) => {
      const date = new Date(brand.created_at || '')
      if (Number.isNaN(date.getTime())) return
      const key = monthKey(date)
      if (key === currentMonth) currentCount++
      if (key === previousMonth) previousCount++
    })
    return {
      totalVendors: brands.length,
      linkedAccounts: brandRows.filter((item) => Boolean(String(item?.owner_user_id || '').trim())).length,
      newThisMonth: currentCount,
      trend: formatMonthTrend(currentCount, previousCount),
    }
  }, [brandRows, brands.length])

  const handleCreate = async (payload) => {
    setIsSaving(true)
    setCreateError('')
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Unable to create account.')
      setModalOpen(false)
      await loadData()
    } catch (err) {
      setCreateError(err?.message || 'Unable to create account.')
    } finally {
      setIsSaving(false)
    }
  }

  const openVendorWorkspace = (item) => {
    const userId = String(item?.owner_user_id || '').trim()
    if (!userId) return
    router.push(`/backend/admin/vendors/${encodeURIComponent(userId)}`)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900">
      <AdminSidebar />
      <main className="flex flex-1 flex-col overflow-hidden">
        <AdminDesktopHeader noBleed />
        <div className="flex-1 overflow-y-auto px-4 pb-10 sm:px-6 lg:px-10">

          {/* Page header */}
          <div className="flex flex-wrap items-center justify-between gap-3 py-6">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">Vendors</h1>
              <p className="mt-0.5 text-sm text-slate-500">Manage vendor accounts and store access</p>
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 active:scale-[0.98]"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" d="M12 5v14M5 12h14" />
              </svg>
              Add Vendor
            </button>
          </div>

          {/* Stat cards */}
          <div className="grid gap-3 sm:grid-cols-3 mb-6">
            <StatCard
              label="Total Vendors"
              value={isLoading ? '—' : stats.totalVendors}
              icon={
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M3.5 10.5h17M5 10.5V19h14v-8.5M4.5 6h15l1 4.5h-17Z" />
                  <path d="M9.5 14h5V19h-5Z" />
                </svg>
              }
            />
            <StatCard
              label="Linked Accounts"
              value={isLoading ? '—' : stats.linkedAccounts}
              icon={
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
                  <path d="M5 20a7 7 0 0 1 14 0" />
                </svg>
              }
            />
            <StatCard
              label="New This Month"
              value={isLoading ? '—' : stats.newThisMonth}
              trend={isLoading ? null : stats.trend}
              icon={
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 3v1.5M12 19.5V21M4.9 4.9l1.1 1.1M18 18l1.1 1.1M3 12h1.5M19.5 12H21M4.9 19.1 6 18M18 6l1.1-1.1" />
                  <circle cx="12" cy="12" r="4" />
                </svg>
              }
            />
          </div>

          {/* Table card */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* Table toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <p className="text-sm font-semibold text-slate-800">
                {isLoading ? 'Vendors' : `${brandRows.length.toLocaleString()} vendor${brandRows.length !== 1 ? 's' : ''}`}
              </p>
              <label className="flex h-9 w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 sm:w-64 focus-within:border-slate-400 transition">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="6" /><path d="m15.5 15.5 4 4" />
                </svg>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  placeholder="Search vendor, slug, email…"
                />
                {query && (
                  <button type="button" onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-600 transition">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </label>
            </div>

            {error && (
              <div className="mx-5 my-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
                {error}
              </div>
            )}

            {isLoading ? (
              <div>
                {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
              </div>
            ) : (
              <VendorsTable items={brandRows} onOpenBrand={openVendorWorkspace} />
            )}
          </div>
        </div>
      </main>

      <CreateAccountModal
        open={modalOpen}
        role="vendor"
        isSaving={isSaving}
        error={createError}
        onClose={() => { if (isSaving) return; setModalOpen(false); setCreateError('') }}
        onSubmit={handleCreate}
      />
    </div>
  )
}
