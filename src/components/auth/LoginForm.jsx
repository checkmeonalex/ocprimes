'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

const resolveNextPath = (nextValue) => {
  if (!nextValue || typeof nextValue !== 'string') return null
  if (!nextValue.startsWith('/') || nextValue.startsWith('//')) return null
  return nextValue
}

export default function LoginForm({
  endpoint = '/api/auth/login',
  adminOnly = false,
  successRedirect,
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        setError(payload?.error || 'Unable to sign in.')
        return
      }

      const role =
        payload?.role === 'admin' || payload?.role === 'vendor'
          ? payload.role
          : 'customer'
      if (adminOnly && role !== 'admin') {
        await fetch('/api/auth/signout', { method: 'POST' })
        setError('This account is not approved for admin access.')
        return
      }

      const nextPath = resolveNextPath(searchParams.get('next'))
      const fallback =
        typeof successRedirect === 'string'
          ? successRedirect
          : role === 'admin'
            ? '/backend/admin/dashboard'
            : role === 'vendor'
            ? '/backend/admin/dashboard'
            : '/'

      router.push(nextPath || fallback)
    } catch {
      setError('Unable to sign in. Try again.')
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
          placeholder='Enter your password'
          autoComplete='current-password'
          className='w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none'
          required
        />
      </label>

      <div className='flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600'>
        <label className='flex items-center gap-2'>
          <input
            type='checkbox'
            className='h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300'
          />
          Remember me
        </label>
        <Link href='/forgot-password' className='font-semibold text-slate-700 hover:text-slate-900'>
          Forgot password?
        </Link>
      </div>

      {error ? <p className='text-sm text-rose-500'>{error}</p> : null}

      <button
        type='submit'
        disabled={isSubmitting}
        className='mt-2 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70'
      >
        {isSubmitting ? 'Signing in...' : 'Sign in'}
      </button>

      <div className='flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500'>
        <span>New to OcPrimes?</span>
        <Link href='/signup' className='font-semibold text-slate-700 hover:text-slate-900'>
          Create an account
        </Link>
      </div>
    </form>
  )
}
