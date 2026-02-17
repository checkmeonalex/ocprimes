import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import AdminSidebar from '@/components/AdminSidebar'
import AdminDesktopHeader from '@/components/admin/AdminDesktopHeader'
import CustomerSkeletonCard from './components/CustomerSkeletonCard'
import LoadingButton from '../../../../components/LoadingButton'
import { getCustomerDetailTabs, buildInitials } from './lib/customerDetailShared.mjs'
import { useCustomerDetail } from './lib/useCustomerDetail.mjs'
import { deleteCustomerById, sendCustomerPasswordReset, setCustomerPassword } from './lib/customerApi.mjs'

const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*-_+'
const PASSWORD_LENGTH = 16

const generatePassword = () => {
  const chars = PASSWORD_CHARS
  const length = PASSWORD_LENGTH
  let result = ''
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const values = new Uint32Array(length)
    window.crypto.getRandomValues(values)
    for (let index = 0; index < length; index += 1) {
      result += chars[values[index] % chars.length]
    }
  } else {
    for (let index = 0; index < length; index += 1) {
      result += chars[Math.floor(Math.random() * chars.length)]
    }
  }
  return result
}

function CustomerSecurityPage() {
  const router = useRouter()
  const params = useParams()
  const customerId = Array.isArray(params?.customerId) ? params.customerId[0] : params?.customerId

  const { customer, isLoading, error } = useCustomerDetail(customerId)
  const [newPassword, setNewPassword] = useState(() => generatePassword())
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [saveError, setSaveError] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [resetMessage, setResetMessage] = useState('')
  const [resetError, setResetError] = useState('')
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteMessage, setDeleteMessage] = useState('')
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    setNewPassword(generatePassword())
  }, [customerId])

  const handleSavePassword = async () => {
    if (!customerId) return
    setSaveMessage('')
    setSaveError('')
    if (!newPassword) {
      setSaveError('Password is required.')
      return
    }
    setIsSaving(true)
    try {
      await setCustomerPassword(customerId, newPassword)
      setSaveMessage('Password updated successfully.')
    } catch (err) {
      setSaveError(err?.message || 'Unable to update password.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSendReset = async () => {
    if (!customerId) return
    setResetMessage('')
    setResetError('')
    setIsSending(true)
    try {
      const payload = await sendCustomerPasswordReset(customerId)
      const recipient = payload?.email || customer?.email || 'the customer'
      setResetMessage(`Security alert sent. A password reset link has been emailed to ${recipient}.`)
    } catch (err) {
      setResetError(err?.message || 'Unable to send reset link.')
    } finally {
      setIsSending(false)
    }
  }

  const handleDeleteCustomer = async () => {
    if (!customerId) return
    setDeleteMessage('')
    setDeleteError('')
    if (deleteConfirmation.trim() !== 'DELETE') {
      setDeleteError('Type DELETE to confirm customer deletion.')
      return
    }
    setIsDeleting(true)
    try {
      await deleteCustomerById(customerId, deleteConfirmation.trim())
      setDeleteMessage('Customer account deleted successfully.')
      router.push('/backend/admin/customers')
      router.refresh()
    } catch (err) {
      setDeleteError(err?.message || 'Unable to delete customer.')
    } finally {
      setIsDeleting(false)
    }
  }

  const activeTab = 'Security'
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
                <h1 className="mt-2 text-2xl font-semibold text-slate-900">Security</h1>
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
                    <p className="text-xs text-slate-500">{customer?.email || '--'}</p>
                  </div>
                </div>

                {isLoading && <CustomerSkeletonCard withContainer={false} showHeader={false} rows={6} className="mt-6" />}
                {error && <p className="mt-6 text-sm text-rose-500">{error}</p>}

                {!isLoading && !error && (
                  <div className="mt-6 space-y-6">
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-slate-900">Update password</p>
                      <p className="text-xs text-slate-500">Generate a new password and save it directly to the customer account.</p>
                      <input
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm text-slate-700 outline-none"
                        placeholder="Enter new password"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setNewPassword(generatePassword())}
                          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600"
                        >
                          Generate
                        </button>
                        <LoadingButton
                          type="button"
                          isLoading={isSaving}
                          onClick={handleSavePassword}
                          className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
                        >
                          Save password
                        </LoadingButton>
                      </div>
                      {saveMessage && <p className="text-xs text-emerald-600">{saveMessage}</p>}
                      {saveError && <p className="text-xs text-rose-500">{saveError}</p>}
                    </div>

                    <div className="space-y-3 border-t border-slate-100 pt-4">
                      <p className="text-sm font-semibold text-slate-900">Password reset email</p>
                      <p className="text-xs text-slate-500">
                        Send a security alert and password reset email to the customer inbox.
                      </p>
                      <LoadingButton
                        type="button"
                        isLoading={isSending}
                        onClick={handleSendReset}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700"
                      >
                        Send reset link
                      </LoadingButton>
                      {resetMessage && <p className="text-xs text-emerald-600">{resetMessage}</p>}
                      {resetError && <p className="text-xs text-rose-500">{resetError}</p>}
                    </div>

                    <div className="space-y-3 border-t border-rose-100 pt-4">
                      <p className="text-sm font-semibold text-rose-700">Delete customer account</p>
                      <p className="text-xs text-rose-600">
                        Permanently remove this customer account and related profile access.
                      </p>
                      <div className="max-w-sm">
                        <input
                          value={deleteConfirmation}
                          onChange={(event) => setDeleteConfirmation(event.target.value)}
                          className="h-11 w-full rounded-2xl border border-rose-200 px-4 text-sm text-slate-700 outline-none"
                          placeholder="Type DELETE"
                        />
                      </div>
                      <LoadingButton
                        type="button"
                        isLoading={isDeleting}
                        onClick={handleDeleteCustomer}
                        className="rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white"
                      >
                        Delete customer
                      </LoadingButton>
                      {deleteMessage && <p className="text-xs text-emerald-600">{deleteMessage}</p>}
                      {deleteError && <p className="text-xs text-rose-500">{deleteError}</p>}
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

export default CustomerSecurityPage
