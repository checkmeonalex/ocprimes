'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useAuthUser } from '@/lib/auth/useAuthUser.ts'

const getDisplayName = (email) => {
  if (!email) return 'Guest'
  const [local] = email.split('@')
  return local || email
}

export default function UserMenu() {
  const router = useRouter()
  const { user, isLoading } = useAuthUser()
  const [isOpen, setIsOpen] = useState(false)
  const [requestMessage, setRequestMessage] = useState('')
  const [isRequesting, setIsRequesting] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/signout', { method: 'POST' })
    setIsOpen(false)
    router.refresh()
    router.push('/login')
  }

  const handleRequestAdmin = async () => {
    if (isRequesting) return
    setIsRequesting(true)
    setRequestMessage('')
    try {
      const response = await fetch('/api/auth/request-admin', { method: 'POST' })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        setRequestMessage(payload?.error || 'Unable to submit request.')
        return
      }
      setRequestMessage('Request submitted for admin approval.')
    } catch {
      setRequestMessage('Unable to submit request.')
    } finally {
      setIsRequesting(false)
    }
  }

  const displayName = getDisplayName(user?.email)
  const avatarInitial = displayName.charAt(0).toUpperCase()

  return (
    <div className='relative' ref={menuRef}>
      <button
        type='button'
        onClick={() => setIsOpen((prev) => !prev)}
        className='flex items-center space-x-2'
        aria-expanded={isOpen}
        aria-haspopup='menu'
      >
        <div className='w-8 h-8 bg-pink-400 rounded-full flex items-center justify-center'>
          <span className='text-white text-sm font-semibold'>{avatarInitial}</span>
        </div>
        <span className='text-gray-700 text-sm font-medium'>
          {isLoading ? 'Loading...' : displayName}
        </span>
      </button>

      {isOpen && (
        <div
          className='absolute right-0 mt-3 w-56 rounded-2xl border border-gray-200 bg-white shadow-lg p-3 z-50'
          role='menu'
        >
          {user ? (
            <>
              <div className='px-2 py-2'>
                <p className='text-xs text-gray-400'>Signed in as</p>
                <p className='text-sm font-semibold text-gray-900'>{displayName}</p>
                <p className='text-xs text-gray-500'>{user.email}</p>
              </div>
              {requestMessage ? (
                <p className='px-2 text-xs text-gray-500'>{requestMessage}</p>
              ) : null}
              <button
                onClick={handleRequestAdmin}
                disabled={isRequesting}
                className='mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300 disabled:opacity-60'
              >
                {isRequesting ? 'Submitting...' : 'Request admin access'}
              </button>
              <button
                onClick={handleLogout}
                className='mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300'
              >
                Logout
              </button>
            </>
          ) : (
            <div className='space-y-2'>
              <p className='text-sm text-gray-600 px-2'>You are not signed in.</p>
              <Link
                href='/login'
                className='block w-full rounded-xl bg-gray-900 px-3 py-2 text-center text-sm font-semibold text-white'
              >
                Sign in
              </Link>
              <Link
                href='/signup'
                className='block w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-center text-sm font-semibold text-gray-700'
              >
                Create account
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
