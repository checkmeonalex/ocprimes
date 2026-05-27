'use client'

import { useEffect, useMemo, useState } from 'react'

const statusLabelMap = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
}

export default function AdminRequestsPanel() {
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const pendingCount = useMemo(
    () => items.filter((item) => item.status === 'pending').length,
    [items],
  )

  const loadRequests = async () => {
    setIsLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin/requests')
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        setError(payload?.error || 'Unable to load admin requests.')
        setItems([])
        return
      }
      setItems(Array.isArray(payload?.items) ? payload.items : [])
    } catch {
      setError('Unable to load admin requests.')
      setItems([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [])

  const handleDecision = async (requestId, status) => {
    try {
      const response = await fetch('/api/admin/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, status }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        setError(payload?.error || 'Unable to update request.')
        return
      }
      await loadRequests()
      if (status === 'approved') {
        window.dispatchEvent(new Event('admin-users-refresh'))
      }
    } catch {
      setError('Unable to update request.')
    }
  }

  return (
    <div className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
      <div className='flex items-center justify-between gap-3'>
        <div>
          <p className='text-xs font-semibold text-slate-500'>Admin access requests</p>
          <p className='text-sm text-slate-500'>Review and approve admin onboarding.</p>
        </div>
        <span className='rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-600'>
          {pendingCount} pending
        </span>
      </div>

      {isLoading ? (
        <p className='mt-4 text-sm text-slate-500'>Loading requests...</p>
      ) : null}

      {error ? <p className='mt-4 text-sm text-rose-500'>{error}</p> : null}

      {!isLoading && !error && items.length === 0 ? (
        <p className='mt-4 text-sm text-slate-500'>No admin requests yet.</p>
      ) : null}

      <div className='mt-4 space-y-3'>
        {items.map((item) => (
          <div
            key={item.id}
            className='flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/60 px-4 py-3 text-sm'
          >
            <div>
              <p className='text-sm font-semibold text-slate-900'>{item.email}</p>
              <p className='text-xs text-slate-400'>Requested {new Date(item.requested_at).toLocaleString()}</p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                item.status === 'approved'
                  ? 'bg-emerald-100 text-emerald-600'
                  : item.status === 'rejected'
                    ? 'bg-rose-100 text-rose-600'
                    : 'bg-amber-100 text-amber-600'
              }`}
            >
              {statusLabelMap[item.status] || 'Pending'}
            </span>
            {item.status === 'pending' ? (
              <div className='flex items-center gap-2'>
                <button
                  onClick={() => handleDecision(item.id, 'approved')}
                  className='rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white'
                >
                  Approve
                </button>
                <button
                  onClick={() => handleDecision(item.id, 'rejected')}
                  className='rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600'
                >
                  Reject
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
