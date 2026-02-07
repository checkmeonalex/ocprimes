'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { useAlerts } from '@/context/AlertContext'

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarPreview, setAvatarPreview] = useState('')
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [email, setEmail] = useState('')
  const [hasSecurityAnswer, setHasSecurityAnswer] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetAuthorized, setResetAuthorized] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [resetPassword, setResetPassword] = useState('')
  const [resetQuestion, setResetQuestion] = useState('')
  const [resetAnswer, setResetAnswer] = useState('')
  const { pushAlert, latestAlert } = useAlerts()


  const emptyForm = useMemo(
    () => ({
      firstName: '',
      nickname: '',
      dateOfBirth: '',
      gender: '',
      country: '',
      contactInfo: {
        phone: '',
        email: '',
        whatsapp: '',
      },
      deliveryAddress: {
        line1: '',
        line2: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
      },
      interests: '',
      additionalInfo: '',
      security: {
        recoveryEmail: '',
        question: '',
        answer: '',
      },
    }),
    [],
  )

  const [form, setForm] = useState(emptyForm)
  const [initialForm, setInitialForm] = useState(emptyForm)
  const countryRule = useMemo(() => {
    const map = {
      Nigeria: { code: '234', max: 10 },
      'United States': { code: '1', max: 10 },
      'United Kingdom': { code: '44', max: 10 },
      Canada: { code: '1', max: 10 },
      Germany: { code: '49', max: 11 },
      France: { code: '33', max: 9 },
      Italy: { code: '39', max: 10 },
      Spain: { code: '34', max: 9 },
      Netherlands: { code: '31', max: 9 },
      'South Africa': { code: '27', max: 9 },
      Kenya: { code: '254', max: 9 },
      Ghana: { code: '233', max: 9 },
      'United Arab Emirates': { code: '971', max: 9 },
      'Saudi Arabia': { code: '966', max: 9 },
      India: { code: '91', max: 10 },
      Pakistan: { code: '92', max: 10 },
      China: { code: '86', max: 11 },
      Japan: { code: '81', max: 10 },
      'South Korea': { code: '82', max: 10 },
      Australia: { code: '61', max: 9 },
      Brazil: { code: '55', max: 11 },
      Mexico: { code: '52', max: 10 },
      Argentina: { code: '54', max: 10 },
    }
    return map[form.country] || { code: '', max: 15 }
  }, [form.country])

  useEffect(() => {
    let isMounted = true
    const loadProfile = async () => {
      try {
        const response = await fetch('/api/user/profile')
        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.error || 'Unable to load profile.')
        }
        const payload = await response.json()
        if (!isMounted) return
        const profile = payload?.profile || {}
        const next = {
          ...emptyForm,
          ...profile,
          contactInfo: {
            ...emptyForm.contactInfo,
            ...(profile?.contactInfo || {}),
          },
          deliveryAddress: {
            ...emptyForm.deliveryAddress,
            ...(profile?.deliveryAddress || {}),
          },
          security: {
            ...emptyForm.security,
            ...(profile?.security || {}),
          },
        }
        setForm(next)
        setInitialForm(next)
        setAvatarUrl(payload?.avatar_url || '')
        setEmail(payload?.email || '')
        setHasSecurityAnswer(Boolean(payload?.hasSecurityAnswer))
      } catch (err) {
        if (!isMounted) return
        const message = err?.message || 'Unable to load profile.'
        setError(message)
        pushAlert({ type: 'error', title: 'Profile', message })
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadProfile()
    return () => {
      isMounted = false
    }
  }, [emptyForm])

  useEffect(() => {
    if (!avatarPreview) return undefined
    return () => URL.revokeObjectURL(avatarPreview)
  }, [avatarPreview])

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const updateNestedField = (section, key, value) => {
    setForm((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }))
  }

  const validateForm = () => {
    if (!form.firstName.trim()) {
      return 'First name is required.'
    }
    if (!form.country.trim()) {
      return 'Country is required.'
    }
    if (form.contactInfo.email && !form.contactInfo.email.includes('@')) {
      return 'Contact email is invalid.'
    }
    if (form.security.recoveryEmail && !form.security.recoveryEmail.includes('@')) {
      return 'Recovery email is invalid.'
    }
    return ''
  }

  const handleSave = async () => {
    setError('')
    setSuccess('')
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }
    setIsSaving(true)
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to save profile.')
      }
      setInitialForm(form)
      if (form.security.question && form.security.answer) {
        setHasSecurityAnswer(true)
        setForm((prev) => ({
          ...prev,
          security: {
            ...prev.security,
            answer: '',
          },
        }))
      }
      setSuccess('Profile updated.')
      pushAlert({ type: 'success', title: 'Profile', message: 'Profile updated.' })
    } catch (err) {
      const message = err?.message || 'Unable to save profile.'
      setError(message)
      pushAlert({ type: 'error', title: 'Profile', message })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setForm(initialForm)
    setError('')
    setSuccess('')
  }

  const handleResetSecurityQuestion = async () => {
    setError('')
    setSuccess('')
    if (!resetPassword.trim()) {
      setError('Password is required to reset.')
      return
    }
    if (!resetQuestion.trim() || !resetAnswer.trim()) {
      setError('Security question and answer are required.')
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
      setResetOpen(false)
      setResetPassword('')
      setResetQuestion('')
      setResetAnswer('')
      setSuccess('Security question updated.')
      pushAlert({ type: 'success', title: 'Security', message: 'Security question updated.' })
    } catch (err) {
      const message = err?.message || 'Unable to reset security question.'
      setError(message)
      pushAlert({ type: 'error', title: 'Security', message })
    } finally {
      setIsSaving(false)
    }
  }

  const handleVerifyPassword = async () => {
    setError('')
    setSuccess('')
    if (!resetPassword.trim()) {
      setError('Password is required to continue.')
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
        title: 'Security',
        message: 'Password verified. You can reset your question now.',
      })
    } catch (err) {
      const message = err?.message || 'Password verification failed.'
      setError(message)
      pushAlert({ type: 'error', title: 'Security', message })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setError('')
    setSuccess('')
    setIsUploadingAvatar(true)
    const previewUrl = URL.createObjectURL(file)
    setAvatarPreview(previewUrl)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch('/api/user/avatar/upload', {
        method: 'POST',
        body: formData,
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to upload avatar.')
      }
      setAvatarUrl(payload?.avatar_url || '')
      setAvatarPreview('')
      setSuccess('Avatar updated.')
    } catch (err) {
      setError(err?.message || 'Unable to upload avatar.')
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const avatarSrc = avatarPreview || avatarUrl

  return (
    <div className='space-y-6 pb-24'>
      <div>
        <h1 className='text-2xl font-semibold text-gray-900'>PERSONAL DATA</h1>
        <p className='mt-1 text-sm text-gray-500'>
          Enter your personal data so that you do not have to fill it manually when placing an order.
        </p>
      </div>

      <div className='rounded-2xl border border-gray-200 bg-white p-6 shadow-sm'>
        <div className='flex items-center justify-between'>
          <h2 className='text-sm font-semibold text-gray-900'>Personal Info</h2>
        </div>

        <div className='mt-4 flex flex-col gap-6 lg:flex-row'>
          <div className='flex flex-col items-center gap-3 lg:w-48'>
            <div className='h-24 w-24 overflow-hidden rounded-full border border-gray-200 bg-gray-100 flex items-center justify-center'>
              {avatarSrc ? (
                <Image
                  src={avatarSrc}
                  alt='Profile avatar'
                  width={96}
                  height={96}
                  className='h-24 w-24 object-cover'
                  unoptimized
                />
              ) : (
                <svg
                  className='h-10 w-10 text-gray-400'
                  viewBox='0 0 24 24'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                  aria-hidden='true'
                >
                  <path
                    d='M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5Z'
                    stroke='currentColor'
                    strokeWidth='1.5'
                  />
                  <path
                    d='M4 21c0-4.418 3.582-8 8-8s8 3.582 8 8'
                    stroke='currentColor'
                    strokeWidth='1.5'
                    strokeLinecap='round'
                  />
                </svg>
              )}
            </div>
            <label className='text-xs font-medium text-gray-700'>
              <span className='sr-only'>Upload avatar</span>
              <input
                type='file'
                accept='image/png,image/jpeg,image/webp'
                onChange={handleAvatarChange}
                className='hidden'
              />
              <span className='inline-flex cursor-pointer items-center rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:border-gray-300'>
                {isUploadingAvatar ? 'Uploading...' : 'Change photo'}
              </span>
            </label>
          </div>

          <div className='flex-1 space-y-4'>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              <div>
                <label className='text-xs font-medium text-gray-500'>First Name*</label>
                <input
                  type='text'
                  value={form.firstName}
                  onChange={(event) => updateField('firstName', event.target.value)}
                  className='mt-1 w-full rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10'
                  placeholder='First name'
                />
              </div>
              <div>
                <label className='text-xs font-medium text-gray-500'>Nickname</label>
                <input
                  type='text'
                  value={form.nickname}
                  onChange={(event) => updateField('nickname', event.target.value)}
                  className='mt-1 w-full rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10'
                  placeholder='Nickname'
                />
              </div>
            </div>

            <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
              <div>
                <label className='text-xs font-medium text-gray-500'>Date of Birth</label>
                <input
                  type='date'
                  value={form.dateOfBirth}
                  onChange={(event) => updateField('dateOfBirth', event.target.value)}
                  className='mt-1 w-full rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10'
                />
              </div>
              <div>
                <label className='text-xs font-medium text-gray-500'>Gender</label>
                <select
                  value={form.gender}
                  onChange={(event) => updateField('gender', event.target.value)}
                  className='mt-1 w-full rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10'
                >
                  <option value=''>Select</option>
                  <option value='Female'>Female</option>
                  <option value='Male'>Male</option>
                  <option value='Other'>Other</option>
                </select>
              </div>
              <div>
                <label className='text-xs font-medium text-gray-500'>Country*</label>
                <select
                  value={form.country}
                  onChange={(event) => updateField('country', event.target.value)}
                  className='mt-1 w-full rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10'
                >
                  <option value=''>Select country</option>
                  {[
                    'Nigeria',
                    'United States',
                    'United Kingdom',
                    'Canada',
                    'Germany',
                    'France',
                    'Italy',
                    'Spain',
                    'Netherlands',
                    'South Africa',
                    'Kenya',
                    'Ghana',
                    'United Arab Emirates',
                    'Saudi Arabia',
                    'India',
                    'Pakistan',
                    'China',
                    'Japan',
                    'South Korea',
                    'Australia',
                    'Brazil',
                    'Mexico',
                    'Argentina',
                  ].map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              <div>
                <label className='text-xs font-medium text-gray-500'>Email</label>
                <input
                  type='email'
                  value={email}
                  readOnly
                  className='mt-1 w-full rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-500 bg-gray-50'
                />
              </div>
            </div>

          </div>
        </div>
      </div>

      <details className='rounded-2xl border border-gray-200 bg-white p-4 shadow-sm'>
        <summary className='cursor-pointer text-sm font-semibold text-gray-900'>
          Security
        </summary>
        <div className='mt-4 grid grid-cols-1 gap-4 md:grid-cols-2'>
          <div>
            <label className='text-xs font-medium text-gray-500'>Recovery Email</label>
            <input
              type='email'
              value={form.security.recoveryEmail}
              onChange={(event) => updateNestedField('security', 'recoveryEmail', event.target.value)}
              className='mt-1 w-full rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10'
              placeholder='Recovery email'
            />
          </div>
          {!hasSecurityAnswer ? (
            <>
              <div>
                <label className='text-xs font-medium text-gray-500'>Security Question</label>
                <select
                  value={form.security.question}
                  onChange={(event) => updateNestedField('security', 'question', event.target.value)}
                  className='mt-1 w-full rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10'
                >
                  <option value=''>Select a question</option>
                  {[
                    'What is your mother’s maiden name?',
                    'What was the name of your first pet?',
                    'What city were you born in?',
                    'What is your favorite book?',
                    'What was your first school?',
                  ].map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              {form.security.question ? (
                <div>
                  <label className='text-xs font-medium text-gray-500'>Answer</label>
                  <input
                    type='text'
                    value={form.security.answer}
                    onChange={(event) => updateNestedField('security', 'answer', event.target.value)}
                    className='mt-1 w-full rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10'
                    placeholder='Answer'
                    autoComplete='off'
                  />
                </div>
              ) : null}
            </>
          ) : (
            <div className='md:col-span-2'>
              {!resetOpen ? (
                <button
                  type='button'
                  onClick={() => {
                    setResetOpen(true)
                    setShowPasswordModal(true)
                  }}
                  className='rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:border-gray-300'
                >
                  Reset security question
                </button>
              ) : null}
              {resetOpen && resetAuthorized ? (
                <div className='mt-4 grid grid-cols-1 gap-4 md:grid-cols-2'>
                  <div>
                    <label className='text-xs font-medium text-gray-500'>New Security Question</label>
                    <select
                      value={resetQuestion}
                      onChange={(event) => setResetQuestion(event.target.value)}
                      className='mt-1 w-full rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10'
                    >
                      <option value=''>Select a question</option>
                      {[
                        'What is your mother’s maiden name?',
                        'What was the name of your first pet?',
                        'What city were you born in?',
                        'What is your favorite book?',
                        'What was your first school?',
                      ].map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                  {resetQuestion ? (
                    <div>
                      <label className='text-xs font-medium text-gray-500'>New Answer</label>
                      <input
                        type='text'
                        value={resetAnswer}
                        onChange={(event) => setResetAnswer(event.target.value)}
                        className='mt-1 w-full rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10'
                        placeholder='Answer'
                        autoComplete='off'
                      />
                    </div>
                  ) : null}
                  <div className='md:col-span-2 flex flex-wrap gap-3'>
                    <button
                      type='button'
                      onClick={handleResetSecurityQuestion}
                      className='rounded-full bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60'
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
                      className='rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300'
                    >
                      Cancel reset
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </details>

      {showPasswordModal ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'>
          <div className='w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl'>
            <h3 className='text-sm font-semibold text-gray-900'>
              Password required to continue
            </h3>
            <p className='mt-1 text-xs text-gray-500'>
              Enter your account password to reset your security question.
            </p>
            <div className='mt-4'>
              <label className='text-xs font-medium text-gray-500'>Account Password</label>
              <input
                type='password'
                value={resetPassword}
                onChange={(event) => setResetPassword(event.target.value)}
                className='mt-1 w-full rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10'
                placeholder='Enter password'
                autoComplete='current-password'
              />
            </div>
            <div className='mt-4 flex flex-wrap gap-3'>
              <button
                type='button'
                onClick={handleVerifyPassword}
                className='rounded-full bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800 disabled:opacity-60'
                disabled={isSaving}
              >
                {isSaving ? 'Verifying...' : 'Continue'}
              </button>
              <button
                type='button'
                onClick={() => {
                  setShowPasswordModal(false)
                  setResetOpen(false)
                  setResetAuthorized(false)
                  setResetPassword('')
                }}
                className='rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:border-gray-300'
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <details className='rounded-2xl border border-gray-200 bg-white p-4 shadow-sm'>
        <summary className='cursor-pointer text-sm font-semibold text-gray-900'>
          Contact Info
        </summary>
        <div className='mt-4 grid grid-cols-1 gap-4 md:grid-cols-2'>
          <div>
            <label className='text-xs font-medium text-gray-500'>Phone</label>
            <div className='mt-1 flex items-center rounded-full border border-gray-200 px-3 py-2'>
              <span className='mr-2 text-xs font-semibold text-gray-500'>
                {countryRule.code ? `+${countryRule.code}` : '+--'}
              </span>
              <input
                type='text'
                inputMode='numeric'
                pattern='[0-9]*'
                maxLength={countryRule.max}
                value={form.contactInfo.phone}
                onChange={(event) =>
                  updateNestedField(
                    'contactInfo',
                    'phone',
                    event.target.value.replace(/[^0-9]/g, '').slice(0, countryRule.max),
                  )
                }
                className='w-full text-sm text-gray-900 focus:outline-none'
                placeholder='Phone number'
              />
            </div>
          </div>
          <div className='relative'>
            <div className='flex items-center gap-2'>
              <label className='text-xs font-medium text-gray-500'>WhatsApp phone</label>
              <button
                type='button'
                className='group relative inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 text-[10px] font-semibold text-gray-500'
                aria-label='WhatsApp phone info'
              >
                i
                <span className='pointer-events-none absolute left-1/2 top-6 w-56 -translate-x-1/2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px] text-gray-600 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus:opacity-100'>
                  Used for faster order notifications, follow-ups, and latest product updates.
                </span>
              </button>
            </div>
            <div className='mt-1 flex items-center rounded-full border border-gray-200 px-3 py-2'>
              <span className='mr-2 text-xs font-semibold text-gray-500'>
                {countryRule.code ? `+${countryRule.code}` : '+--'}
              </span>
              <input
                type='text'
                inputMode='numeric'
                pattern='[0-9]*'
                maxLength={countryRule.max}
                value={form.contactInfo.whatsapp}
                onChange={(event) =>
                  updateNestedField(
                    'contactInfo',
                    'whatsapp',
                    event.target.value.replace(/[^0-9]/g, '').slice(0, countryRule.max),
                  )
                }
                className='w-full text-sm text-gray-900 focus:outline-none'
                placeholder='WhatsApp number'
              />
            </div>
          </div>
        </div>
      </details>

      <details className='rounded-2xl border border-gray-200 bg-white p-4 shadow-sm'>
        <summary className='cursor-pointer text-sm font-semibold text-gray-900'>
          Delivery address
        </summary>
        <div className='mt-4 grid grid-cols-1 gap-4 md:grid-cols-2'>
          <div>
            <label className='text-xs font-medium text-gray-500'>Address line 1</label>
            <input
              type='text'
              value={form.deliveryAddress.line1}
              onChange={(event) => updateNestedField('deliveryAddress', 'line1', event.target.value)}
              className='mt-1 w-full rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10'
              placeholder='Street address'
            />
          </div>
          <div>
            <label className='text-xs font-medium text-gray-500'>Address line 2</label>
            <input
              type='text'
              value={form.deliveryAddress.line2}
              onChange={(event) => updateNestedField('deliveryAddress', 'line2', event.target.value)}
              className='mt-1 w-full rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10'
              placeholder='Apartment, suite'
            />
          </div>
          <div>
            <label className='text-xs font-medium text-gray-500'>City</label>
            <input
              type='text'
              value={form.deliveryAddress.city}
              onChange={(event) => updateNestedField('deliveryAddress', 'city', event.target.value)}
              className='mt-1 w-full rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10'
              placeholder='City'
            />
          </div>
          <div>
            <label className='text-xs font-medium text-gray-500'>State</label>
            <input
              type='text'
              value={form.deliveryAddress.state}
              onChange={(event) => updateNestedField('deliveryAddress', 'state', event.target.value)}
              className='mt-1 w-full rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10'
              placeholder='State'
            />
          </div>
          <div>
            <label className='text-xs font-medium text-gray-500'>Postal code</label>
            <input
              type='text'
              value={form.deliveryAddress.postalCode}
              onChange={(event) =>
                updateNestedField('deliveryAddress', 'postalCode', event.target.value)
              }
              className='mt-1 w-full rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10'
              placeholder='Postal code'
            />
          </div>
          <div>
            <label className='text-xs font-medium text-gray-500'>Country</label>
            <input
              type='text'
              value={form.deliveryAddress.country}
              onChange={(event) =>
                updateNestedField('deliveryAddress', 'country', event.target.value)
              }
              className='mt-1 w-full rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10'
              placeholder='Country'
            />
          </div>
        </div>
      </details>

      <details className='rounded-2xl border border-gray-200 bg-white p-4 shadow-sm'>
        <summary className='cursor-pointer text-sm font-semibold text-gray-900'>
          Interests
        </summary>
        <div className='mt-4'>
          <textarea
            value={form.interests}
            onChange={(event) => updateField('interests', event.target.value)}
            className='w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10'
            rows={3}
            placeholder='Share your interests'
          />
        </div>
      </details>

      <details className='rounded-2xl border border-gray-200 bg-white p-4 shadow-sm'>
        <summary className='cursor-pointer text-sm font-semibold text-gray-900'>
          Additional info
        </summary>
        <div className='mt-4'>
          <textarea
            value={form.additionalInfo}
            onChange={(event) => updateField('additionalInfo', event.target.value)}
            className='w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10'
            rows={3}
            placeholder='Additional information'
          />
        </div>
      </details>

      <div className='fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 px-5 py-2 shadow-[0_-6px_16px_rgba(0,0,0,0.08)] backdrop-blur'>
        <div className='mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2'>
          <div className='text-xs font-medium text-gray-600'>
            {latestAlert?.message || ''}
          </div>
          <button
            type='button'
            onClick={handleSave}
            className='rounded-full bg-gray-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-gray-800 disabled:opacity-60'
            disabled={isSaving || isLoading}
          >
            {isSaving ? (
              <span className='inline-flex items-center gap-2'>
                <svg
                  className='h-4 w-4 animate-spin'
                  viewBox='0 0 24 24'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                  aria-hidden='true'
                >
                  <circle
                    cx='12'
                    cy='12'
                    r='9'
                    stroke='currentColor'
                    strokeWidth='2'
                    opacity='0.25'
                  />
                  <path
                    d='M21 12a9 9 0 0 0-9-9'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                  />
                </svg>
                Saving
              </span>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
