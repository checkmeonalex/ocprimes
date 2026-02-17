import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import AdminSidebar from '@/components/AdminSidebar'
import AdminDesktopHeader from '@/components/admin/AdminDesktopHeader'
import CustomerSkeletonCard from './components/CustomerSkeletonCard'
import { getCustomerDetailTabs, buildInitials } from './lib/customerDetailShared.mjs'
import { useCustomerDetail } from './lib/useCustomerDetail.mjs'
import { updateCustomerById } from './lib/customerApi.mjs'
import LoadingButton from '@/components/LoadingButton'

const splitName = (name) => {
  if (!name) return { firstName: '', lastName: '' }
  const parts = name.trim().split(' ').filter(Boolean)
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
  }
}

function CustomerDetailPage() {
  const params = useParams()
  const customerId = Array.isArray(params?.customerId) ? params.customerId[0] : params?.customerId
  const router = useRouter()

  const { customer, isLoading, error } = useCustomerDetail(customerId)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address1: '',
    address2: '',
    country: '',
    state: '',
    postcode: '',
  })
  const [saveMessage, setSaveMessage] = useState('')
  const [saveError, setSaveError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const meta = customer?.meta || {}
  const nameParts = splitName(customer?.name || '')
  const firstName = meta.billing_first_name || meta.first_name || nameParts.firstName || ''
  const lastName = meta.billing_last_name || meta.last_name || nameParts.lastName || ''
  const email = customer?.email || ''
  const phone = customer?.phone || meta.billing_phone || ''
  const company = meta.billing_company || ''
  const address1 = meta.billing_address_1 || ''
  const address2 = meta.billing_address_2 || ''
  const state = meta.billing_state || ''
  const postcode = meta.billing_postcode || ''
  const country = meta.billing_country || ''

  useEffect(() => {
    setForm({
      firstName,
      lastName,
      phone,
      address1,
      address2,
      country,
      state,
      postcode,
    })
  }, [firstName, lastName, phone, address1, address2, country, state, postcode])

  const handleSave = async () => {
    if (!customerId || isSaving) return
    setSaveMessage('')
    setSaveError('')
    setIsSaving(true)
    try {
      await updateCustomerById(customerId, {
        first_name: form.firstName,
        last_name: form.lastName,
        phone: form.phone,
        address_line_1: form.address1,
        address_line_2: form.address2,
        country: form.country,
        state: form.state,
        postal_code: form.postcode,
      })
      setSaveMessage('Profile details updated.')
    } catch (err) {
      setSaveError(err?.message || 'Unable to save profile details.')
    } finally {
      setIsSaving(false)
    }
  }

  const activeTab = 'Profile'
  const detailTabs = useMemo(() => getCustomerDetailTabs(customerId), [customerId])
  const mobileNavItems = useMemo(
    () => [
      {
        label: 'Addresses',
        description: 'Billing & shipping',
        path: `/backend/admin/customers/${customerId || ''}/addresses`,
      },
      {
        label: 'About the user',
        description: 'Bio & personal info',
        path: `/backend/admin/customers/${customerId || ''}/about`,
      },
      {
        label: 'Security',
        description: 'Password & authentication',
        path: `/backend/admin/customers/${customerId || ''}/security`,
      },
    ],
    [customerId],
  )

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
                <h1 className="mt-2 text-2xl font-semibold text-slate-900">Customer onboarding</h1>
                <p className="mt-2 text-sm text-slate-500">{customer?.name || 'Customer details'}</p>
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

            <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:hidden">
              <p className="text-sm font-semibold text-slate-900">Profile</p>
              <p className="mt-1 text-xs text-slate-500">User details & preferences</p>
              <div className="mt-5 space-y-3">
                {mobileNavItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => router.push(item.path)}
                    className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-left transition hover:border-slate-300"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-700">{item.label}</p>
                      <p className="text-[11px] text-slate-400">{item.description}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
                      Open
                    </span>
                  </button>
                ))}
              </div>
            </section>

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

            <div className="mt-8 hidden space-y-6 lg:block">
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
                  <div className="ml-auto rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-500">
                    {customer?.job_title || 'Customer'}
                  </div>
                </div>

                {isLoading && <CustomerSkeletonCard withContainer={false} showHeader={false} rows={6} className="mt-6" />}
                {error && <p className="mt-6 text-sm text-rose-500">{error}</p>}

                {!isLoading && !error && (
                  <div className="mt-6 space-y-5">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Welcome to the customer page</p>
                      <p className="text-xs text-slate-500">Edit core customer profile fields.</p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-2 text-xs font-semibold text-slate-500">
                        <span className="uppercase tracking-[0.2em]">First name</span>
                        <input
                          value={form.firstName}
                          onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))}
                          placeholder="--"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                        />
                      </label>
                      <label className="space-y-2 text-xs font-semibold text-slate-500">
                        <span className="uppercase tracking-[0.2em]">Last name</span>
                        <input
                          value={form.lastName}
                          onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))}
                          placeholder="--"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                        />
                      </label>
                    </div>

                    <label className="space-y-2 text-xs font-semibold text-slate-500">
                      <span className="uppercase tracking-[0.2em]">Customer name or company</span>
                      <input readOnly value={company || customer?.name || ''} placeholder="--" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700" />
                    </label>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-2 text-xs font-semibold text-slate-500">
                        <span className="uppercase tracking-[0.2em]">Email address</span>
                        <input readOnly value={email} placeholder="--" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700" />
                      </label>
                      <label className="space-y-2 text-xs font-semibold text-slate-500">
                        <span className="uppercase tracking-[0.2em]">Mobile number</span>
                        <input
                          value={form.phone}
                          onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                          placeholder="--"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                        />
                      </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-2 text-xs font-semibold text-slate-500">
                        <span className="uppercase tracking-[0.2em]">Address line 1</span>
                        <input
                          value={form.address1}
                          onChange={(event) => setForm((prev) => ({ ...prev, address1: event.target.value }))}
                          placeholder="--"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                        />
                      </label>
                      <label className="space-y-2 text-xs font-semibold text-slate-500">
                        <span className="uppercase tracking-[0.2em]">Address line 2</span>
                        <input
                          value={form.address2}
                          onChange={(event) => setForm((prev) => ({ ...prev, address2: event.target.value }))}
                          placeholder="--"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                        />
                      </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <label className="space-y-2 text-xs font-semibold text-slate-500">
                        <span className="uppercase tracking-[0.2em]">Country</span>
                        <input
                          value={form.country}
                          onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value }))}
                          placeholder="--"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                        />
                      </label>
                      <label className="space-y-2 text-xs font-semibold text-slate-500">
                        <span className="uppercase tracking-[0.2em]">State / Province</span>
                        <input
                          value={form.state}
                          onChange={(event) => setForm((prev) => ({ ...prev, state: event.target.value }))}
                          placeholder="--"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                        />
                      </label>
                      <label className="space-y-2 text-xs font-semibold text-slate-500">
                        <span className="uppercase tracking-[0.2em]">Postal code</span>
                        <input
                          value={form.postcode}
                          onChange={(event) => setForm((prev) => ({ ...prev, postcode: event.target.value }))}
                          placeholder="--"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                        />
                      </label>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button type="button" onClick={() => router.back()} className="rounded-full border border-slate-200 bg-white px-6 py-2 text-sm font-semibold text-slate-600">
                        Back
                      </button>
                      <LoadingButton
                        type="button"
                        isLoading={isSaving}
                        onClick={handleSave}
                        className="rounded-full bg-slate-900 px-6 py-2 text-sm font-semibold text-white"
                      >
                        Save changes
                      </LoadingButton>
                    </div>
                    {saveMessage ? <p className="text-xs text-emerald-600">{saveMessage}</p> : null}
                    {saveError ? <p className="text-xs text-rose-500">{saveError}</p> : null}
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

export default CustomerDetailPage
