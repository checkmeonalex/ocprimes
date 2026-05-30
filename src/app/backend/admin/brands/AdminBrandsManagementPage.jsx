'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminShell from '@/components/admin/AdminShell'
import CreateAccountModal from './components/CreateAccountModal'

// ── utils ─────────────────────────────────────────────────────────────────────

const toDate = (v) => {
  const d = new Date(v || '')
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

const monthKey = (d) => `${d.getFullYear()}-${d.getMonth()}`

// ── atoms ─────────────────────────────────────────────────────────────────────

function VendorAvatar({ name, logoUrl }) {
  const initials = (name || '').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase()
  if (logoUrl) return <img src={logoUrl} alt={name} className="h-7 w-7 shrink-0 rounded object-cover bg-slate-100 border border-slate-200" />
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-slate-900 text-[10px] font-bold italic text-white">
      {initials || '?'}
    </div>
  )
}

const Th = ({ children, className = '' }) => (
  <th className={`bg-slate-50 px-3 py-2 text-left font-mono text-[10px] font-medium uppercase tracking-widest text-slate-400 ${className}`}>
    {children}
  </th>
)

function SkeletonRows() {
  return Array.from({ length: 8 }).map((_, i) => (
    <tr key={i} className="border-b border-slate-50">
      {[7, 8, 5, 6, 3].map((w, j) => (
        <td key={j} className="px-3 py-2.5">
          <div className={`h-3 w-${w * 8} max-w-full animate-pulse rounded bg-slate-100`} />
        </td>
      ))}
    </tr>
  ))
}

// ── stat strip ────────────────────────────────────────────────────────────────

function StatStrip({ stats, loading }) {
  const items = [
    { label: 'Total vendors', value: loading ? '—' : stats.total },
    { label: 'Linked accounts', value: loading ? '—' : stats.linked },
    { label: 'Unlinked', value: loading ? '—' : stats.unlinked, accent: stats.unlinked > 0 ? 'text-amber-500' : '' },
    { label: 'New this month', value: loading ? '—' : stats.newThisMonth },
  ]
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-4">
      {items.map(({ label, value, accent }) => (
        <div key={label} className="bg-white px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-400">{label}</p>
          <p className={`mt-1 font-mono text-xl font-semibold tabular-nums ${accent || 'text-slate-900'}`}>{value}</p>
        </div>
      ))}
    </div>
  )
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function AdminBrandsManagementPage() {
  const router = useRouter()
  const [users, setUsers] = useState([])
  const [brands, setBrands] = useState([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [createError, setCreateError] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const fetchBrands = async () => {
        const all = []; let page = 1, pages = 1
        while (page <= pages && page <= 20) {
          const r = await fetch(`/api/admin/brands?page=${page}&per_page=50`, { cache: 'no-store' })
          const p = await r.json().catch(() => null)
          if (!r.ok) throw new Error(p?.error || 'Unable to load vendors.')
          all.push(...(Array.isArray(p?.items) ? p.items : []))
          pages = Math.max(1, Number(p?.pages || 1))
          page++
        }
        return all
      }
      const [uRes, allBrands] = await Promise.all([
        fetch('/api/admin/users', { cache: 'no-store' }),
        fetchBrands(),
      ])
      const uPayload = await uRes.json().catch(() => null)
      if (!uRes.ok) throw new Error(uPayload?.error || 'Unable to load users.')
      setUsers(Array.isArray(uPayload?.items) ? uPayload.items : [])
      setBrands(allBrands)
    } catch (err) {
      setError(err?.message || 'Unable to load data.')
      setUsers([]); setBrands([])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const rows = useMemo(() => {
    const userMap = new Map(users.map(u => [String(u?.id || ''), u]))
    const source = brands.map(b => {
      const ownerId = String(b?.created_by || '').trim()
      const owner = userMap.get(ownerId)
      return {
        id: String(b?.id || ''),
        name: String(b?.name || ''),
        slug: String(b?.slug || ''),
        logo_url: String(b?.logo_url || ''),
        created_at: b?.created_at || null,
        owner_id: ownerId,
        owner_email: String(owner?.email || ''),
        linked: Boolean(ownerId),
      }
    })
    const t = q.trim().toLowerCase()
    return t ? source.filter(r => `${r.name} ${r.slug} ${r.owner_email}`.toLowerCase().includes(t)) : source
  }, [brands, users, q])

  const stats = useMemo(() => {
    const now = new Date()
    const cur = monthKey(now)
    let newThisMonth = 0
    rows.forEach(r => {
      const d = new Date(r.created_at || '')
      if (!Number.isNaN(d.getTime()) && monthKey(d) === cur) newThisMonth++
    })
    return {
      total: brands.length,
      linked: rows.filter(r => r.linked).length,
      unlinked: rows.filter(r => !r.linked).length,
      newThisMonth,
    }
  }, [rows, brands.length])

  const handleCreate = async (payload) => {
    setIsSaving(true); setCreateError('')
    try {
      const r = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await r.json().catch(() => null)
      if (!r.ok) throw new Error(data?.error || 'Unable to create.')
      setModalOpen(false)
      await load()
    } catch (err) { setCreateError(err?.message || 'Unable to create.') }
    finally { setIsSaving(false) }
  }

  return (
    <AdminShell>
      <div className="mx-auto w-full max-w-5xl space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-slate-400">Admin</p>
            <h1 className="mt-0.5 text-lg font-semibold text-slate-900">Sellers</h1>
          </div>
          <button type="button" onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition active:scale-[0.98]">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M12 5v14M5 12h14"/></svg>
            Add Vendor
          </button>
        </div>

        {/* Stats */}
        <StatStrip stats={stats} loading={loading} />

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
            <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v4m0 4h.01" strokeLinecap="round"/></svg>
            {error}
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5">
            <span className="font-mono text-[11px] text-slate-400">
              {loading ? '—' : `${rows.length.toLocaleString()} vendor${rows.length !== 1 ? 's' : ''}`}
            </span>
            <div className="flex h-7 w-full max-w-xs items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 focus-within:border-slate-400 transition">
              <svg className="h-3 w-3 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="6"/><path d="m15.5 15.5 4 4"/></svg>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, slug, email…"
                className="w-full bg-transparent text-xs outline-none placeholder:text-slate-400 text-slate-700" />
              {q && <button type="button" onClick={() => setQ('')} className="text-slate-400 hover:text-slate-600"><svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 18 18 6M6 6l12 12"/></svg></button>}
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <Th>Vendor</Th><Th>Owner</Th><Th>Joined</Th><Th>Status</Th><Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? <SkeletonRows /> : rows.length === 0 ? (
                  <tr><td colSpan={5} className="py-12 text-center text-xs text-slate-400">No vendors found.</td></tr>
                ) : rows.map(item => (
                  <tr key={item.id} className="group transition-colors hover:bg-slate-50/70">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <VendorAvatar name={item.name} logoUrl={item.logo_url} />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-slate-800 leading-tight">{item.name || '—'}</p>
                          <p className="font-mono text-[11px] text-slate-400 leading-tight">/{item.slug || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-500 max-w-[200px] truncate">
                      {item.owner_email || <span className="italic text-slate-300">No owner</span>}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-400">{toDate(item.created_at)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide ${item.linked ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-500'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${item.linked ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                        {item.linked ? 'Active' : 'Unlinked'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button type="button"
                        onClick={() => item.owner_id && router.push(`/backend/admin/vendors/${encodeURIComponent(item.owner_id)}`)}
                        disabled={!item.linked}
                        className="rounded px-2 py-1 text-[11px] font-medium text-slate-300 opacity-0 transition hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100 disabled:pointer-events-none">
                        Open →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-4">
                  <div className="h-8 w-8 shrink-0 animate-pulse rounded bg-slate-100" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-32 animate-pulse rounded bg-slate-100" />
                    <div className="h-2.5 w-24 animate-pulse rounded bg-slate-100" />
                  </div>
                </div>
              ))
            ) : rows.length === 0 ? (
              <p className="py-12 text-center text-xs text-slate-400">No vendors found.</p>
            ) : rows.map(item => (
              <button key={item.id} type="button"
                onClick={() => item.linked && item.owner_id && router.push(`/backend/admin/vendors/${encodeURIComponent(item.owner_id)}`)}
                className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-slate-50/70 disabled:pointer-events-none"
                disabled={!item.linked}
              >
                <VendorAvatar name={item.name} logoUrl={item.logo_url} />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-800">{item.name || '—'}</p>
                  <p className="font-mono text-[11px] text-slate-400 truncate">{item.owner_email || 'No owner'}</p>
                </div>
                <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide shrink-0 ${item.linked ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-500'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${item.linked ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  {item.linked ? 'Active' : 'Unlinked'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <CreateAccountModal
        open={modalOpen}
        role="vendor"
        isSaving={isSaving}
        error={createError}
        onClose={() => { if (!isSaving) { setModalOpen(false); setCreateError('') } }}
        onSubmit={handleCreate}
      />
    </AdminShell>
  )
}
