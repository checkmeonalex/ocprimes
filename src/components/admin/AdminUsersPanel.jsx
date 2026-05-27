'use client'

import { useEffect, useMemo, useState } from 'react'

const roleClassMap = {
  admin: 'bg-blue-100 text-blue-600',
  customer: 'bg-slate-200 text-slate-600',
}

export default function AdminUsersPanel() {
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [pendingDelete, setPendingDelete] = useState(null)

  const totalCount = items.length
  const adminCount = useMemo(
    () => items.filter((item) => item.role === 'admin').length,
    [items],
  )

  const loadUsers = async () => {
    setIsLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin/users')
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        setError(payload?.error || 'Unable to load users.')
        setItems([])
        return
      }
      setItems(Array.isArray(payload?.items) ? payload.items : [])
    } catch {
      setError('Unable to load users.')
      setItems([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    const handleRefresh = () => {
      loadUsers()
    }

    window.addEventListener('admin-users-refresh', handleRefresh)
    return () => window.removeEventListener('admin-users-refresh', handleRefresh)
  }, [])

  const handleDelete = async (userId) => {
    if (pendingDelete) return
    const confirmed = window.confirm('Delete this user account? This cannot be undone.')
    if (!confirmed) return

    setPendingDelete(userId)
    try {
      const response = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        setError(payload?.error || 'Unable to delete user.')
        return
      }
      await loadUsers()
    } catch {
      setError('Unable to delete user.')
    } finally {
      setPendingDelete(null)
    }
  }

  return (
    <div className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <p className='text-xs font-semibold text-slate-500'>User accounts</p>
          <p className='text-sm text-slate-500'>Manage customer and admin accounts.</p>
        </div>
        <div className='flex items-center gap-2 text-xs text-slate-500'>
          <span className='rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600'>
            {totalCount} total
          </span>
          <span className='rounded-full bg-blue-100 px-3 py-1 font-semibold text-blue-600'>
            {adminCount} admins
          </span>
        </div>
      </div>

      {isLoading ? <p className='mt-4 text-sm text-slate-500'>Loading users...</p> : null}
      {error ? <p className='mt-4 text-sm text-rose-500'>{error}</p> : null}

      {!isLoading && !error && items.length === 0 ? (
        <p className='mt-4 text-sm text-slate-500'>No users found.</p>
      ) : null}

      <div className='mt-4 space-y-3'>
        {items.map((item) => (
          <div
            key={item.id}
            className='flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/60 px-4 py-3 text-sm'
          >
            <div>
              <p className='text-sm font-semibold text-slate-900'>{item.email}</p>
              <p className='text-xs text-slate-400'>Created {new Date(item.created_at).toLocaleString()}</p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                roleClassMap[item.role] || roleClassMap.customer
              }`}
            >
              {item.role}
            </span>
            <button
              onClick={() => handleDelete(item.id)}
              disabled={pendingDelete === item.id}
              className='rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 disabled:opacity-60'
            >
              {pendingDelete === item.id ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
