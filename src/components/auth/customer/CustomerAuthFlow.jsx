'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'
import {
  resolveClientCustomerDeviceType,
  resolveCustomerRedirect,
  resolvePostAuthRedirect,
  resolveSafeNextPath,
} from '@/lib/auth/navigation'
import {
  getPasswordStrength,
  PASSWORD_REQUIREMENTS_MESSAGE,
} from '@/lib/auth/password-strength'
import CustomerAuthSocialButtons from './CustomerAuthSocialButtons'
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

const getRoleMessage = (role) => {
  if (role === 'admin') {
    return 'You’re signing in with a store account. You’ll be taken to your dashboard.'
  }
  if (role === 'vendor') {
    return 'This email is linked to a vendor account. You will be redirected after sign in.'
  }
  return ''
}

export default function CustomerAuthFlow() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextValue = searchParams.get('next')
  const safeNextPath = resolveSafeNextPath(nextValue)
  const oauthError = searchParams.get('error') === 'oauth'

  const [stage, setStage] = useState('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showSignupPassword, setShowSignupPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState(oauthError ? 'Google sign-in could not be completed. Try again.' : '')
  const [notice, setNotice] = useState('')
  const [roleNotice, setRoleNotice] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const passwordStrength = getPasswordStrength(password)

  const resetFeedback = () => {
    setError('')
    setNotice('')
    setRoleNotice('')
  }

  const handleEmailContinue = async (event) => {
    event.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)
    resetFeedback()

    try {
      const response = await fetch('/api/auth/customer-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        setError(payload?.error || 'Unable to continue.')
        return
      }

      const nextStage = payload?.nextStep === 'password' ? 'password' : 'signup'
      setStage(nextStage)
      setPassword('')
      setConfirmPassword('')
      setShowLoginPassword(false)
      setShowSignupPassword(false)
      setShowConfirmPassword(false)
      setRoleNotice(getRoleMessage(payload?.role))
      if (nextStage === 'signup') {
        setNotice('There is no account linked to this email. Register to continue.')
      }
    } catch {
      setError('Unable to continue. Try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePasswordSubmit = async (event) => {
    event.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)
    setError('')
    setNotice('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, next: safeNextPath || '' }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        setError(payload?.error || "We couldn't sign you in. Please try again.")
        return
      }

      router.push(
        resolvePostAuthRedirect(
          payload?.role,
          safeNextPath,
          resolveCustomerRedirect(resolveClientCustomerDeviceType()),
        ),
      )
      router.refresh()
    } catch {
      setError("We couldn't sign you in. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSignupSubmit = async (event) => {
    event.preventDefault()
    if (isSubmitting) return

    if (!passwordStrength.canSubmit) {
      setError(PASSWORD_REQUIREMENTS_MESSAGE)
      setNotice('')
      return
    }

    setIsSubmitting(true)
    setError('')
    setNotice('')

    try {
      const response = await fetch('/api/auth/signup', {
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
        setNotice('Check your inbox to confirm your email before signing in.')
        return
      }

      router.push(
        resolvePostAuthRedirect(
          'customer',
          safeNextPath,
          resolveCustomerRedirect(resolveClientCustomerDeviceType()),
        ),
      )
      router.refresh()
    } catch {
      setError('Unable to create account. Try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleClick = async () => {
    if (isGoogleLoading || isSubmitting) return

    setIsGoogleLoading(true)
    setError('')

    try {
      const supabase = createBrowserSupabaseClient()
      const callbackUrl = new URL('/auth/callback', window.location.origin)
      if (safeNextPath) {
        callbackUrl.searchParams.set('next', safeNextPath)
      }
      callbackUrl.searchParams.set('device', resolveClientCustomerDeviceType())

      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl.toString(),
        },
      })

      if (googleError) {
        setError(googleError.message || 'Unable to start Google sign-in.')
        setIsGoogleLoading(false)
      }
    } catch {
      setError('Unable to start Google sign-in.')
      setIsGoogleLoading(false)
    }
  }

  const handleBackToEmail = () => {
    setStage('email')
    setPassword('')
    setConfirmPassword('')
    setShowLoginPassword(false)
    setShowSignupPassword(false)
    setShowConfirmPassword(false)
    resetFeedback()
  }

  const heading = 'Sign in or register'
  const subheading = 'Sign in or create an account to continue.'

  return (
    <div className='mx-auto w-full max-w-md'>
      <CustomerAuthHeader title={heading} subtitle={subheading} />

      <div className='mt-8'>
        {stage === 'email' ? (
          <form className='grid gap-4' onSubmit={handleEmailContinue}>
            <label className='space-y-2 text-sm font-medium text-slate-700'>
              Email address
              <input
                type='email'
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder='Enter your email'
                autoComplete='email'
                className={inputClassName}
                required
              />
            </label>

            {error ? <p className='text-sm text-rose-600'>{error}</p> : null}

            <button
              type='submit'
              disabled={isSubmitting}
              className={primaryButtonClassName}
              aria-label={isSubmitting ? 'Checking account' : 'Next'}
            >
              {isSubmitting ? <LoadingDot /> : 'Next'}
            </button>
          </form>
        ) : null}

        {stage === 'password' ? (
          <form className='grid gap-4' onSubmit={handlePasswordSubmit}>
            <div className='border border-slate-300 bg-white px-4 py-3 text-sm text-slate-600'>
              <div className='font-medium text-slate-900'>{email}</div>
              <button
                type='button'
                onClick={handleBackToEmail}
                className='mt-1 text-sm font-medium text-slate-600 underline underline-offset-2 transition hover:text-slate-900'
              >
                Use a different email
              </button>
            </div>

            <label className='space-y-2 text-sm font-medium text-slate-700'>
              Password
              <div className='relative'>
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder='Enter your password'
                  autoComplete='current-password'
                  className={`${inputClassName} pr-12`}
                  required
                />
                <button
                  type='button'
                  onClick={() => setShowLoginPassword((prev) => !prev)}
                  className='absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-800'
                  aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                >
                  <PasswordVisibilityIcon visible={showLoginPassword} />
                </button>
              </div>
            </label>

            {roleNotice ? <p className='text-sm text-amber-700'>{roleNotice}</p> : null}
            {error ? <p className='text-sm text-rose-600'>{error}</p> : null}

            <div className='grid gap-3'>
              <Link
                href='/forgot-password'
                className='inline-flex w-fit text-sm font-medium text-slate-600 transition hover:text-slate-900'
              >
                Forgot password?
              </Link>
              <button
                type='submit'
                disabled={isSubmitting}
                className={primaryButtonClassName}
                aria-label={isSubmitting ? 'Signing in' : 'Sign in'}
              >
                {isSubmitting ? <LoadingDot /> : 'Sign in'}
              </button>
            </div>
          </form>
        ) : null}

        {stage === 'signup' ? (
          <form className='grid gap-4' onSubmit={handleSignupSubmit}>
            <div className='border border-slate-300 bg-white px-4 py-3 text-sm text-slate-600'>
              <div className='font-medium text-slate-900'>{email}</div>
              <button
                type='button'
                onClick={handleBackToEmail}
                className='mt-1 text-sm font-medium text-slate-600 underline underline-offset-2 transition hover:text-slate-900'
              >
                Use a different email
              </button>
            </div>

            <label className='space-y-2 text-sm font-medium text-slate-700'>
              Create password
              <div className='relative'>
                <input
                  type={showSignupPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder='At least 8 characters'
                  autoComplete='new-password'
                  className={`${inputClassName} pr-12`}
                  minLength={8}
                  required
                />
                <button
                  type='button'
                  onClick={() => setShowSignupPassword((prev) => !prev)}
                  className='absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-800'
                  aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                >
                  <PasswordVisibilityIcon visible={showSignupPassword} />
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
                  <span
                    className={`h-1.5 rounded-full ${passwordToneClassNames[passwordStrength.tone]}`}
                  />
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
                  minLength={8}
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

            {notice ? <p className='text-sm text-emerald-700'>{notice}</p> : null}
            {error ? <p className='text-sm text-rose-600'>{error}</p> : null}

            <button type='submit' disabled={isSubmitting} className={primaryButtonClassName}>
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        ) : null}

        <div className='my-7 flex items-center gap-4 text-sm text-slate-400'>
          <div className='h-px flex-1 bg-slate-200' />
          <span>Other sign-in options</span>
          <div className='h-px flex-1 bg-slate-200' />
        </div>

        <CustomerAuthSocialButtons
          isGoogleLoading={isGoogleLoading}
          isGoogleDisabled={isSubmitting || isGoogleLoading}
          onGoogleClick={handleGoogleClick}
        />

        <div className='mt-6 flex justify-center'>
          <Link
            href='/help-center'
            className='rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900'
          >
            Help Center
          </Link>
        </div>

        <p className='mt-6 text-center text-xs leading-5 text-slate-500'>
          By continuing, you agree to Alxora&apos;
          <Link href='/privacy-policy' className='ml-1 font-medium text-slate-700 underline underline-offset-2'>
            Privacy Policy
          </Link>
          <span className='ml-1'>and Terms of Use.</span>
        </p>
      </div>
    </div>
  )
}
