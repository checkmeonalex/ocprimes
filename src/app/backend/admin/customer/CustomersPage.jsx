import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import BouncingDotsLoader from '../components/BouncingDotsLoader'
import CustomerRowSkeleton from './components/CustomerRowSkeleton'
import AdminSidebar from '@/components/AdminSidebar'
import AdminDesktopHeader from '@/components/admin/AdminDesktopHeader'
import CreateAccountModal from '../brands/components/CreateAccountModal'
import { fetchCustomerStats, fetchCustomers } from './lib/customerApi.mjs'

const CUSTOMERS_PAGE_SIZE = 10

const buildInitials = (name) => {
  if (!name) return 'U'
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

const formatCompanyFromEmail = (email) => {
  const value = String(email || '').trim().toLowerCase()
  if (!value.includes('@')) return '--'
  const domain = value.split('@')[1] || ''
  const base = domain.split('.')[0] || ''
  if (!base) return '--'
  return base.charAt(0).toUpperCase() + base.slice(1)
}

const formatTrend = (trend) => {
  const direction = trend?.direction === 'down' ? 'down' : trend?.direction === 'flat' ? 'flat' : 'up'
  const percent = Number(trend?.percent || 0)
  return {
    direction,
    label: direction === 'flat' ? '0%' : `${direction === 'up' ? '+' : '-'}${percent}%`,
  }
}

function CustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [totalCount, setTotalCount] = useState(0)
  const isLoadingRef = useRef(false)
  const loadMoreRef = useRef(null)
  const [hasUserScrolled, setHasUserScrolled] = useState(false)
  const [sortBy, setSortBy] = useState('newest')
  const [statsLoading, setStatsLoading] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createSaving, setCreateSaving] = useState(false)
  const [createError, setCreateError] = useState('')
  const [stats, setStats] = useState({
    total_customers: 0,
    customers_this_month: 0,
    customers_last_month: 0,
    customers_trend: { direction: 'flat', percent: 0 },
    total_orders: 0,
    orders_this_month: 0,
    orders_last_month: 0,
    orders_trend: { direction: 'flat', percent: 0 },
    orders_source: 'fallback',
    active_today_count: 0,
    active_today_users: [],
  })

  const loadCustomers = useCallback(async (requestedPage, replace = false) => {
    if (isLoadingRef.current) return
    isLoadingRef.current = true
    setIsLoading(true)
    setError('')

    try {
      const payload = await fetchCustomers({
        page: requestedPage,
        perPage: CUSTOMERS_PAGE_SIZE,
        q: searchTerm,
      })

      const nextItems = Array.isArray(payload?.items) ? payload.items : []
      const total = Number(payload?.total_count || 0)
      const pages = Number(payload?.pages || 1)

      setCustomers((prev) => (replace ? nextItems : [...prev, ...nextItems]))
      setPage(requestedPage)
      setTotalCount(total)
      setHasMore(requestedPage < pages)
    } catch (err) {
      setError(err?.message || 'Unable to load customers.')
      if (replace) {
        setCustomers([])
        setHasMore(false)
      }
    } finally {
      isLoadingRef.current = false
      setIsLoading(false)
    }
  }, [searchTerm])

  useEffect(() => {
    const handle = setTimeout(() => {
      setCustomers([])
      setPage(1)
      setHasMore(true)
      setHasUserScrolled(false)
      loadCustomers(1, true)
    }, 300)
    return () => clearTimeout(handle)
  }, [loadCustomers, searchTerm])

  useEffect(() => {
    let active = true
    const loadStats = async () => {
      setStatsLoading(true)
      try {
        const payload = await fetchCustomerStats()
        if (!active) return
        setStats((prev) => ({
          ...prev,
          ...payload,
          active_today_users: Array.isArray(payload?.active_today_users) ? payload.active_today_users : [],
        }))
      } catch (_error) {
      } finally {
        if (active) setStatsLoading(false)
      }
    }
    loadStats()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (hasUserScrolled) return
    const markScrolled = () => setHasUserScrolled(true)
    window.addEventListener('scroll', markScrolled, { passive: true })
    window.addEventListener('wheel', markScrolled, { passive: true })
    window.addEventListener('touchmove', markScrolled, { passive: true })
    return () => {
      window.removeEventListener('scroll', markScrolled)
      window.removeEventListener('wheel', markScrolled)
      window.removeEventListener('touchmove', markScrolled)
    }
  }, [hasUserScrolled])

  useEffect(() => {
    const node = loadMoreRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry?.isIntersecting) return
        if (!hasUserScrolled) return
        if (!customers.length || !hasMore || isLoadingRef.current) return
        loadCustomers(page + 1)
      },
      { rootMargin: '200px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [customers.length, hasMore, hasUserScrolled, loadCustomers, page])

  const rows = useMemo(() => {
    const mapped = customers.map((customer) => {
      const status = String(customer?.status || '').toLowerCase() === 'inactive' ? 'inactive' : 'active'
      return {
        ...customer,
        company: String(customer?.company || '').trim() || formatCompanyFromEmail(customer?.email),
        country: String(customer?.country || '').trim() || 'Unknown',
        status,
      }
    })

    if (sortBy === 'oldest') {
      return [...mapped].sort((a, b) => {
        const left = new Date(a?.created_at || 0).getTime()
        const right = new Date(b?.created_at || 0).getTime()
        return left - right
      })
    }

    if (sortBy === 'name') {
      return [...mapped].sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')))
    }

    return [...mapped].sort((a, b) => {
      const left = new Date(a?.created_at || 0).getTime()
      const right = new Date(b?.created_at || 0).getTime()
      return right - left
    })
  }, [customers, sortBy])

  const customerTrend = useMemo(() => formatTrend(stats.customers_trend), [stats.customers_trend])
  const ordersTrend = useMemo(() => formatTrend(stats.orders_trend), [stats.orders_trend])

  const handleCreateCustomer = async (payload) => {
    setCreateSaving(true)
    setCreateError('')
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...payload, role: 'customer' }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || 'Unable to create customer.')
      setCreateModalOpen(false)
      await loadCustomers(1, true)
    } catch (saveError) {
      setCreateError(saveError?.message || 'Unable to create customer.')
    } finally {
      setCreateSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <div className="flex min-h-screen">
        <AdminSidebar />

        <main className="flex-1 px-4 pb-6 sm:px-6 lg:px-10">
          <AdminDesktopHeader />
          <div className="mx-auto w-full max-w-6xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-[26px] font-semibold text-slate-900">All Customers</h1>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                  </svg>
                </span>
                Add Customer
              </button>
            </div>

            <div className="mt-5">
              <div className="mobile-full-bleed mb-4 overflow-hidden rounded-none border-y border-slate-200 bg-white sm:rounded-2xl sm:border sm:border-slate-200">
                <div className="grid sm:grid-cols-3">
                  <div className="flex items-center gap-3 px-5 py-5">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[#4d9cff]">
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <circle cx="9" cy="8" r="3.2" />
                        <path d="M3.8 18.2a5.2 5.2 0 0 1 10.4 0" />
                        <circle cx="17" cy="9" r="2.2" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-[11px] text-slate-400">Total Customers</p>
                      <p className="text-[35px] font-semibold leading-none text-slate-900">{Number(stats.total_customers || totalCount || rows.length).toLocaleString()}</p>
                      <p className={`mt-1 text-[11px] ${customerTrend.direction === 'down' ? 'text-rose-500' : customerTrend.direction === 'flat' ? 'text-slate-500' : 'text-emerald-600'}`}>
                        {statsLoading ? 'Loading...' : `${customerTrend.direction === 'down' ? '↓' : customerTrend.direction === 'flat' ? '→' : '↑'} ${customerTrend.label.replace('+', '')} this month`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 border-t border-slate-100 px-5 py-5 sm:border-l sm:border-t-0">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[#4d9cff]">
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <circle cx="12" cy="8.5" r="3" />
                        <path d="M6 18a6 6 0 0 1 12 0" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-[11px] text-slate-400">Total Orders</p>
                      <p className="text-[35px] font-semibold leading-none text-slate-900">{Number(stats.total_orders || 0).toLocaleString()}</p>
                      <p className={`mt-1 text-[11px] ${ordersTrend.direction === 'down' ? 'text-rose-500' : ordersTrend.direction === 'flat' ? 'text-slate-500' : 'text-emerald-600'}`}>
                        {statsLoading ? 'Loading...' : `${ordersTrend.direction === 'down' ? '↓' : ordersTrend.direction === 'flat' ? '→' : '↑'} ${ordersTrend.label.replace('+', '')} this month`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 border-t border-slate-100 px-5 py-5 sm:border-l sm:border-t-0">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[#4d9cff]">
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <rect x="4" y="5" width="16" height="11" rx="2" />
                        <path d="M9 19h6" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-[11px] text-slate-400">Active Now</p>
                      <p className="text-[35px] font-semibold leading-none text-slate-900">{Number(stats.active_today_count || 0).toLocaleString()}</p>
                      <div className="mt-1 flex -space-x-1.5">
                        {Array.isArray(stats.active_today_users) &&
                          stats.active_today_users.slice(0, 5).map((user) => (
                            <span
                              key={user.id}
                              className="inline-flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border border-white bg-slate-200 text-[9px] font-semibold text-slate-600"
                              title={user.name}
                            >
                              {user.avatar_url ? (
                                <img src={user.avatar_url} alt={user.name} className="h-full w-full object-cover" />
                              ) : (
                                buildInitials(user.name || '')
                              )}
                            </span>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mobile-full-bleed rounded-none border-y border-slate-200 bg-white sm:rounded-2xl sm:border sm:border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-5">
                  <p className="text-lg font-semibold text-slate-900">All Customers</p>
                  <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
                    <label className="flex h-9 w-full items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-sm text-slate-500 sm:w-64">
                      <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="6" />
                        <path d="m15.5 15.5 4 4" />
                      </svg>
                      <input
                        className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                        placeholder="Search"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                      />
                    </label>
                    <span className="text-xs text-slate-400">Sort by:</span>
                    <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="h-8 border-0 bg-transparent pr-6 text-xs font-semibold text-slate-700 outline-none">
                      <option value="newest">Newest</option>
                      <option value="oldest">Oldest</option>
                      <option value="name">Name</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <div className="min-w-[860px]">
                    <div className="grid grid-cols-[210px_230px_160px_130px_110px_60px] gap-4 border-t border-slate-100 px-5 py-3 text-[11px] text-slate-400">
                      <span>Name</span>
                      <span>Email</span>
                      <span>Phone</span>
                      <span>Location</span>
                      <span>Total Order</span>
                      <span>Action</span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {!rows.length && isLoading &&
                        Array.from({ length: 6 }).map((_, index) => (
                          <CustomerRowSkeleton key={`customer-skeleton-${index}`} />
                        ))}

                      {rows.map((customer) => (
                        <div
                          key={customer.id}
                          className="grid grid-cols-[210px_230px_160px_130px_110px_60px] items-center gap-4 px-5 py-4 text-sm transition hover:bg-slate-50"
                        >
                          <button
                            type="button"
                            onClick={() => router.push(`/backend/admin/customers/${customer.id}`)}
                            className="truncate text-left text-[13px] font-medium text-slate-800 hover:underline"
                          >
                            {customer.name || 'Unknown'}
                          </button>

                          <p className="truncate text-[13px] text-slate-700">{customer.email || '--'}</p>
                          <p className="truncate text-[13px] text-slate-700">{customer.phone || '--'}</p>
                          <p className="truncate text-[13px] text-slate-700">{customer.country || 'Unknown'}</p>
                          <p className="text-[13px] font-medium text-slate-800">{Number(customer.total_orders || 0)}</p>
                          <button
                            type="button"
                            onClick={() => router.push(`/backend/admin/customers/${customer.id}`)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100"
                            aria-label="Open customer"
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                              <circle cx="6" cy="12" r="1.7" />
                              <circle cx="12" cy="12" r="1.7" />
                              <circle cx="18" cy="12" r="1.7" />
                            </svg>
                          </button>
                        </div>
                      ))}

                      {!rows.length && !isLoading && (
                        <div className="px-6 py-8 text-center text-sm text-slate-400">No customers yet.</div>
                      )}
                    </div>
                  </div>
                </div>

                <div ref={loadMoreRef} className="h-6" />
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 pb-4 pt-3">
                  <p className="text-[11px] text-slate-400">
                    Showing {rows.length ? 1 : 0} to {rows.length} of {totalCount || rows.length} entries
                  </p>
                  {isLoading && <BouncingDotsLoader className="text-slate-400" dotClassName="bg-slate-400" />}

                  {!isLoading && hasMore && (
                    <button
                      type="button"
                      onClick={() => loadCustomers(page + 1)}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-500"
                    >
                      Load next
                    </button>
                  )}

                  {!isLoading && !hasMore && customers.length > 0 && (
                    <p className="text-xs text-slate-400">No more customers.</p>
                  )}
                </div>

                {error && <p className="px-6 py-3 text-xs text-rose-500">{error}</p>}
              </div>
            </div>
          </div>
        </main>
      </div>
      <CreateAccountModal
        open={createModalOpen}
        role="customer"
        isSaving={createSaving}
        error={createError}
        onClose={() => {
          if (createSaving) return
          setCreateModalOpen(false)
          setCreateError('')
        }}
        onSubmit={handleCreateCustomer}
      />
    </div>
  )
}

export default CustomersPage
