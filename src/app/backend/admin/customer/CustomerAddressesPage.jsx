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

const InfoField = ({ label, value, onChange }) => (
  <label className="space-y-2 text-xs font-semibold text-slate-500">
    <span className="uppercase tracking-[0.2em]">{label}</span>
    <input
      value={value || ''}
      onChange={(event) => onChange(event.target.value)}
      placeholder="--"
      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
    />
  </label>
)

function CustomerAddressesPage() {
  const params = useParams()
  const customerId = Array.isArray(params?.customerId) ? params.customerId[0] : params?.customerId

  const { customer, isLoading, error } = useCustomerDetail(customerId)
  const [useBillingForShipping, setUseBillingForShipping] = useState(false)
  const [billing, setBilling] = useState({
    firstName: '',
    lastName: '',
    company: '',
    address1: '',
    address2: '',
    city: '',
    postcode: '',
    country: '',
    state: '',
    phone: '',
    email: '',
  })
  const [shipping, setShipping] = useState({
    firstName: '',
    lastName: '',
    company: '',
    address1: '',
    address2: '',
    city: '',
    postcode: '',
    country: '',
    state: '',
    phone: '',
    email: '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [saveError, setSaveError] = useState('')

  const meta = customer?.meta || {}
  const billingFields = {
    firstName: meta.billing_first_name || meta.first_name || '',
    lastName: meta.billing_last_name || meta.last_name || '',
    company: meta.billing_company || '',
    address1: meta.billing_address_1 || '',
    address2: meta.billing_address_2 || '',
    city: meta.billing_city || '',
    postcode: meta.billing_postcode || '',
    country: meta.billing_country || '',
    state: meta.billing_state || '',
    phone: meta.billing_phone || customer?.phone || '',
    email: meta.billing_email || customer?.email || '',
  }

  const shippingRaw = {
    firstName: meta.shipping_first_name || '',
    lastName: meta.shipping_last_name || '',
    company: meta.shipping_company || '',
    address1: meta.shipping_address_1 || '',
    address2: meta.shipping_address_2 || '',
    city: meta.shipping_city || '',
    postcode: meta.shipping_postcode || '',
    country: meta.shipping_country || '',
    state: meta.shipping_state || '',
    phone: meta.shipping_phone || '',
    email: meta.shipping_email || '',
  }

  const shippingFields = useBillingForShipping ? billingFields : shippingRaw
  const whatsappNumber = meta.whatsapp_number || meta.whatsapp || ''

  useEffect(() => {
    setBilling(billingFields)
    setShipping(shippingRaw)
  }, [
    billingFields.firstName,
    billingFields.lastName,
    billingFields.company,
    billingFields.address1,
    billingFields.address2,
    billingFields.city,
    billingFields.postcode,
    billingFields.country,
    billingFields.state,
    billingFields.phone,
    billingFields.email,
    shippingRaw.firstName,
    shippingRaw.lastName,
    shippingRaw.company,
    shippingRaw.address1,
    shippingRaw.address2,
    shippingRaw.city,
    shippingRaw.postcode,
    shippingRaw.country,
    shippingRaw.state,
    shippingRaw.phone,
    shippingRaw.email,
  ])

  const handleSave = async () => {
    if (!customerId || isSaving) return
    setSaveError('')
    setSaveMessage('')
    setIsSaving(true)
    try {
      await updateCustomerById(customerId, {
        billing: {
          first_name: billing.firstName,
          last_name: billing.lastName,
          company: billing.company,
          address_line_1: billing.address1,
          address_line_2: billing.address2,
          city: billing.city,
          state: billing.state,
          postal_code: billing.postcode,
          country: billing.country,
          phone: billing.phone,
          email: billing.email,
        },
        shipping: {
          first_name: (useBillingForShipping ? billing : shipping).firstName,
          last_name: (useBillingForShipping ? billing : shipping).lastName,
          company: (useBillingForShipping ? billing : shipping).company,
          address_line_1: (useBillingForShipping ? billing : shipping).address1,
          address_line_2: (useBillingForShipping ? billing : shipping).address2,
          city: (useBillingForShipping ? billing : shipping).city,
          state: (useBillingForShipping ? billing : shipping).state,
          postal_code: (useBillingForShipping ? billing : shipping).postcode,
          country: (useBillingForShipping ? billing : shipping).country,
          phone: (useBillingForShipping ? billing : shipping).phone,
          email: (useBillingForShipping ? billing : shipping).email,
        },
      })
      setSaveMessage('Address details updated.')
    } catch (err) {
      setSaveError(err?.message || 'Unable to save addresses.')
    } finally {
      setIsSaving(false)
    }
  }

  const activeTab = 'Addresses'
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
                <h1 className="mt-2 text-2xl font-semibold text-slate-900">Addresses</h1>
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

                {isLoading && <CustomerSkeletonCard withContainer={false} showHeader={false} rows={8} className="mt-5" />}
                {error && <p className="mt-5 text-sm text-rose-500">{error}</p>}

                {!isLoading && !error && (
                  <div className="mt-5 space-y-8">
                    <div className="space-y-4">
                      <p className="text-sm font-semibold text-slate-900">Billing address</p>
                      <div className="grid gap-4 md:grid-cols-2">
                        <InfoField label="First name" value={billing.firstName} onChange={(value) => setBilling((prev) => ({ ...prev, firstName: value }))} />
                        <InfoField label="Last name" value={billing.lastName} onChange={(value) => setBilling((prev) => ({ ...prev, lastName: value }))} />
                        <InfoField label="Company" value={billing.company} onChange={(value) => setBilling((prev) => ({ ...prev, company: value }))} />
                        <InfoField label="Address line 1" value={billing.address1} onChange={(value) => setBilling((prev) => ({ ...prev, address1: value }))} />
                        <InfoField label="Address line 2" value={billing.address2} onChange={(value) => setBilling((prev) => ({ ...prev, address2: value }))} />
                        <InfoField label="City" value={billing.city} onChange={(value) => setBilling((prev) => ({ ...prev, city: value }))} />
                        <InfoField label="State" value={billing.state} onChange={(value) => setBilling((prev) => ({ ...prev, state: value }))} />
                        <InfoField label="Postal code" value={billing.postcode} onChange={(value) => setBilling((prev) => ({ ...prev, postcode: value }))} />
                        <InfoField label="Country" value={billing.country} onChange={(value) => setBilling((prev) => ({ ...prev, country: value }))} />
                        <InfoField label="Phone" value={billing.phone} onChange={(value) => setBilling((prev) => ({ ...prev, phone: value }))} />
                        <InfoField label="Email" value={billing.email} onChange={(value) => setBilling((prev) => ({ ...prev, email: value }))} />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-900">Shipping address</p>
                        <button
                          type="button"
                          onClick={() => setUseBillingForShipping((prev) => !prev)}
                          className={`inline-flex h-7 w-12 items-center rounded-full transition ${
                            useBillingForShipping ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                          aria-label="Use billing for shipping"
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                              useBillingForShipping ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <InfoField label="First name" value={useBillingForShipping ? billing.firstName : shipping.firstName} onChange={(value) => setShipping((prev) => ({ ...prev, firstName: value }))} />
                        <InfoField label="Last name" value={useBillingForShipping ? billing.lastName : shipping.lastName} onChange={(value) => setShipping((prev) => ({ ...prev, lastName: value }))} />
                        <InfoField label="Company" value={useBillingForShipping ? billing.company : shipping.company} onChange={(value) => setShipping((prev) => ({ ...prev, company: value }))} />
                        <InfoField label="Address line 1" value={useBillingForShipping ? billing.address1 : shipping.address1} onChange={(value) => setShipping((prev) => ({ ...prev, address1: value }))} />
                        <InfoField label="Address line 2" value={useBillingForShipping ? billing.address2 : shipping.address2} onChange={(value) => setShipping((prev) => ({ ...prev, address2: value }))} />
                        <InfoField label="City" value={useBillingForShipping ? billing.city : shipping.city} onChange={(value) => setShipping((prev) => ({ ...prev, city: value }))} />
                        <InfoField label="State" value={useBillingForShipping ? billing.state : shipping.state} onChange={(value) => setShipping((prev) => ({ ...prev, state: value }))} />
                        <InfoField label="Postal code" value={useBillingForShipping ? billing.postcode : shipping.postcode} onChange={(value) => setShipping((prev) => ({ ...prev, postcode: value }))} />
                        <InfoField label="Country" value={useBillingForShipping ? billing.country : shipping.country} onChange={(value) => setShipping((prev) => ({ ...prev, country: value }))} />
                        <InfoField label="Phone" value={useBillingForShipping ? billing.phone : shipping.phone} onChange={(value) => setShipping((prev) => ({ ...prev, phone: value }))} />
                        <InfoField label="Email" value={useBillingForShipping ? billing.email : shipping.email} onChange={(value) => setShipping((prev) => ({ ...prev, email: value }))} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">WhatsApp</p>
                      <input
                        value={whatsappNumber}
                        placeholder="--"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <LoadingButton
                        type="button"
                        isLoading={isSaving}
                        onClick={handleSave}
                        className="rounded-full bg-slate-900 px-6 py-2 text-sm font-semibold text-white"
                      >
                        Save addresses
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

export default CustomerAddressesPage
