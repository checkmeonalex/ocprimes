import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import AdminSidebar from '@/components/AdminSidebar'
import AdminDesktopHeader from '@/components/admin/AdminDesktopHeader'
import CustomerSkeletonCard from './components/CustomerSkeletonCard'
import { getCustomerDetailTabs, buildInitials } from './lib/customerDetailShared.mjs'
import { useCustomerDetail } from './lib/useCustomerDetail.mjs'
import { updateCustomerById } from './lib/customerApi.mjs'
import LoadingButton from '@/components/LoadingButton'

function CustomerAboutPage() {
  const params = useParams()
  const customerId = Array.isArray(params?.customerId) ? params.customerId[0] : params?.customerId

  const { customer, isLoading, error } = useCustomerDetail(customerId)
  const bio = customer?.meta?.description || ''
  const [bioValue, setBioValue] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    setBioValue(bio)
  }, [bio])

  const handleSave = async () => {
    if (!customerId || isSaving) return
    setSaveError('')
    setSaveMessage('')
    setIsSaving(true)
    try {
      await updateCustomerById(customerId, { bio: bioValue })
      setSaveMessage('Bio updated.')
    } catch (err) {
      setSaveError(err?.message || 'Unable to update bio.')
    } finally {
      setIsSaving(false)
    }
  }

  const activeTab = 'About the user'
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
                <h1 className="mt-2 text-2xl font-semibold text-slate-900">About the user</h1>
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
                <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                  {customer?.avatar_url ? (
                    <img src={customer.avatar_url} alt={customer.name} className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600">
                      {buildInitials(customer?.name || '')}
                    </span>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{customer?.name || 'Customer'}</p>
                    <p className="text-xs text-slate-500">User ID: {customer?.id || '--'}</p>
                  </div>
                </div>

                {isLoading && <CustomerSkeletonCard withContainer={false} showHeader={false} rows={5} className="mt-5" />}
                {error && <p className="mt-5 text-sm text-rose-500">{error}</p>}

                {!isLoading && !error && (
                  <div className="mt-5 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Biography</p>
                    <textarea
                      value={bioValue}
                      onChange={(event) => setBioValue(event.target.value)}
                      placeholder="No profile bio yet."
                      className="h-40 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                    />
                    <div className="flex flex-wrap items-center gap-3">
                      <LoadingButton
                        type="button"
                        isLoading={isSaving}
                        onClick={handleSave}
                        className="rounded-full bg-slate-900 px-6 py-2 text-sm font-semibold text-white"
                      >
                        Save bio
                      </LoadingButton>
                      {saveMessage ? <p className="text-xs text-emerald-600">{saveMessage}</p> : null}
                      {saveError ? <p className="text-xs text-rose-500">{saveError}</p> : null}
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default CustomerAboutPage
