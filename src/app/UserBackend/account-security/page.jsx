'use client'

import CustomSelect from '@/components/common/CustomSelect'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'
import { useAlerts } from '@/context/AlertContext'
import {
  accountErrorClass,
  accountLabelClass,
  accountSuccessClass,
} from '@/components/user-backend/account/mobileTheme'
import {
  loadUserProfileBootstrap,
  primeUserProfileBootstrap,
} from '@/lib/user/profile-bootstrap-client'
import {
  EMAIL_TWO_STEP_METHOD,
  SECURITY_QUESTIONS,
} from '@/lib/auth/account-security'
import AccountSecurityLoadingSkeleton from '@/components/user-backend/AccountSecurityLoadingSkeleton'

const fieldClassName =
  'mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10'
const selectFieldClass = `${fieldClassName} appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none'%3E%3Cpath d='M6 8l4 4 4-4' stroke='%230f172a' stroke-width='1.75' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")] bg-[length:16px_16px] bg-[right_0.75rem_center] bg-no-repeat pr-9`
const primaryButtonClass =
  'rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
const ghostButtonClass =
  'rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-60'
const sectionShellClass = 'rounded-xl border border-slate-100 bg-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)]'
const rowMetaClass = 'mt-1 text-sm leading-6 text-slate-500'

const normalizePhoneValue = (value) => {
  const next = String(value || '')
  return next.replace(/[^0-9]/g, '')
}

export default function AccountSecurityPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [profile, setProfile] = useState(null)
  const [authEmail, setAuthEmail] = useState('')
  const [linkedProviders, setLinkedProviders] = useState([])
  const [pendingEmailChange, setPendingEmailChange] = useState('')

  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')

  const [hasSecurityAnswer, setHasSecurityAnswer] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')

  const [resetOpen, setResetOpen] = useState(false)
  const [resetAuthorized, setResetAuthorized] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [resetPassword, setResetPassword] = useState('')
  const [resetQuestion, setResetQuestion] = useState('')
  const [resetAnswer, setResetAnswer] = useState('')
  const [showEmailChangeModal, setShowEmailChangeModal] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailChangeStep, setEmailChangeStep] = useState('request')
  const emailChangeCompletionStartedRef = useRef(false)
  const { pushAlert } = useAlerts()

  const googleConnected = useMemo(
    () => linkedProviders.some((provider) => provider === 'google'),
    [linkedProviders],
  )
  const countryRule = useMemo(() => {
    const map = {
      Nigeria: { code: '234', max: 10 },
      International: { code: '1', max: 15 },
    }
    return map[profile?.country] || { code: '', max: 15 }
  }, [profile?.country])
  const phonePrefix = countryRule.code ? `+${countryRule.code}` : '+'
  const showFloatingSave =
    !showPasswordModal &&
    !showEmailChangeModal &&
    !resetAuthorized

  useEffect(() => {
    let isMounted = true
    const loadProfile = async () => {
      try {
        const payload = await loadUserProfileBootstrap()
        if (!payload) {
          throw new Error('Unable to load security settings.')
        }
        if (!isMounted) return

        const nextProfile = payload?.profile || {}
        const security = nextProfile?.security || {}
        setProfile(nextProfile)
        setAuthEmail(payload?.email || '')
        setLinkedProviders(Array.isArray(payload?.linkedProviders) ? payload.linkedProviders : [])

        setRecoveryEmail(security?.recoveryEmail || '')
        setPhoneNumber(
          normalizePhoneValue(security?.phoneNumber || nextProfile?.contactInfo?.phone || ''),
        )
        setPendingEmailChange(security?.pendingEmailChange || '')
        setQuestion(security?.question || '')
        setHasSecurityAnswer(Boolean(payload?.hasSecurityAnswer))
      } catch (err) {
        if (!isMounted) return
        const message = err?.message || 'Unable to load security settings.'
        setError(message)
        pushAlert({ type: 'error', title: 'Account Security', message })
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    void loadProfile()
    return () => {
      isMounted = false
    }
  }, [pushAlert])

  useEffect(() => {
    let isMounted = true

    const completeEmailChange = async () => {
      if (typeof window === 'undefined') return

      const supabase = createBrowserSupabaseClient()
      const url = new URL(window.location.href)
      const isEmailChangeFlow = url.searchParams.get('email_change') === '1'
      const code = url.searchParams.get('code')
      const tokenHash = url.searchParams.get('token_hash')
      const type = url.searchParams.get('type')

      if (!isEmailChangeFlow || (!code && !tokenHash)) {
        return
      }

      if (emailChangeCompletionStartedRef.current) {
        return
      }
      emailChangeCompletionStartedRef.current = true

      const cleanedUrl = new URL(window.location.href)
      cleanedUrl.searchParams.delete('email_change')
      cleanedUrl.searchParams.delete('code')
      cleanedUrl.searchParams.delete('token_hash')
      cleanedUrl.searchParams.delete('type')
      cleanedUrl.searchParams.delete('redirect_to')
      window.history.replaceState({}, '', `${cleanedUrl.pathname}${cleanedUrl.search}${cleanedUrl.hash}`)

      setIsSaving(true)
      setError('')
      setSuccess('')

      try {
        if (code) {
          await supabase.auth.exchangeCodeForSession(code)
        } else if (tokenHash) {
          await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type || 'magiclink',
          })
        }

        const response = await fetch('/api/user/email-change/complete', {
          method: 'POST',
        })
        const payload = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(payload?.error || 'Unable to complete email change.')
        }

        if (!isMounted) return

        setPendingEmailChange('')
        setShowEmailChangeModal(false)
        setEmailChangeStep('request')
        setNewEmail('')
        setSuccess(
          payload?.message ||
            'Email change started. Confirm the new email from your inbox to finish updating it.',
        )
        pushAlert({
          type: 'success',
          title: 'Account Security',
          message:
            payload?.message ||
            'Email change started. Confirm the new email from your inbox to finish updating it.',
        })
      } catch (err) {
        if (!isMounted) return
        const message = err?.message || 'Unable to complete email change.'
        setError(message)
        pushAlert({ type: 'error', title: 'Account Security', message })
      } finally {
        if (isMounted) {
          setIsSaving(false)
        }
      }
    }

    void completeEmailChange()

    return () => {
      isMounted = false
    }
  }, [pushAlert])

  const persistSecurity = async (overrides = {}) => {
    if (!profile) return false
    if (recoveryEmail && !recoveryEmail.includes('@')) {
      const message = 'Recovery email is invalid.'
      setError(message)
      pushAlert({ type: 'error', title: 'Account Security', message })
      return false
    }
    if (!hasSecurityAnswer && question && !answer.trim()) {
      const message = 'Answer is required for selected security question.'
      setError(message)
      pushAlert({ type: 'error', title: 'Account Security', message })
      return false
    }

    setIsSaving(true)
    setError('')
    setSuccess('')
    try {
      const safePhoneNumber = normalizePhoneValue(phoneNumber)
      const payload = {
        recoveryEmail,
        phoneNumber: safePhoneNumber,
        twoStepMethod: EMAIL_TWO_STEP_METHOD,
        question: hasSecurityAnswer ? '' : question,
        answer: hasSecurityAnswer ? '' : answer,
        ...overrides,
      }
      const response = await fetch('/api/user/security-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to save security settings.')
      }
      primeUserProfileBootstrap(data)

      setProfile((prev) => ({
        ...(prev || {}),
        contactInfo: {
          ...(prev?.contactInfo || {}),
          phone: safePhoneNumber,
        },
        security: {
          ...(prev?.security || {}),
          recoveryEmail,
          phoneNumber: safePhoneNumber,
          twoStepMethod: EMAIL_TWO_STEP_METHOD,
          question: hasSecurityAnswer ? (prev?.security?.question || question || '') : question,
          ...overrides,
        },
      }))

      if (!hasSecurityAnswer && question && answer) {
        setHasSecurityAnswer(true)
        setAnswer('')
      }
      setPhoneNumber(safePhoneNumber)
      setSuccess('Security settings updated.')
      pushAlert({
        type: 'success',
        title: 'Account Security',
        message: 'Security settings updated.',
      })
      return true
    } catch (err) {
      const message = err?.message || 'Unable to save security settings.'
      setError(message)
      pushAlert({ type: 'error', title: 'Account Security', message })
      return false
    } finally {
      setIsSaving(false)
    }
  }

  const handleStartEmailChange = async () => {
    setError('')
    setSuccess('')
    if (!newEmail.trim()) {
      const message = 'Enter your new email address.'
      setError(message)
      pushAlert({ type: 'error', title: 'Account Security', message })
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/user/email-change/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to start email change.')
      }

      setPendingEmailChange(newEmail.trim().toLowerCase())
      setEmailChangeStep('verify')
      setSuccess(payload?.message || 'We sent a verification link to your current email.')
      pushAlert({
        type: 'success',
        title: 'Account Security',
        message: payload?.message || 'We sent a verification link to your current email.',
      })
    } catch (err) {
      const message = err?.message || 'Unable to start email change.'
      setError(message)
      pushAlert({ type: 'error', title: 'Account Security', message })
    } finally {
      setIsSaving(false)
    }
  }

  const handleVerifyPassword = async () => {
    setError('')
    setSuccess('')
    if (!resetPassword.trim()) {
      const message = 'Password is required to continue.'
      setError(message)
      pushAlert({ type: 'error', title: 'Account Security', message })
      return
    }
    setIsSaving(true)
    try {
      const response = await fetch('/api/user/security-question/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetPassword }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Password verification failed.')
      }
      setResetAuthorized(true)
      setShowPasswordModal(false)
      setSuccess('Password verified. You can reset your question now.')
      pushAlert({
        type: 'success',
        title: 'Account Security',
        message: 'Password verified. You can reset your question now.',
      })
    } catch (err) {
      const message = err?.message || 'Password verification failed.'
      setError(message)
      pushAlert({ type: 'error', title: 'Account Security', message })
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetSecurityQuestion = async () => {
    setError('')
    setSuccess('')
    if (!resetPassword.trim()) {
      const message = 'Password is required to reset.'
      setError(message)
      pushAlert({ type: 'error', title: 'Account Security', message })
      return
    }
    if (!resetQuestion.trim() || !resetAnswer.trim()) {
      const message = 'Security question and answer are required.'
      setError(message)
      pushAlert({ type: 'error', title: 'Account Security', message })
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/user/security-question/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: resetPassword,
          question: resetQuestion,
          answer: resetAnswer,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to reset security question.')
      }
      setHasSecurityAnswer(true)
      setQuestion(resetQuestion)
      setResetOpen(false)
      setResetAuthorized(false)
      setResetQuestion('')
      setResetAnswer('')
      setResetPassword('')
      setSuccess('Security question updated.')
      pushAlert({
        type: 'success',
        title: 'Account Security',
        message: 'Security question updated.',
      })
    } catch (err) {
      const message = err?.message || 'Unable to reset security question.'
      setError(message)
      pushAlert({ type: 'error', title: 'Account Security', message })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <AccountSecurityLoadingSkeleton />
  }

  return (
    <div className='w-full space-y-4 pb-28 text-slate-900 lg:space-y-5 lg:pb-32'>
      <section className='lg:hidden'>
        <div className='rounded-[24px] bg-white p-5'>
          <div className='mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-slate-900 text-white'>
            <svg
              className='h-7 w-7'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.8'
              aria-hidden='true'
            >
              <path strokeLinecap='round' strokeLinejoin='round' d='M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3Z' />
              <path strokeLinecap='round' strokeLinejoin='round' d='m9 12 2 2 4-4' />
            </svg>
          </div>
          <h1 className='mt-4 text-center text-[30px] font-semibold leading-tight text-slate-900'>Security</h1>
          <p className='mt-1 text-center text-sm text-slate-500'>
            Use authentication layers to protect your account.
          </p>
        </div>
      </section>

      {(error || success) ? (
        <section className='space-y-2'>
          {error ? <div className={accountErrorClass}>{error}</div> : null}
          {success ? <div className={accountSuccessClass}>{success}</div> : null}
        </section>
      ) : null}

      <section className='hidden overflow-hidden rounded-[10px] border border-slate-200 bg-white shadow-sm lg:block'>
        <div className='border-b border-slate-200 px-8 py-6'>
          <h1 className='text-[22px] font-semibold text-slate-900'>Account Security</h1>
          <p className='mt-1 text-sm text-slate-500'>Set up security measure for better protection</p>
        </div>

        <div className='divide-y divide-slate-200'>
          <div className='grid grid-cols-[minmax(0,1fr)_auto] items-center gap-6 px-8 py-5'>
            <div>
              <p className='text-sm font-semibold text-slate-900'>Email</p>
              <p className='mt-1 text-sm text-slate-500'>{authEmail || 'No account email found'}</p>
              {pendingEmailChange ? (
                <p className='mt-1 text-xs text-amber-700'>
                  Pending change to {pendingEmailChange}. Verify with your current email first.
                </p>
              ) : null}
            </div>
            <button
              type='button'
              className={ghostButtonClass}
              onClick={() => setShowEmailChangeModal(true)}
            >
              Change email
            </button>
          </div>

          <div className='grid grid-cols-[minmax(0,1fr)_auto] items-center gap-6 px-8 py-5'>
            <div>
              <div className='flex items-center gap-2'>
                <p className='text-sm font-semibold text-slate-900'>Verification for sensitive actions</p>
                <span className='rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600'>
                  Email only
                </span>
              </div>
              <p className='mt-1 text-sm text-slate-500'>
                We only verify by email when you reset your password or change your account email.
              </p>
            </div>
            <div className='flex flex-col items-end gap-2'>
              <span className='rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700'>
                Password reset
              </span>
              <span className='rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600'>
                Email change
              </span>
            </div>
          </div>

          <div className='grid grid-cols-[minmax(0,1fr)_auto] items-center gap-6 px-8 py-5'>
            <div className='min-w-0'>
              <p className='text-sm font-semibold text-slate-900'>Recovery email</p>
              <p className='mt-1 text-sm text-slate-500'>
                Use this email with your security question to recover access if you lose your main inbox.
              </p>
              <input
                type='email'
                value={recoveryEmail}
                onChange={(event) => setRecoveryEmail(event.target.value)}
                className='mt-2 w-full max-w-md rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900'
                placeholder='Add recovery email'
              />
            </div>
          </div>

          <div className='grid grid-cols-[minmax(0,1fr)_auto] items-center gap-6 px-8 py-5'>
            <div className='min-w-0'>
              <p className='text-sm font-semibold text-slate-900'>Phone number</p>
              <p className='mt-1 text-sm text-slate-500'>Save your current phone number on this account.</p>
              <div className='mt-2 flex w-full max-w-md items-center rounded-xl border border-slate-300 bg-white px-4 py-2.5'>
                <span className='mr-3 min-w-[3.25rem] whitespace-nowrap border-r border-slate-200 pr-3 text-xs font-semibold text-slate-500'>
                  {phonePrefix}
                </span>
                <input
                  type='tel'
                  value={phoneNumber}
                  onChange={(event) =>
                    setPhoneNumber(normalizePhoneValue(event.target.value).slice(0, countryRule.max))
                  }
                  inputMode='numeric'
                  pattern='[0-9]*'
                  maxLength={countryRule.max}
                  className='w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-900/40'
                  placeholder='Add phone number'
                />
              </div>
            </div>
          </div>

          <div className='grid grid-cols-[minmax(0,1fr)_auto] items-center gap-6 px-8 py-5'>
            <div>
              <p className='text-sm font-semibold text-slate-900'>Google authentication</p>
              <p className='mt-1 text-sm text-slate-500'>
                {googleConnected ? 'Connected to Google sign-in' : 'Not connected to Google sign-in'}
              </p>
            </div>
            <span
              className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                googleConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {googleConnected ? 'Connected' : 'Not connected'}
            </span>
          </div>
        </div>
      </section>

      <section className='space-y-3 lg:hidden'>
        <article className='rounded-xl border border-slate-200 bg-white p-4 shadow-sm'>
          <div className='flex items-start justify-between gap-3'>
            <div className='min-w-0'>
              <p className='text-sm font-semibold text-slate-900'>Email</p>
              <p className='mt-1 text-sm text-slate-500'>{authEmail || 'No account email found'}</p>
              {pendingEmailChange ? (
                <p className='mt-1 text-xs text-amber-700'>
                  Pending change to {pendingEmailChange}. Verify with your current email first.
                </p>
              ) : null}
            </div>
            <button
              type='button'
              className={`${ghostButtonClass} shrink-0`}
              onClick={() => setShowEmailChangeModal(true)}
            >
              Change email
            </button>
          </div>
        </article>

        <article className='rounded-xl border border-slate-200 bg-white p-4 shadow-sm'>
          <div className='flex items-start justify-between gap-3'>
            <div className='min-w-0'>
              <div className='flex items-center gap-2'>
                <p className='text-sm font-semibold text-slate-900'>Verification for sensitive actions</p>
                <span className='rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600'>
                  Email only
                </span>
              </div>
              <p className='mt-1 text-sm text-slate-500'>
                Email verification is only used for password reset and email changes.
              </p>
            </div>
          </div>
          <div className='mt-3 flex flex-col gap-2'>
            <div className='rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700'>
              Password reset
            </div>
            <div className='rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600'>
              Email change
            </div>
          </div>
        </article>

        <article className='rounded-xl border border-slate-200 bg-white p-4 shadow-sm'>
          <p className='text-sm font-semibold text-slate-900'>Recovery email</p>
          <p className='mt-1 text-sm text-slate-500'>
            Use this email with your security question when you need to recover your password.
          </p>
          <input
            type='email'
            value={recoveryEmail}
            onChange={(event) => setRecoveryEmail(event.target.value)}
            className={fieldClassName}
            placeholder='Add recovery email'
          />
        </article>

        <article className='rounded-xl border border-slate-200 bg-white p-4 shadow-sm'>
          <p className='text-sm font-semibold text-slate-900'>Phone number</p>
          <div className='mt-2 flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2.5'>
            <span className='mr-3 min-w-[3.25rem] whitespace-nowrap border-r border-slate-200 pr-3 text-xs font-semibold text-slate-500'>
              {phonePrefix}
            </span>
            <input
              type='tel'
              value={phoneNumber}
              onChange={(event) =>
                setPhoneNumber(normalizePhoneValue(event.target.value).slice(0, countryRule.max))
              }
              inputMode='numeric'
              pattern='[0-9]*'
              maxLength={countryRule.max}
              className='w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-900/40'
              placeholder='Add phone number'
            />
          </div>
        </article>

        <article className='rounded-xl border border-slate-200 bg-white p-4 shadow-sm'>
          <p className='text-sm font-semibold text-slate-900'>Active sessions</p>
          <p className='mt-1 text-sm text-slate-500'>
            {googleConnected ? 'Google sign-in linked on this account.' : 'No Google session linked.'}
          </p>
          <span
            className={`mt-3 inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${
              googleConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {googleConnected ? 'Logged in' : 'Not connected'}
          </span>
        </article>
      </section>

      <section className={`${sectionShellClass} p-5 sm:p-6`}>
        <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
          <div>
            <h2 className='text-[15px] font-semibold text-slate-900'>Security question</h2>
            <p className={rowMetaClass}>
              {hasSecurityAnswer
                ? 'Your security question is configured.'
                : 'Set your security question for account recovery.'}
            </p>
          </div>
          {hasSecurityAnswer ? (
            <button
              type='button'
              onClick={() => {
                setResetOpen(true)
                setShowPasswordModal(true)
              }}
              className={`${ghostButtonClass} w-full lg:w-auto`}
            >
              Reset security question
            </button>
          ) : null}
        </div>

        {!hasSecurityAnswer ? (
          <div className='mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2'>
            <div>
              <label className={accountLabelClass}>Security question</label>
              <CustomSelect
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                className={`mt-2 ${selectFieldClass}`}
              >
                <option value=''>Select a question</option>
                {SECURITY_QUESTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </CustomSelect>
            </div>
            {question ? (
              <div>
                <label className={accountLabelClass}>Answer</label>
                <input
                  type='text'
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  className={fieldClassName}
                  placeholder='Answer'
                  autoComplete='off'
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {resetOpen && resetAuthorized ? (
          <div className='mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2'>
            <div>
              <label className={accountLabelClass}>New security question</label>
              <CustomSelect
                value={resetQuestion}
                onChange={(event) => setResetQuestion(event.target.value)}
                className={`mt-2 ${selectFieldClass}`}
              >
                <option value=''>Select a question</option>
                {SECURITY_QUESTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </CustomSelect>
            </div>
            {resetQuestion ? (
              <div>
                <label className={accountLabelClass}>New answer</label>
                <input
                  type='text'
                  value={resetAnswer}
                  onChange={(event) => setResetAnswer(event.target.value)}
                  className={fieldClassName}
                  placeholder='Answer'
                  autoComplete='off'
                />
              </div>
            ) : null}
            <div className='lg:col-span-2 flex flex-col gap-2 sm:flex-row'>
              <button
                type='button'
                onClick={handleResetSecurityQuestion}
                className={`${primaryButtonClass} w-full sm:w-auto`}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Confirm reset'}
              </button>
              <button
                type='button'
                onClick={() => {
                  setResetOpen(false)
                  setResetAuthorized(false)
                  setResetPassword('')
                  setResetQuestion('')
                  setResetAnswer('')
                }}
                className={`${ghostButtonClass} w-full sm:w-auto`}
              >
                Cancel reset
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {showPasswordModal ? (
        <div className='fixed inset-0 z-[140] flex items-center justify-center bg-black/40 p-4'>
          <div className='w-full max-w-md rounded-[24px] border border-slate-200 bg-white p-5 shadow-2xl'>
            <h3 className='text-base font-semibold text-slate-900'>Verify your password</h3>
            <p className='mt-1 text-sm text-slate-500'>
              Enter your account password to reset your security question.
            </p>
            <div className='mt-4'>
              <label className={accountLabelClass}>Password</label>
              <input
                type='password'
                value={resetPassword}
                onChange={(event) => setResetPassword(event.target.value)}
                className={fieldClassName}
                autoComplete='current-password'
              />
            </div>
            <div className='mt-5 flex justify-end gap-2'>
              <button
                type='button'
                onClick={() => {
                  setShowPasswordModal(false)
                  setResetOpen(false)
                  setResetAuthorized(false)
                  setResetPassword('')
                }}
                className={ghostButtonClass}
              >
                Cancel
              </button>
              <button
                type='button'
                onClick={handleVerifyPassword}
                className={primaryButtonClass}
                disabled={isSaving}
              >
                {isSaving ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showEmailChangeModal ? (
        <div className='fixed inset-0 z-[140] flex items-center justify-center bg-black/40 p-4'>
          <div className='w-full max-w-md rounded-[24px] border border-slate-200 bg-white p-5 shadow-2xl'>
            <h3 className='text-base font-semibold text-slate-900'>Change account email</h3>
            <p className='mt-1 text-sm text-slate-500'>
              We will send a verification link to your current email before we start the update.
            </p>

            <div className='mt-4 space-y-4'>
              <div>
                <label className={accountLabelClass}>New email</label>
                <input
                  type='email'
                  value={newEmail}
                  onChange={(event) => setNewEmail(event.target.value)}
                  className={fieldClassName}
                  placeholder='Enter new email'
                  autoComplete='email'
                  disabled={emailChangeStep === 'verify'}
                />
              </div>

              {emailChangeStep === 'verify' ? (
                <div className='rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600'>
                  Open the verification link we sent to your current email. You will be returned here automatically.
                </div>
              ) : null}
            </div>

            <div className='mt-5 flex justify-end gap-2'>
              <button
                type='button'
                onClick={() => {
                  setShowEmailChangeModal(false)
                  setNewEmail('')
                  setEmailChangeStep('request')
                }}
                className={ghostButtonClass}
              >
                Cancel
              </button>
              <button
                type='button'
                onClick={handleStartEmailChange}
                className={primaryButtonClass}
                disabled={isSaving}
              >
                {isSaving
                  ? 'Sending...'
                  : emailChangeStep === 'verify'
                    ? 'Resend link'
                    : 'Send link'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showFloatingSave ? (
        <div className='pointer-events-none fixed inset-x-0 bottom-4 z-30 px-4 lg:left-[18rem] lg:right-8 lg:px-0'>
          <div className='mx-auto max-w-3xl lg:mx-0 lg:max-w-none lg:flex lg:justify-end'>
            <button
              type='button'
              onClick={() => void persistSecurity()}
              disabled={isSaving}
              className='pointer-events-auto w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-18px_rgba(15,23,42,0.55)] transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 lg:w-auto lg:min-w-[13rem] lg:px-7'
            >
              {isSaving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
