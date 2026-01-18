'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function SignupForm({
  endpoint = '/api/auth/signup',
  successMessage = 'Check your inbox to confirm your email before signing in.',
  signInHref = '/login',
  signInLabel = 'Sign in',
  signInText = 'Already have access?',
}) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, confirmPassword }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        setError(payload?.error || 'Unable to create account.')
        return
      }

      if (payload?.requiresEmailConfirmation) {
        setMessage(successMessage)
        return
      }

      router.push(signInHref)
    } catch {
      setError('Unable to create account. Try again.')
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

      <label className='space-y-2 text-sm font-semibold text-slate-700'>
        Password
        <input
          type='password'
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder='At least 8 characters'
          autoComplete='new-password'
          className='w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none'
          minLength={8}
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
          minLength={8}
          required
        />
      </label>

      {error ? <p className='text-sm text-rose-500'>{error}</p> : null}
      {message ? <p className='text-sm text-emerald-600'>{message}</p> : null}

      <button
        type='submit'
        disabled={isSubmitting}
        className='mt-2 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70'
      >
        {isSubmitting ? 'Creating account...' : 'Create account'}
      </button>

      <div className='flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500'>
        <span>{signInText}</span>
        <Link href={signInHref} className='font-semibold text-slate-700 hover:text-slate-900'>
          {signInLabel}
        </Link>
      </div>
    </form>
  )
}
