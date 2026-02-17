'use client'

import Link from 'next/link'
import { useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)
    setError('')
    setNotice('')

    try {
      const response = await fetch('/api/auth/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        const supabase = createBrowserSupabaseClient()
        const redirectTo = `${window.location.origin}/reset-password`
        const { error: fallbackError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo,
        })
        if (fallbackError) {
          setError(payload?.error || fallbackError.message || 'Unable to send reset link.')
          return
        }
      }
      setNotice(
        payload?.message ||
          'If an account exists for this email, a reset link has been sent.',
      )
    } catch {
      setError('Unable to send reset link. Try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className='mt-8 grid gap-4' onSubmit={handleSubmit}>
      <label className='space-y-2 text-sm font-semibold text-slate-700'>
        Email address
        <input
          type='email'
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder='you@ocprimes.com'
          autoComplete='email'
          className='w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none'
          required
        />
      </label>

      {error ? <p className='text-sm text-rose-500'>{error}</p> : null}
      {notice ? <p className='text-sm text-emerald-600'>{notice}</p> : null}

      <button
        type='submit'
        disabled={isSubmitting}
        className='mt-2 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70'
      >
        {isSubmitting ? 'Sending link...' : 'Send reset link'}
      </button>

      <div className='text-sm text-slate-500'>
        <Link href='/login' className='font-semibold text-slate-700 hover:text-slate-900'>
          Back to sign in
        </Link>
      </div>
    </form>
  )
}
