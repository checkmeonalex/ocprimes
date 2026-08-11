'use client'

import { useEffect, useState } from 'react'
import CustomSelect from '@/components/common/CustomSelect'
import {
  accountCardClass,
  accountErrorClass,
  accountInputClass,
  accountLabelClass,
  accountSelectClass,
  accountSuccessClass,
} from '@/components/user-backend/account/mobileTheme'

const BODY_SHAPES = [
  { value: '', label: 'Select' },
  { value: 'hourglass', label: 'Hourglass' },
  { value: 'pear', label: 'Pear' },
  { value: 'apple', label: 'Apple' },
  { value: 'rectangle', label: 'Rectangle' },
  { value: 'inverted_triangle', label: 'Inverted Triangle' },
]

const FIT_PREFERENCES = [
  { value: '', label: 'Select' },
  { value: 'fitted', label: 'Fitted' },
  { value: 'regular', label: 'Regular' },
  { value: 'relaxed', label: 'Relaxed' },
]

const emptyForm = {
  gender: 'female',
  height_cm: '',
  weight_kg: '',
  age_range: '',
  body_shape: '',
  bust_cm: '',
  waist_cm: '',
  hip_cm: '',
  usual_size: '',
  fit_preference: '',
}

export default function FitProfileSection() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [hasProfile, setHasProfile] = useState(false)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    let isMounted = true
    fetch('/api/user/body-profile', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (!isMounted) return
        const item = payload?.item
        if (item) {
          setForm({
            gender: item.gender || 'female',
            height_cm: item.height_cm ?? '',
            weight_kg: item.weight_kg ?? '',
            age_range: item.age_range || '',
            body_shape: item.body_shape || '',
            bust_cm: item.bust_cm ?? '',
            waist_cm: item.waist_cm ?? '',
            hip_cm: item.hip_cm ?? '',
            usual_size: item.usual_size || '',
            fit_preference: item.fit_preference || '',
          })
          setHasProfile(true)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [])

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    setError('')
    setSuccess('')
    const height = Number(form.height_cm)
    const weight = Number(form.weight_kg)
    if (!height || height < 50 || height > 260) {
      setError('Enter a valid height in cm.')
      return
    }
    if (!weight || weight < 20 || weight > 400) {
      setError('Enter a valid weight in kg.')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/user/body-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          gender: form.gender,
          height_cm: height,
          weight_kg: weight,
          age_range: form.age_range || undefined,
          body_shape: form.body_shape || undefined,
          bust_cm: form.bust_cm ? Number(form.bust_cm) : undefined,
          waist_cm: form.waist_cm ? Number(form.waist_cm) : undefined,
          hip_cm: form.hip_cm ? Number(form.hip_cm) : undefined,
          usual_size: form.usual_size || undefined,
          fit_preference: form.fit_preference || undefined,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to save fit profile.')
      }
      setHasProfile(true)
      setSuccess('Fit profile saved.')
    } catch (err) {
      setError(err?.message || 'Unable to save fit profile.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleClear = async () => {
    setError('')
    setSuccess('')
    setIsSaving(true)
    try {
      const response = await fetch('/api/user/body-profile', {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error('Unable to clear fit profile.')
      }
      setForm(emptyForm)
      setHasProfile(false)
      setSuccess('Fit profile cleared.')
    } catch (err) {
      setError(err?.message || 'Unable to clear fit profile.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return null

  return (
    <section className={accountCardClass}>
      <div className='flex items-center justify-between gap-2'>
        <div>
          <h2 className='text-sm font-semibold text-slate-900'>Fit Profile</h2>
          <p className='mt-1 text-sm text-slate-500'>
            Used by &quot;Find My Fit&quot; on product pages to recommend your size automatically.
          </p>
        </div>
      </div>

      {error ? <div className={`mt-3 ${accountErrorClass}`}>{error}</div> : null}
      {success ? <div className={`mt-3 ${accountSuccessClass}`}>{success}</div> : null}

      <div className='mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2'>
        <div>
          <label className={accountLabelClass}>Gender</label>
          <CustomSelect
            value={form.gender}
            onChange={(event) => updateField('gender', event.target.value)}
            className={`mt-2 ${accountSelectClass}`}
          >
            <option value='female'>Female</option>
            <option value='male'>Male</option>
          </CustomSelect>
        </div>
        <div>
          <label className={accountLabelClass}>Age range</label>
          <CustomSelect
            value={form.age_range}
            onChange={(event) => updateField('age_range', event.target.value)}
            className={`mt-2 ${accountSelectClass}`}
          >
            <option value=''>Select</option>
            {['Under 18', '18-24', '25-34', '35-44', '45-54', '55+'].map((range) => (
              <option key={range} value={range}>
                {range}
              </option>
            ))}
          </CustomSelect>
        </div>
        <div>
          <label className={accountLabelClass}>Height (cm)</label>
          <input
            type='number'
            inputMode='decimal'
            value={form.height_cm}
            onChange={(event) => updateField('height_cm', event.target.value)}
            className={`mt-2 ${accountInputClass}`}
            placeholder='e.g. 165'
          />
        </div>
        <div>
          <label className={accountLabelClass}>Weight (kg)</label>
          <input
            type='number'
            inputMode='decimal'
            value={form.weight_kg}
            onChange={(event) => updateField('weight_kg', event.target.value)}
            className={`mt-2 ${accountInputClass}`}
            placeholder='e.g. 60'
          />
        </div>
        <div>
          <label className={accountLabelClass}>Body shape</label>
          <CustomSelect
            value={form.body_shape}
            onChange={(event) => updateField('body_shape', event.target.value)}
            className={`mt-2 ${accountSelectClass}`}
          >
            {BODY_SHAPES.map((shape) => (
              <option key={shape.value} value={shape.value}>
                {shape.label}
              </option>
            ))}
          </CustomSelect>
        </div>
        <div>
          <label className={accountLabelClass}>Fit preference</label>
          <CustomSelect
            value={form.fit_preference}
            onChange={(event) => updateField('fit_preference', event.target.value)}
            className={`mt-2 ${accountSelectClass}`}
          >
            {FIT_PREFERENCES.map((pref) => (
              <option key={pref.value} value={pref.value}>
                {pref.label}
              </option>
            ))}
          </CustomSelect>
        </div>
        <div>
          <label className={accountLabelClass}>Bust (cm)</label>
          <input
            type='number'
            inputMode='decimal'
            value={form.bust_cm}
            onChange={(event) => updateField('bust_cm', event.target.value)}
            className={`mt-2 ${accountInputClass}`}
            placeholder='Optional'
          />
        </div>
        <div>
          <label className={accountLabelClass}>Waist (cm)</label>
          <input
            type='number'
            inputMode='decimal'
            value={form.waist_cm}
            onChange={(event) => updateField('waist_cm', event.target.value)}
            className={`mt-2 ${accountInputClass}`}
            placeholder='Optional'
          />
        </div>
        <div>
          <label className={accountLabelClass}>Hip (cm)</label>
          <input
            type='number'
            inputMode='decimal'
            value={form.hip_cm}
            onChange={(event) => updateField('hip_cm', event.target.value)}
            className={`mt-2 ${accountInputClass}`}
            placeholder='Optional'
          />
        </div>
        <div>
          <label className={accountLabelClass}>Usual size</label>
          <input
            type='text'
            value={form.usual_size}
            onChange={(event) => updateField('usual_size', event.target.value)}
            className={`mt-2 ${accountInputClass}`}
            placeholder='e.g. M, or UK 10'
          />
        </div>
      </div>

      <div className='mt-5 flex flex-wrap items-center gap-3'>
        <button
          type='button'
          onClick={handleSave}
          disabled={isSaving}
          className='rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
        >
          {isSaving ? 'Saving…' : 'Save fit profile'}
        </button>
        {hasProfile && (
          <button
            type='button'
            onClick={handleClear}
            disabled={isSaving}
            className='rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 disabled:opacity-60'
          >
            Clear
          </button>
        )}
      </div>
    </section>
  )
}
