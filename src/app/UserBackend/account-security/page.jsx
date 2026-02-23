'use client'

import CustomSelect from '@/components/common/CustomSelect'
import { useEffect, useMemo, useState } from 'react'
import { useAlerts } from '@/context/AlertContext'
import {
  accountErrorClass,
  accountLabelClass,
  accountSuccessClass,
} from '@/components/user-backend/account/mobileTheme'

const SECURITY_QUESTIONS = [
  'What is your mother’s maiden name?',
  'What was the name of your first pet?',
  'What city were you born in?',
  'What is your favorite book?',
  'What was your first school?',
]

const TWO_STEP_OPTIONS = [
  { value: 'none', label: 'Disabled' },
  { value: 'sms', label: 'SMS code' },
  { value: 'auth_app', label: 'Authenticator app' },
]

const fieldClassName =
  'mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10'
const selectFieldClass = `${fieldClassName} appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none'%3E%3Cpath d='M6 8l4 4 4-4' stroke='%230f172a' stroke-width='1.75' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")] bg-[length:16px_16px] bg-[right_0.75rem_center] bg-no-repeat pr-9`
const primaryButtonClass =
  'rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
const ghostButtonClass =
  'rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-60'
const sectionShellClass = 'overflow-hidden rounded-xl border border-slate-100 bg-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)]'
const rowMetaClass = 'mt-1 text-sm leading-6 text-slate-500'

const formatDateLabel = (value) => {
  if (!value) return 'Not generated yet'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not generated yet'
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

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

  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [twoStepMethod, setTwoStepMethod] = useState('none')
  const [recoveryCodesGeneratedAt, setRecoveryCodesGeneratedAt] = useState('')

  const [hasSecurityAnswer, setHasSecurityAnswer] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')

  const [resetOpen, setResetOpen] = useState(false)
  const [resetAuthorized, setResetAuthorized] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [resetPassword, setResetPassword] = useState('')
  const [resetQuestion, setResetQuestion] = useState('')
  const [resetAnswer, setResetAnswer] = useState('')
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

  useEffect(() => {
    let isMounted = true
    const loadProfile = async () => {
      try {
        const response = await fetch('/api/user/profile')
        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.error || 'Unable to load security settings.')
        }
        const payload = await response.json()
        if (!isMounted) return

        const nextProfile = payload?.profile || {}
        const security = nextProfile?.security || {}
        setProfile(nextProfile)
        setAuthEmail(payload?.email || '')
        setLinkedProviders(Array.isArray(payload?.linkedProviders) ? payload.linkedProviders : [])

        setRecoveryEmail(security?.recoveryEmail || '')
        setPhoneNumber(
          normalizePhoneValue(nextProfile?.contactInfo?.phone || security?.phoneNumber || ''),
        )
        setTwoStepMethod(security?.twoStepMethod || 'none')
        setRecoveryCodesGeneratedAt(security?.recoveryCodesGeneratedAt || '')
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

  const persistSecurity = async (overrides = {}) => {
    if (!profile) return false
    if (!profile?.firstName?.trim() || !profile?.country?.trim()) {
      const message =
        'Complete your basic profile (first name and country) before saving security settings.'
      setError(message)
      pushAlert({ type: 'error', title: 'Account Security', message })
      return false
    }
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
        ...profile,
        contactInfo: {
          ...(profile?.contactInfo || {}),
          phone: safePhoneNumber,
        },
        security: {
          ...(profile?.security || {}),
          recoveryEmail,
          twoStepMethod,
          recoveryCodesGeneratedAt,
          question: hasSecurityAnswer ? (profile?.security?.question || question || '') : question,
          answer: hasSecurityAnswer ? '' : answer,
          ...overrides,
        },
      }
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to save security settings.')
      }

      setProfile((prev) => ({
        ...(prev || {}),
        contactInfo: {
          ...(prev?.contactInfo || {}),
          phone: safePhoneNumber,
        },
        security: {
          ...(prev?.security || {}),
          recoveryEmail,
          twoStepMethod,
          recoveryCodesGeneratedAt,
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

  const handleRegenerateCodes = async () => {
    const nextDate = new Date().toISOString()
    setRecoveryCodesGeneratedAt(nextDate)
    const ok = await persistSecurity({ recoveryCodesGeneratedAt: nextDate })
    if (!ok) setRecoveryCodesGeneratedAt((profile?.security?.recoveryCodesGeneratedAt || ''))
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
    return <div className='text-sm text-slate-500'>Loading security settings...</div>
  }

  return (
    <div className='w-full space-y-4 pb-6 text-slate-900 lg:space-y-5 lg:pb-8'>
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
            </div>
            <button
              type='button'
              className={ghostButtonClass}
              onClick={() =>
                setSuccess('To change account email, update your authentication email in the auth flow.')
              }
            >
              Change email
            </button>
          </div>

          <div className='grid grid-cols-[minmax(0,1fr)_auto] items-center gap-6 px-8 py-5'>
            <div>
              <div className='flex items-center gap-2'>
                <p className='text-sm font-semibold text-slate-900'>2-step verification</p>
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                    twoStepMethod === 'none' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {twoStepMethod === 'none' ? 'Disabled' : 'Enabled'}
                </span>
              </div>
              <p className='mt-1 text-sm text-slate-500'>An extra layer of protection to your account during login</p>
            </div>
            <div className='flex items-center gap-2'>
              <CustomSelect
                value={twoStepMethod}
                onChange={(event) => setTwoStepMethod(event.target.value)}
                className='w-40 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900'
              >
                {TWO_STEP_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </CustomSelect>
              <button
                type='button'
                className={ghostButtonClass}
                onClick={() => void persistSecurity()}
                disabled={isSaving}
              >
                Change method
              </button>
            </div>
          </div>

          <div className='grid grid-cols-[minmax(0,1fr)_auto] items-center gap-6 px-8 py-5'>
            <div>
              <p className='text-sm font-semibold text-slate-900'>Recovery codes</p>
              <p className='mt-1 text-sm text-slate-500'>Generated {formatDateLabel(recoveryCodesGeneratedAt)}</p>
            </div>
            <button
              type='button'
              className={ghostButtonClass}
              onClick={() => void handleRegenerateCodes()}
              disabled={isSaving}
            >
              Regenerate codes
            </button>
          </div>

          <div className='grid grid-cols-[minmax(0,1fr)_auto] items-center gap-6 px-8 py-5'>
            <div className='min-w-0'>
              <p className='text-sm font-semibold text-slate-900'>Recovery email</p>
              <input
                type='email'
                value={recoveryEmail}
                onChange={(event) => setRecoveryEmail(event.target.value)}
                className='mt-2 w-full max-w-md rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900'
                placeholder='Add recovery email'
              />
            </div>
            <button
              type='button'
              className={ghostButtonClass}
              onClick={() => void persistSecurity()}
              disabled={isSaving}
            >
              Save recovery email
            </button>
          </div>

          <div className='grid grid-cols-[minmax(0,1fr)_auto] items-center gap-6 px-8 py-5'>
            <div className='min-w-0'>
              <p className='text-sm font-semibold text-slate-900'>Phone number</p>
              <div className='mt-2 flex w-full max-w-md items-center rounded-xl border border-slate-300 bg-white px-4 py-2.5'>
                <span className='mr-2 text-xs font-semibold text-slate-500'>
                  {countryRule.code ? `+${countryRule.code}` : '+--'}
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
            <button
              type='button'
              className={ghostButtonClass}
              onClick={() => void persistSecurity()}
              disabled={isSaving}
            >
              Save phone
            </button>
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
              <p className='text-sm font-semibold text-slate-900'>Password</p>
              <p className='mt-1 text-sm text-slate-500'>Managed by account email settings</p>
            </div>
            <button
              type='button'
              className={`${ghostButtonClass} shrink-0`}
              onClick={() =>
                setSuccess('To change account email, update your authentication email in the auth flow.')
              }
            >
              Change email
            </button>
          </div>
        </article>

        <article className='rounded-xl border border-slate-200 bg-white p-4 shadow-sm'>
          <div className='flex items-start justify-between gap-3'>
            <div className='min-w-0'>
              <div className='flex items-center gap-2'>
                <p className='text-sm font-semibold text-slate-900'>Two-factor authentication</p>
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                    twoStepMethod === 'none' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {twoStepMethod === 'none' ? 'Off' : 'On'}
                </span>
              </div>
              <p className='mt-1 text-sm text-slate-500'>Enable 2FA to add an extra layer of security.</p>
            </div>
          </div>
          <div className='mt-3 flex flex-col gap-2'>
            <CustomSelect
              value={twoStepMethod}
              onChange={(event) => setTwoStepMethod(event.target.value)}
              className={selectFieldClass}
            >
              {TWO_STEP_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </CustomSelect>
            <button
              type='button'
              className={primaryButtonClass}
              onClick={() => void persistSecurity()}
              disabled={isSaving}
            >
              Change method
            </button>
          </div>
        </article>

        <article className='rounded-xl border border-slate-200 bg-white p-4 shadow-sm'>
          <p className='text-sm font-semibold text-slate-900'>Recovery Code</p>
          <p className='mt-1 text-sm text-slate-500'>Generate backup codes to access your account.</p>
          <button
            type='button'
            className='mt-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800'
            onClick={() => void handleRegenerateCodes()}
            disabled={isSaving}
          >
            Generate
          </button>
        </article>

        <article className='rounded-xl border border-slate-200 bg-white p-4 shadow-sm'>
          <p className='text-sm font-semibold text-slate-900'>Recovery email</p>
          <input
            type='email'
            value={recoveryEmail}
            onChange={(event) => setRecoveryEmail(event.target.value)}
            className={fieldClassName}
            placeholder='Add recovery email'
          />
          <button
            type='button'
            className='mt-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800'
            onClick={() => void persistSecurity()}
            disabled={isSaving}
          >
            Save recovery email
          </button>
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
            <div className='lg:col-span-2'>
              <button
                type='button'
                className={`${primaryButtonClass} w-full lg:w-auto`}
                onClick={() => void persistSecurity()}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save security settings'}
              </button>
            </div>
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
    </div>
  )
}
