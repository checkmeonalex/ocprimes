'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import {
  resolveClientCustomerDeviceType,
  resolveCustomerRedirect,
  resolvePostAuthRedirect,
} from '@/lib/auth/navigation'

export default function LoginForm({
  endpoint = '/api/auth/login',
  adminOnly = false,
  successRedirect,
  variant = 'default',
  signUpHref = '/signup',
  forgotPasswordHref = '/forgot-password',
}) {
  const isSellerClean = variant === 'seller-clean'
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, next: searchParams.get('next') || '' }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        setError(payload?.error || "We couldn't sign you in. Please try again.")
        return
      }

      const role =
        payload?.role === 'admin' || payload?.role === 'vendor'
          ? payload.role
          : 'customer'
      if (adminOnly && role !== 'admin') {
        await fetch('/api/auth/signout', { method: 'POST' })
        setError("You don't have access to this area yet.")
        return
      }

      const nextPath = searchParams.get('next')
      const fallback =
        typeof successRedirect === 'string'
          ? successRedirect
          : resolveCustomerRedirect(resolveClientCustomerDeviceType())
      router.push(resolvePostAuthRedirect(role, nextPath, fallback))
    } catch {
      setError("We couldn't sign you in. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputClassName = isSellerClean
    ? 'w-full rounded-sm border border-slate-400 bg-white px-4 py-3 text-[15px] font-normal text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900'
    : 'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none'

  const primaryButtonClassName = isSellerClean
    ? 'mt-2 w-full rounded-full bg-[#f5d10b] px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[#e9c300] disabled:cursor-not-allowed disabled:opacity-70'
    : 'mt-2 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70'

  return (
    <form className='mt-8 grid gap-4' onSubmit={handleSubmit}>
      <label className='space-y-2 text-sm font-semibold text-slate-700'>
        Email address
        <input
          type='email'
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder='you@alxora.com'
          autoComplete='email'
          className={inputClassName}
          required
        />
      </label>

      <label className='space-y-2 text-sm font-semibold text-slate-700'>
        Password
        <div className='relative'>
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder='Enter your password'
            autoComplete='current-password'
            className={`${inputClassName} pr-12`}
            required
          />
          <button
            type='button'
            onClick={() => setShowPassword((current) => !current)}
            className='absolute inset-y-0 right-0 inline-flex items-center justify-center px-4 text-slate-500 transition hover:text-slate-900'
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <svg aria-hidden='true' viewBox='0 0 24 24' fill='none' className='h-5 w-5'>
                <path
                  d='M3 4.5 20 21'
                  stroke='currentColor'
                  strokeWidth='1.8'
                  strokeLinecap='round'
                />
                <path
                  d='M10.6 6.2A10 10 0 0 1 12 6.1c5.2 0 8.8 4.2 9.8 5.6a.57.57 0 0 1 0 .7 17 17 0 0 1-3.4 3.6M6.7 9A17 17 0 0 0 2.2 11.7a.57.57 0 0 0 0 .7c1 1.4 4.6 5.6 9.8 5.6a9.7 9.7 0 0 0 3.1-.5'
                  stroke='currentColor'
                  strokeWidth='1.8'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
                <path
                  d='M9.9 9.9a3 3 0 0 0 4.2 4.2'
                  stroke='currentColor'
                  strokeWidth='1.8'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
              </svg>
            ) : (
              <svg aria-hidden='true' viewBox='0 0 24 24' fill='none' className='h-5 w-5'>
                <path
                  d='M2.2 12.4a.57.57 0 0 1 0-.7C3.2 10.3 6.8 6.1 12 6.1s8.8 4.2 9.8 5.6a.57.57 0 0 1 0 .7c-1 1.4-4.6 5.6-9.8 5.6s-8.8-4.2-9.8-5.6Z'
                  stroke='currentColor'
                  strokeWidth='1.8'
                />
                <circle cx='12' cy='12' r='3' stroke='currentColor' strokeWidth='1.8' />
              </svg>
            )}
          </button>
        </div>
      </label>

      <div className={`flex flex-wrap items-center justify-between gap-3 text-sm ${isSellerClean ? 'text-slate-500' : 'text-slate-600'}`}>
        <span>{isSellerClean ? 'Use the email linked to your seller access.' : ''}</span>
        <Link href={forgotPasswordHref} className='font-semibold text-slate-700 hover:text-slate-900'>
          Forgot password?
        </Link>
      </div>

      {error ? <p className='text-sm text-rose-500'>{error}</p> : null}

      <button
        type='submit'
        disabled={isSubmitting}
        className={primaryButtonClassName}
      >
        {isSubmitting ? 'Signing in...' : 'Sign in'}
      </button>

      {isSellerClean ? (
        <div className='grid gap-4 pt-1'>
          <Link
            href='/help-center'
            className='inline-flex items-center gap-2 text-sm font-medium text-slate-700 transition hover:text-slate-950'
          >
            <span>Need help?</span>
          </Link>

          <div className='flex items-center gap-4'>
            <div className='h-px flex-1 bg-slate-200' />
            <span className='text-sm text-slate-500'>New seller on Alxora?</span>
            <div className='h-px flex-1 bg-slate-200' />
          </div>

          <Link
            href={signUpHref}
            className='inline-flex w-full items-center justify-center rounded-full border border-slate-300 px-4 py-3 text-sm font-medium text-slate-900 transition hover:border-slate-900'
          >
            Create your seller account
          </Link>
        </div>
      ) : (
        <div className='flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500'>
          <span>New to Alxora?</span>
          <Link href={signUpHref} className='font-semibold text-slate-700 hover:text-slate-900'>
            Create an account
          </Link>
        </div>
      )}
    </form>
  )
}
