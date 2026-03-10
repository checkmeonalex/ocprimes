'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'
import {
  getPasswordStrength,
  PASSWORD_REQUIREMENTS_MESSAGE,
} from '@/lib/auth/password-strength'
import CustomerAuthHeader from './CustomerAuthHeader'

const inputClassName =
  'w-full rounded-sm border border-slate-400 bg-white px-4 py-3 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900'

const primaryButtonClassName =
  'w-full rounded-sm bg-black px-4 py-3 text-base font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-70'

const passwordToneClassNames = {
  weak: 'bg-rose-500',
  medium: 'bg-amber-500',
  strong: 'bg-emerald-500',
}

function LoadingDot() {
  return (
    <span className='inline-flex items-center justify-center gap-1' aria-hidden='true'>
      <span className='h-2 w-2 rounded-full bg-current animate-bounce [animation-delay:-0.2s]' />
      <span className='h-2 w-2 rounded-full bg-current animate-bounce [animation-delay:-0.1s]' />
      <span className='h-2 w-2 rounded-full bg-current animate-bounce' />
    </span>
  )
}

function PasswordVisibilityIcon({ visible }) {
  if (visible) {
    return (
      <svg aria-hidden='true' viewBox='0 0 20 20' fill='none' className='h-5 w-5'>
        <path
          d='M2.5 2.5 17.5 17.5'
          stroke='currentColor'
          strokeWidth='1.6'
          strokeLinecap='round'
        />
        <path
          d='M8.7 4.8A8.8 8.8 0 0 1 10 4.7c4.5 0 7.4 3.7 8.2 5.3-.3.6-1 1.6-2 2.6M6.1 6.1C4.3 7.2 3.1 8.8 2.5 10c.9 1.8 4 5.3 7.5 5.3 1.4 0 2.7-.3 3.8-.9M8.9 8.9a1.6 1.6 0 1 0 2.2 2.2'
          stroke='currentColor'
          strokeWidth='1.6'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
    )
  }

  return (
    <svg aria-hidden='true' viewBox='0 0 20 20' fill='none' className='h-5 w-5'>
      <path
        d='M2.5 10c.9-1.8 4-5.3 7.5-5.3s6.6 3.5 7.5 5.3c-.9 1.8-4 5.3-7.5 5.3S3.4 11.8 2.5 10Z'
        stroke='currentColor'
        strokeWidth='1.6'
        strokeLinejoin='round'
      />
      <circle cx='10' cy='10' r='2.2' stroke='currentColor' strokeWidth='1.6' />
    </svg>
  )
}

export default function CustomerResetPasswordPage() {
  const router = useRouter()
  const supabase = useMemo(() => createBrowserSupabaseClient(), [])
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isReady, setIsReady] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const passwordStrength = getPasswordStrength(password)

  useEffect(() => {
    let mounted = true

    const run = async () => {
      let {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session && typeof window !== 'undefined') {
        const url = new URL(window.location.href)
        const code = url.searchParams.get('code')
        const tokenHash = url.searchParams.get('token_hash')
        const type = url.searchParams.get('type')

        if (code) {
          await supabase.auth.exchangeCodeForSession(code).catch(() => null)
        } else if (tokenHash && type === 'recovery') {
          await supabase.auth
            .verifyOtp({
              token_hash: tokenHash,
              type: 'recovery',
            })
            .catch(() => null)
        }

        if (code || (tokenHash && type === 'recovery')) {
          const cleanedUrl = new URL(window.location.href)
          cleanedUrl.searchParams.delete('code')
          cleanedUrl.searchParams.delete('token_hash')
          cleanedUrl.searchParams.delete('type')
          cleanedUrl.searchParams.delete('redirect_to')
          window.history.replaceState({}, '', `${cleanedUrl.pathname}${cleanedUrl.search}${cleanedUrl.hash}`)
        }

        const refreshed = await supabase.auth.getSession()
        session = refreshed.data.session
      }

      if (mounted) {
        setHasSession(Boolean(session))
        setIsReady(true)
      }
    }

    void run()

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

    if (!passwordStrength.canSubmit) {
      setError(PASSWORD_REQUIREMENTS_MESSAGE)
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
    return (
      <div className='mx-auto w-full max-w-md'>
        <CustomerAuthHeader
          title='Reset password'
          subtitle='Choose a new password to secure your account.'
        />
        <p className='mt-8 text-center text-sm text-slate-500'>Validating reset link...</p>
      </div>
    )
  }

  if (!hasSession) {
    return (
      <div className='mx-auto w-full max-w-md'>
        <CustomerAuthHeader
          title='Reset password'
          subtitle='Choose a new password to secure your account.'
        />

        <div className='mt-8 space-y-3'>
          <p className='text-sm text-rose-600'>
            This reset link is invalid or expired. Request a new reset link.
          </p>
          <Link
            href='/forgot-password'
            className='text-sm font-medium text-slate-600 underline underline-offset-2 transition hover:text-slate-900'
          >
            Request a new link
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className='mx-auto w-full max-w-md'>
      <CustomerAuthHeader
        title='Reset password'
        subtitle='Choose a new password to secure your account.'
      />

      <form className='mt-8 grid gap-4' onSubmit={handleSubmit}>
        {error ? <p className='text-sm text-rose-600'>{error}</p> : null}
        {message ? <p className='text-sm text-emerald-700'>{message}</p> : null}

        <label className='space-y-2 text-sm font-medium text-slate-700'>
          New password
          <div className='relative'>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder='At least 8 characters'
              autoComplete='new-password'
              className={`${inputClassName} pr-12`}
              required
            />
            <button
              type='button'
              onClick={() => setShowPassword((prev) => !prev)}
              className='absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-800'
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <PasswordVisibilityIcon visible={showPassword} />
            </button>
          </div>
        </label>

        {password ? (
          <div className='space-y-2'>
            <div className='flex items-center justify-between text-sm'>
              <span className='font-medium text-slate-700'>Password strength</span>
              <span
                className={`font-medium ${
                  passwordStrength.tone === 'weak'
                    ? 'text-rose-600'
                    : passwordStrength.tone === 'medium'
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                }`}
              >
                {passwordStrength.label}
              </span>
            </div>
            <div className='grid grid-cols-3 gap-2'>
              <span className={`h-1.5 rounded-full ${passwordToneClassNames[passwordStrength.tone]}`} />
              <span
                className={`h-1.5 rounded-full ${
                  passwordStrength.level >= 2
                    ? passwordToneClassNames[passwordStrength.tone]
                    : 'bg-slate-200'
                }`}
              />
              <span
                className={`h-1.5 rounded-full ${
                  passwordStrength.level >= 3
                    ? passwordToneClassNames[passwordStrength.tone]
                    : 'bg-slate-200'
                }`}
              />
            </div>
            <p
              className={`text-xs ${
                passwordStrength.tone === 'weak'
                  ? 'text-rose-600'
                  : passwordStrength.tone === 'medium'
                    ? 'text-amber-600'
                    : 'text-emerald-600'
              }`}
            >
              {passwordStrength.message}
            </p>
          </div>
        ) : null}

        <label className='space-y-2 text-sm font-medium text-slate-700'>
          Confirm password
          <div className='relative'>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder='Repeat your password'
              autoComplete='new-password'
              className={`${inputClassName} pr-12`}
              required
            />
            <button
              type='button'
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className='absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-800'
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              <PasswordVisibilityIcon visible={showConfirmPassword} />
            </button>
          </div>
        </label>

        <button
          type='submit'
          disabled={isSubmitting}
          className={primaryButtonClassName}
          aria-label={isSubmitting ? 'Saving password' : 'Reset password'}
        >
          {isSubmitting ? <LoadingDot /> : 'Reset password'}
        </button>
      </form>
    </div>
  )
}
