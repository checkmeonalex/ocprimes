'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { useAlerts } from '@/context/AlertContext'
import {
  accountCardClass,
  accountErrorClass,
  accountInputClass,
  accountLabelClass,
  accountMetaTextClass,
  accountPageShellClass,
  accountPrimaryButtonClass,
  accountSelectClass,
  accountSuccessClass,
} from '@/components/user-backend/account/mobileTheme'
import { ACCEPTED_COUNTRIES } from '@/lib/user/accepted-countries'

const inputClassName = `mt-2 ${accountInputClass}`
const countrySelectInputClass =
  'h-11 w-full appearance-none rounded-xl border border-slate-300 bg-white pl-10 pr-10 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10'

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarPreview, setAvatarPreview] = useState('')
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [email, setEmail] = useState('')
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
      interests: '',
      additionalInfo: '',
    }),
    [],
  )

  const [form, setForm] = useState(emptyForm)
  const [initialForm, setInitialForm] = useState(emptyForm)

  const countryRule = useMemo(() => {
    const map = {
      Nigeria: { code: '234', max: 10 },
      International: { code: '1', max: 15 },
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
        }
        setForm(next)
        setInitialForm(next)
        setAvatarUrl(payload?.avatar_url || '')
        setEmail(payload?.email || '')
      } catch (err) {
        if (!isMounted) return
        const message = err?.message || 'Unable to load profile.'
        setError(message)
        pushAlert({ type: 'error', title: 'Profile', message })
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void loadProfile()
    return () => {
      isMounted = false
    }
  }, [emptyForm, pushAlert])

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
    if (!form.firstName.trim()) return 'First name is required.'
    if (!form.country.trim()) return 'Country is required.'
    if (form.contactInfo.email && !form.contactInfo.email.includes('@')) {
      return 'Contact email is invalid.'
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
      pushAlert({ type: 'success', title: 'Profile', message: 'Avatar updated.' })
    } catch (err) {
      const message = err?.message || 'Unable to upload avatar.'
      setError(message)
      pushAlert({ type: 'error', title: 'Profile', message })
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const avatarSrc = avatarPreview || avatarUrl

  if (isLoading) {
    return <div className='text-sm text-slate-500'>Loading profile...</div>
  }

  return (
    <div className={accountPageShellClass}>
      <section className={`${accountCardClass} relative overflow-hidden`}>
        <div className='relative'>
          <h1 className='text-lg font-semibold tracking-wide text-slate-900'>Profile</h1>
          <p className='mt-1 text-sm text-slate-500'>Manage your personal information.</p>
        </div>

        <div className='mt-5 flex flex-col items-center'>
          <div className='relative h-20 w-20'>
            <div className='h-20 w-20 overflow-hidden rounded-full border border-slate-300 bg-white'>
              {avatarSrc ? (
                <Image
                  src={avatarSrc}
                  alt='Profile avatar'
                  width={80}
                  height={80}
                  className='h-full w-full object-cover'
                  unoptimized
                />
              ) : (
                <div className='flex h-full w-full items-center justify-center text-slate-400'>
                  <svg
                    className='h-8 w-8'
                    viewBox='0 0 24 24'
                    fill='none'
                    xmlns='http://www.w3.org/2000/svg'
                    aria-hidden='true'
                  >
                    <path d='M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5Z' stroke='currentColor' strokeWidth='1.5' />
                    <path d='M4 21c0-4.418 3.582-8 8-8s8 3.582 8 8' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
                  </svg>
                </div>
              )}
            </div>
            <label className='absolute -bottom-1 -right-1 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-slate-300 bg-white text-slate-900'>
              <input
                type='file'
                accept='image/png,image/jpeg,image/webp'
                onChange={handleAvatarChange}
                className='hidden'
              />
              <svg className='h-3.5 w-3.5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8'>
                <path strokeLinecap='round' strokeLinejoin='round' d='M12 5v14M5 12h14' />
              </svg>
            </label>
          </div>
          <p className='mt-3 text-center text-sm text-slate-500'>
            {isUploadingAvatar ? 'Uploading photo...' : 'Upload a profile photo'}
          </p>
        </div>
      </section>

      {error ? <div className={accountErrorClass}>{error}</div> : null}
      {success ? <div className={accountSuccessClass}>{success}</div> : null}

      <section className={accountCardClass}>
        <h2 className='text-sm font-semibold uppercase tracking-[0.12em] text-slate-900/55'>Personal details</h2>
        <div className='mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2'>
          <div>
            <label className={accountLabelClass}>First Name*</label>
            <input
              type='text'
              value={form.firstName}
              onChange={(event) => updateField('firstName', event.target.value)}
              className={inputClassName}
              placeholder='First name'
            />
          </div>
          <div>
            <label className={accountLabelClass}>Nickname</label>
            <input
              type='text'
              value={form.nickname}
              onChange={(event) => updateField('nickname', event.target.value)}
              className={inputClassName}
              placeholder='Nickname'
            />
          </div>
          <div>
            <label className={accountLabelClass}>Date of Birth</label>
            <input
              type='date'
              value={form.dateOfBirth}
              onChange={(event) => updateField('dateOfBirth', event.target.value)}
              className={inputClassName}
            />
          </div>
          <div>
            <label className={accountLabelClass}>Gender</label>
            <div className='relative mt-2'>
              <select
                value={form.gender}
                onChange={(event) => updateField('gender', event.target.value)}
                className={`${accountSelectClass} mt-0 bg-none pr-10`}
              >
                <option value=''>Select</option>
                <option value='Female'>Female</option>
                <option value='Male'>Male</option>
                <option value='Other'>Other</option>
              </select>
              <svg
                className='pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-700'
                viewBox='0 0 20 20'
                fill='none'
                stroke='currentColor'
                strokeWidth='1.8'
                aria-hidden='true'
              >
                <path strokeLinecap='round' strokeLinejoin='round' d='m6 8 4 4 4-4' />
              </svg>
            </div>
          </div>
          <div>
            <label className={accountLabelClass}>Country*</label>
            <div className='mt-2 rounded-2xl border border-slate-200 bg-white p-2.5'>
              <p className='text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500'>Ship to</p>
              <div className='relative mt-2'>
                <span className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 inline-flex h-5 w-5 overflow-hidden rounded-sm border border-slate-200'>
                  <span className='h-full w-1/3 bg-[#118647]' />
                  <span className='h-full w-1/3 bg-white' />
                  <span className='h-full w-1/3 bg-[#118647]' />
                </span>
                <select
                  value={form.country}
                  onChange={(event) => updateField('country', event.target.value)}
                  className={countrySelectInputClass}
                >
                  <option value=''>Select country</option>
                  {ACCEPTED_COUNTRIES.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
                <svg
                  className='pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-700'
                  viewBox='0 0 20 20'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='1.8'
                  aria-hidden='true'
                >
                  <path strokeLinecap='round' strokeLinejoin='round' d='m6 8 4 4 4-4' />
                </svg>
              </div>
            </div>
          </div>
          <div>
            <label className={accountLabelClass}>Account email</label>
            <input type='email' value={email} readOnly className={`${inputClassName} bg-slate-50 text-slate-500`} />
          </div>
        </div>
      </section>

      <details className={`${accountCardClass} group`}>
        <summary className='flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-slate-900'>
          Contact info
          <svg
            className='h-4 w-4 text-slate-500 transition-transform duration-300 group-open:rotate-180'
            viewBox='0 0 20 20'
            fill='currentColor'
            aria-hidden='true'
          >
            <path d='M5.3 7.3 10 12l4.7-4.7 1.4 1.4L10 14.8 3.9 8.7z' />
          </svg>
        </summary>
        <div className='mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2'>
          <div>
            <label className={accountLabelClass}>Phone</label>
            <div className='mt-2 flex items-center rounded-full border border-slate-300 bg-white px-4 py-3'>
              <span className='mr-2 text-xs font-semibold text-slate-500'>
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
                className='w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-900/40'
                placeholder='Phone number'
              />
            </div>
          </div>
          <div className='relative'>
            <div className='flex items-center gap-2'>
              <label className={accountLabelClass}>WhatsApp phone</label>
              <button
                type='button'
                className='group/tooltip relative inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[10px] font-semibold text-slate-600'
                aria-label='WhatsApp phone info'
              >
                i
                <span className='pointer-events-none absolute left-1/2 top-6 z-10 w-56 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-600 opacity-0 shadow-lg transition-opacity duration-200 group-hover/tooltip:opacity-100 group-focus/tooltip:opacity-100'>
                  Used for faster order notifications, follow-ups, and latest product updates.
                </span>
              </button>
            </div>
            <div className='mt-2 flex items-center rounded-full border border-slate-300 bg-white px-4 py-3'>
              <span className='mr-2 text-xs font-semibold text-slate-500'>
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
                className='w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-900/40'
                placeholder='WhatsApp number'
              />
            </div>
          </div>
        </div>
      </details>

      <div className='grid grid-cols-1 gap-5 lg:grid-cols-2'>
        <section className={accountCardClass}>
          <h3 className='text-sm font-semibold uppercase tracking-[0.12em] text-slate-900/55'>Interests</h3>
          <textarea
            value={form.interests}
            onChange={(event) => updateField('interests', event.target.value)}
            className='mt-3 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-900/45 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10'
            rows={5}
            placeholder='Share your interests'
          />
        </section>

        <section className={accountCardClass}>
          <h3 className='text-sm font-semibold uppercase tracking-[0.12em] text-slate-900/55'>
            Additional info
          </h3>
          <textarea
            value={form.additionalInfo}
            onChange={(event) => updateField('additionalInfo', event.target.value)}
            className='mt-3 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-900/45 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10'
            rows={5}
            placeholder='Additional information'
          />
        </section>
      </div>

      <div className='fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-5 py-2.5'>
        <div className='mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-2'>
          <div className={accountMetaTextClass}>{latestAlert?.message || ''}</div>
          <button
            type='button'
            onClick={handleSave}
            className={accountPrimaryButtonClass}
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
                  <circle cx='12' cy='12' r='9' stroke='currentColor' strokeWidth='2' opacity='0.25' />
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
              'Save profile'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
