'use client'

import Link from 'next/link'
import { useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'
import CustomerAuthHeader from './CustomerAuthHeader'

const inputClassName =
  'w-full rounded-sm border border-slate-400 bg-white px-4 py-3 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900'

const primaryButtonClassName =
  'w-full rounded-sm bg-black px-4 py-3 text-base font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-70'

function LoadingDot() {
  return (
    <span className='inline-flex items-center justify-center gap-1' aria-hidden='true'>
      <span className='h-2 w-2 rounded-full bg-current animate-bounce [animation-delay:-0.2s]' />
      <span className='h-2 w-2 rounded-full bg-current animate-bounce [animation-delay:-0.1s]' />
      <span className='h-2 w-2 rounded-full bg-current animate-bounce' />
    </span>
  )
}

export default function CustomerForgotPasswordPage() {
  const [mode, setMode] = useState('email')
  const [email, setEmail] = useState('')
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
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
        payload?.message || 'If an account exists for this email, a reset link has been sent.',
      )
    } catch {
      setError('Unable to send reset link. Try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRecoveryStart = async () => {
    setIsSubmitting(true)
    setError('')
    setNotice('')

    try {
      const response = await fetch('/api/auth/recovery-access/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountEmail: email,
          recoveryEmail,
        }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        setError(payload?.error || 'Unable to verify recovery details.')
        return
      }

      setQuestion(payload?.question || '')
      setNotice('Answer your security question to continue to password reset.')
    } catch {
      setError('Unable to verify recovery details.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRecoveryComplete = async (event) => {
    event.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)
    setError('')
    setNotice('')

    try {
      const response = await fetch('/api/auth/recovery-access/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountEmail: email,
          recoveryEmail,
          question,
          answer,
        }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload?.recoveryUrl) {
        setError(payload?.error || 'Unable to start recovery.')
        return
      }

      window.location.assign(payload.recoveryUrl)
    } catch {
      setError('Unable to start recovery.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className='mx-auto w-full max-w-md'>
      <CustomerAuthHeader
        title='Forgot password'
        subtitle='Use your account email or recovery email to regain access.'
      />

      <div className='mt-8 grid gap-3'>
        <div className='grid grid-cols-2 gap-2 rounded-sm border border-slate-200 bg-slate-50 p-1'>
          <button
            type='button'
            onClick={() => {
              setMode('email')
              setError('')
              setNotice('')
              setQuestion('')
              setAnswer('')
            }}
            className={`rounded-sm px-3 py-2 text-sm font-medium transition ${
              mode === 'email' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            Account email
          </button>
          <button
            type='button'
            onClick={() => {
              setMode('recovery')
              setError('')
              setNotice('')
              setQuestion('')
              setAnswer('')
            }}
            className={`rounded-sm px-3 py-2 text-sm font-medium transition ${
              mode === 'recovery' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            Recovery email
          </button>
        </div>

        {mode === 'email' ? (
          <form className='grid gap-4' onSubmit={handleSubmit}>
            <label className='space-y-2 text-sm font-medium text-slate-700'>
              Email address
              <input
                type='email'
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setQuestion('')
                  setAnswer('')
                }}
                placeholder='Enter your email'
                autoComplete='email'
                className={inputClassName}
                required
              />
            </label>

            {error ? <p className='text-sm text-rose-600'>{error}</p> : null}
            {notice ? <p className='text-sm text-emerald-700'>{notice}</p> : null}

            <button
              type='submit'
              disabled={isSubmitting}
              className={primaryButtonClassName}
              aria-label={isSubmitting ? 'Sending reset link' : 'Send reset link'}
            >
              {isSubmitting ? <LoadingDot /> : 'Send reset link'}
            </button>
          </form>
        ) : (
          <form className='grid gap-4' onSubmit={handleRecoveryComplete}>
            <label className='space-y-2 text-sm font-medium text-slate-700'>
              Account email
              <input
                type='email'
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder='Enter your account email'
                autoComplete='email'
                className={inputClassName}
                required
              />
            </label>

            <label className='space-y-2 text-sm font-medium text-slate-700'>
              Recovery email
              <input
                type='email'
                value={recoveryEmail}
                onChange={(event) => {
                  setRecoveryEmail(event.target.value)
                  setQuestion('')
                  setAnswer('')
                }}
                placeholder='Enter your recovery email'
                autoComplete='email'
                className={inputClassName}
                required
              />
            </label>

            {!question ? (
              <button
                type='button'
                disabled={isSubmitting}
                className={primaryButtonClassName}
                onClick={() => void handleRecoveryStart()}
              >
                {isSubmitting ? <LoadingDot /> : 'Continue'}
              </button>
            ) : (
              <>
                <div className='rounded-sm border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700'>
                  {question}
                </div>
                <label className='space-y-2 text-sm font-medium text-slate-700'>
                  Security answer
                  <input
                    type='text'
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    placeholder='Enter your answer'
                    className={inputClassName}
                    autoComplete='off'
                    required
                  />
                </label>
                <button type='submit' disabled={isSubmitting} className={primaryButtonClassName}>
                  {isSubmitting ? <LoadingDot /> : 'Continue to reset'}
                </button>
              </>
            )}

            {error ? <p className='text-sm text-rose-600'>{error}</p> : null}
            {notice ? <p className='text-sm text-emerald-700'>{notice}</p> : null}
          </form>
        )}

        <div className='text-center text-sm text-slate-600'>
          <Link
            href='/login'
            className='font-medium text-slate-600 underline underline-offset-2 transition hover:text-slate-900'
          >
            Back to sign in
          </Link>
        </div>

        <div className='mt-2 flex justify-center'>
          <Link
            href='/UserBackend/messages?help_center=1'
            target='_blank'
            rel='noreferrer'
            className='rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900'
          >
            Help Center
          </Link>
        </div>
      </div>
    </div>
  )
}
