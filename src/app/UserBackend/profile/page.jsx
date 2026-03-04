'use client'

import CustomSelect from '@/components/common/CustomSelect'
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
import {
  loadUserProfileBootstrap,
  primeUserProfileBootstrap,
} from '@/lib/user/profile-bootstrap-client'

const inputClassName = `mt-2 ${accountInputClass}`
const countrySelectInputClass =
  'h-11 w-full appearance-none rounded-xl border border-slate-300 bg-white pl-10 pr-10 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10'

const INTEREST_SECTIONS = [
  {
    key: 'categories',
    question: "What's Your Fashion Energy?",
    max: 3,
    options: [
      'Designed for Women',
      'Made for Men',
      'Fashionably Kids',
      'Special Occasion',
      'Personal Care',
      'Fragrance',
    ],
  },
  {
    key: 'audience',
    question: 'Who do you usually buy clothes for?',
    max: 2,
    options: ['Me', 'My Man', 'My Woman', 'My Kids', 'Gift', 'Family'],
  },
  {
    key: 'styles',
    question: 'Build Your Wardrobe Mood',
    max: 1,
    options: ['Basics', 'Casual', 'Elegant', 'Sporty', 'Vintage', 'Party', 'Workwear', 'Wedding guest'],
  },
]

const getInterestLimit = (sectionKey) => {
  const section = INTEREST_SECTIONS.find((entry) => entry.key === sectionKey)
  return Number.isFinite(section?.max) && section.max > 0 ? section.max : 1
}

const normalizeInterestArray = (value) => {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry || '').trim()).filter(Boolean)
  }
  if (typeof value !== 'string') return []
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

const normalizeInterestsProfile = (value) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const source = value
    return {
      categories: normalizeInterestArray(source.categories),
      audience: normalizeInterestArray(source.audience),
      styles: normalizeInterestArray(source.styles),
    }
  }
  return {
    categories: normalizeInterestArray(value),
    audience: [],
    styles: [],
  }
}

function ProfilePageSkeleton() {
  const fieldSkeleton = (
    <div>
      <div className='h-3 w-24 animate-pulse rounded bg-slate-200' />
      <div className='mt-2 h-11 w-full animate-pulse rounded-full bg-slate-100' />
    </div>
  )

  return (
    <div className={`${accountPageShellClass} mx-auto max-w-5xl overflow-x-hidden`}>
      <section className={`${accountCardClass} relative overflow-hidden`}>
        <div className='relative'>
          <div className='h-6 w-24 animate-pulse rounded bg-slate-200' />
          <div className='mt-2 h-4 w-56 animate-pulse rounded bg-slate-100' />
        </div>

        <div className='mt-5 flex flex-col items-center'>
          <div className='relative h-20 w-20'>
            <div className='h-20 w-20 animate-pulse rounded-full border border-slate-200 bg-slate-100' />
            <div className='absolute -bottom-1 -right-1 h-7 w-7 animate-pulse rounded-full border border-slate-200 bg-slate-100' />
          </div>
          <div className='mt-3 h-4 w-40 animate-pulse rounded bg-slate-100' />
        </div>
      </section>

      <section className={accountCardClass}>
        <div className='h-4 w-32 animate-pulse rounded bg-slate-200' />
        <div className='mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2'>
          {fieldSkeleton}
          {fieldSkeleton}
          {fieldSkeleton}
          {fieldSkeleton}
          {fieldSkeleton}
          {fieldSkeleton}
        </div>
      </section>

      <section className={accountCardClass}>
        <div className='flex items-center justify-between'>
          <div className='h-4 w-24 animate-pulse rounded bg-slate-200' />
          <div className='h-4 w-4 animate-pulse rounded bg-slate-100' />
        </div>
        <div className='mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2'>
          {fieldSkeleton}
          {fieldSkeleton}
        </div>
      </section>

      <div className='grid grid-cols-1 gap-5 lg:grid-cols-2'>
        <section className={accountCardClass}>
          <div className='h-4 w-24 animate-pulse rounded bg-slate-200' />
          <div className='mt-2 h-3 w-72 animate-pulse rounded bg-slate-100' />
          <div className='mt-4 space-y-4'>
            {Array.from({ length: 3 }).map((_, rowIndex) => (
              <div key={`interest-question-skeleton-${rowIndex}`}>
                <div className='h-3 w-52 animate-pulse rounded bg-slate-200' />
                <div className='mt-2 flex flex-wrap gap-2'>
                  {Array.from({ length: 4 }).map((__, chipIndex) => (
                    <span
                      key={`interest-chip-skeleton-${rowIndex}-${chipIndex}`}
                      className='inline-flex h-8 w-24 animate-pulse rounded-full bg-slate-100'
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className='fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-2.5 sm:px-5'>
        <div className='mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-2 sm:flex-nowrap'>
          <div className='h-3 w-40 animate-pulse rounded bg-slate-100' />
          <div className='h-10 w-28 animate-pulse rounded-full bg-slate-200' />
        </div>
      </div>
    </div>
  )
}

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
      interests: {
        categories: [],
        audience: [],
        styles: [],
      },
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
        const payload = await loadUserProfileBootstrap()
        if (!payload) {
          throw new Error('Unable to load profile.')
        }
        if (!isMounted) return
        const profile = payload?.profile || {}
        const next = {
          ...emptyForm,
          ...profile,
          contactInfo: {
            ...emptyForm.contactInfo,
            ...(profile?.contactInfo || {}),
          },
          interests: normalizeInterestsProfile(profile?.interests),
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

  const toggleInterest = (sectionKey, optionLabel) => {
    const key = String(sectionKey || '').trim()
    const label = String(optionLabel || '').trim()
    if (!key || !label) return
    const sectionLimit = getInterestLimit(key)

    setError('')
    setForm((prev) => {
      const currentInterests = normalizeInterestsProfile(prev.interests)
      const currentList = Array.isArray(currentInterests[key]) ? currentInterests[key] : []
      const exists = currentList.includes(label)
      const nextList = exists
        ? currentList.filter((entry) => entry !== label)
        : currentList.length >= sectionLimit
          ? currentList
          : [...currentList, label]

      if (!exists && currentList.length >= sectionLimit) {
        setError(`You can pick up to ${sectionLimit} options for this question.`)
      }

      return {
        ...prev,
        interests: {
          ...currentInterests,
          [key]: nextList,
        },
      }
    })
  }

  const validateForm = () => {
    if (!form.firstName.trim()) return 'First name is required.'
    if (!form.country.trim()) return 'Country is required.'
    const interests = normalizeInterestsProfile(form.interests)
    const categoriesLimit = getInterestLimit('categories')
    const audienceLimit = getInterestLimit('audience')
    const stylesLimit = getInterestLimit('styles')
    if (interests.categories.length > categoriesLimit) {
      return `You can pick up to ${categoriesLimit} Fashion Energy options.`
    }
    if (interests.audience.length > audienceLimit) {
      return `You can pick up to ${audienceLimit} Buy For options.`
    }
    if (interests.styles.length > stylesLimit) {
      return `You can pick up to ${stylesLimit} Wardrobe Mood options.`
    }
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
      const nextPayload = {
        ...form,
        interests: normalizeInterestsProfile(form.interests),
      }
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextPayload),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to save profile.')
      }
      primeUserProfileBootstrap(payload)
      setInitialForm(nextPayload)
      setForm(nextPayload)
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
    return <ProfilePageSkeleton />
  }

  return (
    <div className={`${accountPageShellClass} mx-auto max-w-5xl overflow-x-hidden`}>
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

      <section className={`${accountCardClass} overflow-x-clip`}>
        <h2 className='text-sm font-semibold uppercase tracking-[0.12em] text-slate-900/55'>Personal details</h2>
        <div className='mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 [&>*]:min-w-0'>
          <div className='min-w-0'>
            <label className={accountLabelClass}>First Name*</label>
            <input
              type='text'
              value={form.firstName}
              onChange={(event) => updateField('firstName', event.target.value)}
              className={`${inputClassName} min-w-0`}
              placeholder='First name'
            />
          </div>
          <div className='min-w-0'>
            <label className={accountLabelClass}>Nickname</label>
            <input
              type='text'
              value={form.nickname}
              onChange={(event) => updateField('nickname', event.target.value)}
              className={`${inputClassName} min-w-0`}
              placeholder='Nickname'
            />
          </div>
          <div className='min-w-0'>
            <label className={accountLabelClass}>Date of Birth</label>
            <input
              type='date'
              value={form.dateOfBirth}
              onChange={(event) => updateField('dateOfBirth', event.target.value)}
              className={`${inputClassName} min-w-0`}
            />
          </div>
          <div className='min-w-0'>
            <label className={accountLabelClass}>Gender</label>
            <div className='relative mt-2'>
              <CustomSelect
                value={form.gender}
                onChange={(event) => updateField('gender', event.target.value)}
                className={`${accountSelectClass} mt-0 bg-none pr-10`}
              >
                <option value=''>Select</option>
                <option value='Female'>Female</option>
                <option value='Male'>Male</option>
                <option value='Other'>Other</option>
              </CustomSelect>
            </div>
          </div>
          <div className='min-w-0'>
            <label className={accountLabelClass}>Country*</label>
            <div className='mt-2 rounded-2xl border border-slate-200 bg-white p-2.5'>
              <p className='text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500'>Ship to</p>
              <div className='relative mt-2'>
                <span className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 inline-flex h-5 w-5 overflow-hidden rounded-sm border border-slate-200'>
                  <span className='h-full w-1/3 bg-[#118647]' />
                  <span className='h-full w-1/3 bg-white' />
                  <span className='h-full w-1/3 bg-[#118647]' />
                </span>
                <CustomSelect
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
                </CustomSelect>
              </div>
            </div>
          </div>
          <div className='min-w-0'>
            <label className={accountLabelClass}>Account email</label>
            <input
              type='email'
              value={email}
              readOnly
              className={`${inputClassName} min-w-0 bg-slate-50 text-slate-500`}
            />
          </div>
        </div>
      </section>

      <section className={accountCardClass}>
        <h2 className='text-sm font-semibold text-slate-900'>Contact info</h2>
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
                <span className='pointer-events-none absolute right-0 top-6 z-10 w-[min(14rem,calc(100vw-2rem))] rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-600 opacity-0 shadow-lg transition-opacity duration-200 invisible group-hover/tooltip:visible group-hover/tooltip:opacity-100 group-focus/tooltip:visible group-focus/tooltip:opacity-100'>
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
      </section>

      <section className={accountCardClass}>
        <h3 className='text-lg font-semibold text-slate-900'>Let&apos;s Style You</h3>
        <p className='mt-1 text-sm text-slate-500'>
          Answer 3 quick questions so we can style your homepage and personalize your experience.
        </p>

        <div className='mt-4 space-y-5'>
          {INTEREST_SECTIONS.map((section) => {
            const selectedValues = normalizeInterestsProfile(form.interests)[section.key]
            return (
              <div key={section.key}>
                <div className='flex items-center justify-between gap-2'>
                  <p className='text-sm font-semibold text-slate-800'>{section.question}</p>
                  <span className='text-xs font-semibold text-slate-500'>
                    {selectedValues.length}/{section.max}
                  </span>
                </div>
                <div className='mt-2 flex flex-wrap gap-2'>
                  {section.options.map((optionLabel) => {
                    const isSelected = selectedValues.includes(optionLabel)
                    return (
                      <button
                        key={`${section.key}-${optionLabel}`}
                        type='button'
                        onClick={() => toggleInterest(section.key, optionLabel)}
                        className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          isSelected
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        {optionLabel}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <div className='fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-2.5 sm:px-5'>
        <div className='mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-2 sm:flex-nowrap'>
          <div className={`${accountMetaTextClass} min-w-0 flex-1 truncate`}>{latestAlert?.message || ''}</div>
          <button
            type='button'
            onClick={handleSave}
            className={`${accountPrimaryButtonClass} shrink-0`}
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
