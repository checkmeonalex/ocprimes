import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

import AdminShell from '@/components/admin/AdminShell'
import CustomerSkeletonCard from './components/CustomerSkeletonCard'
import { getCustomerDetailTabs, buildInitials } from './lib/customerDetailShared.mjs'
import { useCustomerDetail } from './lib/useCustomerDetail.mjs'

function CustomerOrdersPage() {
  const params = useParams()
  const customerId = Array.isArray(params?.customerId) ? params.customerId[0] : params?.customerId

  const { customer } = useCustomerDetail(customerId)

  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState('')

  const loadOrders = useCallback(async () => {
    if (!customerId) return
    setOrdersLoading(true)
    setOrdersError('')
    try {
      const r = await fetch(`/api/admin/orders?customerId=${encodeURIComponent(customerId)}&perPage=50`)
      const p = await r.json().catch(() => null)
      if (!r.ok) { setOrdersError(p?.error || 'Unable to load orders.'); return }
      setOrders(Array.isArray(p?.items) ? p.items : [])
    } catch { setOrdersError('Unable to load orders.') }
    finally { setOrdersLoading(false) }
  }, [customerId])

  useEffect(() => { loadOrders() }, [loadOrders])

  const toDate = (v) => {
    const d = new Date(v || '')
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const activeTab = 'Orders'
  const detailTabs = useMemo(() => getCustomerDetailTabs(customerId), [customerId])

  return (
    <AdminShell>
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Customers</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">Customer onboarding</h1>
            <p className="mt-2 text-sm text-slate-500">{customer?.email || 'Customer details'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/backend/admin/customers"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-slate-300"
            >
              Back to customers
            </Link>
          </div>
        </div>

        <div className="mt-6 hidden flex-wrap items-center gap-2 rounded-full border border-slate-200 bg-white p-1 text-xs font-semibold text-slate-500 lg:flex">
          {detailTabs.map((tab) => (
            <Link
              key={tab.label}
              href={tab.path}
              className={`rounded-full px-4 py-2 transition ${
                tab.label === activeTab ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        <div className="mt-8 hidden lg:block">
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Orders</p>
                <p className="text-xs text-slate-400">All orders placed by this customer</p>
              </div>
              {!ordersLoading && (
                <span className="font-mono text-[11px] text-slate-400">
                  {orders.length} order{orders.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {ordersLoading && (
              <div className="divide-y divide-slate-50">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-3">
                    <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
                    <div className="h-3 w-32 animate-pulse rounded bg-slate-100" />
                    <div className="ml-auto h-3 w-16 animate-pulse rounded bg-slate-100" />
                  </div>
                ))}
              </div>
            )}

            {ordersError && <p className="px-6 py-4 text-xs text-rose-500">{ordersError}</p>}

            {!ordersLoading && !ordersError && orders.length === 0 && (
              <p className="px-6 py-8 text-center text-xs text-slate-400">No orders yet.</p>
            )}

            {!ordersLoading && orders.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="bg-slate-50 px-6 py-2 text-left font-mono text-[10px] font-medium uppercase tracking-widest text-slate-400">Order</th>
                      <th className="bg-slate-50 px-4 py-2 text-left font-mono text-[10px] font-medium uppercase tracking-widest text-slate-400">Date</th>
                      <th className="bg-slate-50 px-4 py-2 text-left font-mono text-[10px] font-medium uppercase tracking-widest text-slate-400">Status</th>
                      <th className="bg-slate-50 px-4 py-2 text-left font-mono text-[10px] font-medium uppercase tracking-widest text-slate-400">Items</th>
                      <th className="bg-slate-50 px-4 py-2 text-right font-mono text-[10px] font-medium uppercase tracking-widest text-slate-400">Total</th>
                      <th className="bg-slate-50 px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {orders.map((order) => {
                      const status = String(order.payment_status || '').toLowerCase()
                      const statusStyle =
                        status === 'paid'
                          ? 'bg-emerald-50 text-emerald-700'
                          : status === 'pending'
                          ? 'bg-amber-50 text-amber-600'
                          : 'bg-slate-100 text-slate-500'
                      return (
                        <tr key={order.id} className="group hover:bg-slate-50/70">
                          <td className="px-6 py-2.5 font-mono text-xs font-medium text-slate-800">
                            #{order.order_number || order.id?.slice(0, 8)}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{toDate(order.created_at)}</td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center rounded px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide ${statusStyle}`}>
                              {status || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{order.item_count ?? '—'}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-slate-800">
                            {order.total_amount != null
                              ? `${String(order.currency || '').toUpperCase() || '₦'}${Number(order.total_amount).toLocaleString()}`
                              : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <Link
                              href={`/backend/admin/orders/${order.id}`}
                              className="rounded px-2 py-1 text-[11px] font-medium text-slate-300 opacity-0 transition hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100"
                            >
                              View →
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </AdminShell>
  )
}

export default CustomerOrdersPage
