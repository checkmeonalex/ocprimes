'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'

export default function ResetPasswordForm() {
  const router = useRouter()
  const supabase = useMemo(() => createBrowserSupabaseClient(), [])
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isReady, setIsReady] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let mounted = true
    const run = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (mounted) {
        setHasSession(Boolean(session))
        setIsReady(true)
      }
    }
    run()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setHasSession(Boolean(session))
      setIsReady(true)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isSubmitting) return

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)
    setError('')
    setMessage('')

    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError(updateError.message || 'Unable to reset password.')
      setIsSubmitting(false)
      return
    }

    setMessage('Password updated. Redirecting to sign in...')
    setTimeout(() => {
      router.push('/login')
      router.refresh()
    }, 700)
  }

  if (!isReady) {
    return <p className='mt-6 text-sm text-slate-500'>Validating reset link...</p>
  }

  if (!hasSession) {
    return (
      <div className='mt-6 space-y-3'>
        <p className='text-sm text-rose-500'>
          This reset link is invalid or expired. Request a new reset link.
        </p>
        <Link href='/forgot-password' className='text-sm font-semibold text-slate-700 hover:text-slate-900'>
          Request a new link
        </Link>
      </div>
    )
  }

  return (
    <form className='mt-8 grid gap-4' onSubmit={handleSubmit}>
      {error ? <p className='text-sm text-rose-500'>{error}</p> : null}
      {message ? <p className='text-sm text-emerald-600'>{message}</p> : null}

      <label className='space-y-2 text-sm font-semibold text-slate-700'>
        New password
        <input
          type='password'
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder='At least 8 characters'
          autoComplete='new-password'
          className='w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none'
          required
        />
      </label>

      <label className='space-y-2 text-sm font-semibold text-slate-700'>
        Confirm password
        <input
          type='password'
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder='Repeat your password'
          autoComplete='new-password'
          className='w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none'
          required
        />
      </label>

      <button
        type='submit'
        disabled={isSubmitting}
        className='mt-2 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70'
      >
        {isSubmitting ? 'Saving...' : 'Reset password'}
      </button>
    </form>
  )
}
