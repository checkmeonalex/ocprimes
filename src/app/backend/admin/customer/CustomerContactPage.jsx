import { useMemo } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import AdminSidebar from '@/components/AdminSidebar'
import AdminDesktopHeader from '@/components/admin/AdminDesktopHeader'
import CustomerSkeletonCard from './components/CustomerSkeletonCard'
import { getCustomerDetailTabs, buildInitials } from './lib/customerDetailShared.mjs'
import { useCustomerDetail } from './lib/useCustomerDetail.mjs'

function CustomerContactPage() {
  const params = useParams()
  const customerId = Array.isArray(params?.customerId) ? params.customerId[0] : params?.customerId

  const { customer, isLoading, error } = useCustomerDetail(customerId)

  const meta = customer?.meta || {}
  const email = customer?.email || ''
  const website = meta.website || ''
  const facebook = meta.facebook || ''
  const twitter = meta.twitter || ''
  const linkedin = meta.linkedin || ''
  const pinterest = meta.pinterest || ''
  const instagram = meta.instagram || ''

  const activeTab = 'Contact info'
  const detailTabs = useMemo(() => getCustomerDetailTabs(customerId), [customerId])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <AdminSidebar />

        <main className="flex-1 px-4 pb-6 sm:px-6 lg:px-10">
          <AdminDesktopHeader />
          <div className="mx-auto w-full max-w-6xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Customers</p>
                <h1 className="mt-2 text-2xl font-semibold text-slate-900">Contact info</h1>
                <p className="mt-2 text-sm text-slate-500">{customer?.name || 'Customer details'}</p>
              </div>
              <Link
                href="/backend/admin/customers"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-slate-300"
              >
                Back to customers
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 lg:rounded-full lg:border lg:border-slate-200 lg:bg-white lg:p-1">
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

            <div className="mt-8 space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">Profile snapshot</p>
                <p className="mt-1 text-xs text-slate-500">Quick customer view</p>
                <div className="mt-5 space-y-4">
                  <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    {customer?.avatar_url ? (
                      <img src={customer.avatar_url} alt={customer.name} className="h-11 w-11 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600">
                        {buildInitials(customer?.name || '')}
                      </span>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{customer?.name || 'Customer'}</p>
                      <p className="text-xs text-slate-400">User ID {customer?.id || '--'}</p>
                    </div>
                    <p className="ml-auto text-xs font-semibold text-slate-500">{customer?.job_title || 'Customer'}</p>
                  </div>

                  {isLoading && <CustomerSkeletonCard withContainer={false} showHeader={false} rows={4} />}
                  {error && <p className="text-sm text-rose-500">{error}</p>}

                  {!isLoading && !error && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-2 text-xs font-semibold text-slate-500">
                        <span className="uppercase tracking-[0.2em]">Email address</span>
                        <input readOnly value={email} placeholder="--" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700" />
                      </label>

                      <label className="space-y-2 text-xs font-semibold text-slate-500">
                        <span className="uppercase tracking-[0.2em]">Website</span>
                        <input readOnly value={website} placeholder="--" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700" />
                      </label>

                      <label className="space-y-2 text-xs font-semibold text-slate-500">
                        <span className="uppercase tracking-[0.2em]">Facebook</span>
                        <input readOnly value={facebook} placeholder="--" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700" />
                      </label>

                      <label className="space-y-2 text-xs font-semibold text-slate-500">
                        <span className="uppercase tracking-[0.2em]">Twitter</span>
                        <input readOnly value={twitter} placeholder="--" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700" />
                      </label>

                      <label className="space-y-2 text-xs font-semibold text-slate-500">
                        <span className="uppercase tracking-[0.2em]">LinkedIn</span>
                        <input readOnly value={linkedin} placeholder="--" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700" />
                      </label>

                      <label className="space-y-2 text-xs font-semibold text-slate-500">
                        <span className="uppercase tracking-[0.2em]">Pinterest</span>
                        <input readOnly value={pinterest} placeholder="--" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700" />
                      </label>

                      <label className="space-y-2 text-xs font-semibold text-slate-500 md:col-span-2">
                        <span className="uppercase tracking-[0.2em]">Instagram</span>
                        <input readOnly value={instagram} placeholder="--" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700" />
                      </label>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default CustomerContactPage
