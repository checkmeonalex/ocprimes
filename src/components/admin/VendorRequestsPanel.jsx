'use client'

import { useEffect, useMemo, useState } from 'react'

const statusLabelMap = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
}

export default function VendorRequestsPanel() {
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState('')
  const [isResending, setIsResending] = useState('')
  const [setupLinks, setSetupLinks] = useState({})
  const pendingCount = useMemo(
    () => items.filter((item) => item.status === 'pending').length,
    [items],
  )

  const loadRequests = async () => {
    setIsLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin/vendor-requests')
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        setError(payload?.error || 'Unable to load vendor requests.')
        setItems([])
        return
      }
      setItems(Array.isArray(payload?.items) ? payload.items : [])
    } catch {
      setError('Unable to load vendor requests.')
      setItems([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [])

  const handleDecision = async (requestId, status) => {
    setError('')
    setNotice('')
    setIsUpdating(requestId)
    try {
      const response = await fetch('/api/admin/vendor-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, status }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        setError(payload?.error || 'Unable to update vendor request.')
        return
      }
      if (payload?.setupLink) {
        setSetupLinks((prev) => ({ ...prev, [requestId]: payload.setupLink }))
      }
      if (payload?.warning) {
        setNotice(payload.warning)
      }
      await loadRequests()
      if (status === 'approved') {
        window.dispatchEvent(new Event('admin-users-refresh'))
      }
    } catch {
      setError('Unable to update vendor request.')
    } finally {
      setIsUpdating('')
    }
  }

  const handleResendApproval = async (requestId) => {
    setError('')
    setNotice('')
    setIsResending(requestId)
    try {
      const response = await fetch('/api/admin/vendor-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        setError(payload?.error || 'Unable to resend approval email.')
        return
      }
      if (payload?.setupLink) {
        setSetupLinks((prev) => ({ ...prev, [requestId]: payload.setupLink }))
      }
      if (payload?.warning) {
        setNotice(payload.warning)
      } else {
        setNotice('Approval email sent.')
      }
    } catch {
      setError('Unable to resend approval email.')
    } finally {
      setIsResending('')
    }
  }

  const handleCopySetupLink = async (requestId) => {
    const link = setupLinks[requestId]
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setNotice('Setup link copied. Send it to the vendor securely.')
    } catch {
      setError('Unable to copy setup link.')
    }
  }

  return (
    <div className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
      <div className='flex items-center justify-between gap-3'>
        <div>
          <p className='text-xs font-semibold text-slate-500'>Vendor access requests</p>
          <p className='text-sm text-slate-500'>
            Approve sellers manually. Approval sends a password setup email.
          </p>
        </div>
        <span className='rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-600'>
          {pendingCount} pending
        </span>
      </div>

      {isLoading ? <p className='mt-4 text-sm text-slate-500'>Loading requests...</p> : null}
      {error ? <p className='mt-4 text-sm text-rose-500'>{error}</p> : null}
      {notice ? <p className='mt-4 text-sm text-emerald-600'>{notice}</p> : null}

      {!isLoading && !error && items.length === 0 ? (
        <p className='mt-4 text-sm text-slate-500'>No vendor requests yet.</p>
      ) : null}

      <div className='mt-4 space-y-3'>
        {items.map((item) => (
          <div
            key={item.id}
            className='flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/60 px-4 py-3 text-sm'
          >
            <div className='min-w-0'>
              <p className='truncate text-sm font-semibold text-slate-900'>{item.brand_name}</p>
              <p className='truncate text-xs text-slate-500'>
                {item.full_name} · {item.email}
              </p>
              <p className='text-xs text-slate-400'>
                {item.shipping_country} · Requested {new Date(item.requested_at).toLocaleString()}
              </p>
            </div>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                item.status === 'approved'
                  ? 'bg-emerald-100 text-emerald-700'
                  : item.status === 'rejected'
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-amber-100 text-amber-700'
              }`}
            >
              {statusLabelMap[item.status] || 'Pending'}
            </span>

            {item.status === 'pending' ? (
              <div className='flex items-center gap-2'>
                <button
                  type='button'
                  onClick={() => handleDecision(item.id, 'approved')}
                  disabled={isUpdating === item.id}
                  className='rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60'
                >
                  Approve
                </button>
                <button
                  type='button'
                  onClick={() => handleDecision(item.id, 'rejected')}
                  disabled={isUpdating === item.id}
                  className='rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 disabled:opacity-60'
                >
                  Reject
                </button>
              </div>
            ) : null}

            {item.status === 'approved' ? (
              <div className='flex items-center gap-2'>
                <button
                  type='button'
                  onClick={() => handleResendApproval(item.id)}
                  disabled={isResending === item.id}
                  className='rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 disabled:opacity-60'
                >
                  {isResending === item.id ? 'Sending...' : 'Resend approval mail'}
                </button>
                {setupLinks[item.id] ? (
                  <button
                    type='button'
                    onClick={() => handleCopySetupLink(item.id)}
                    className='rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600'
                  >
                    Copy setup link
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
