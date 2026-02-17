'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ACCEPTED_COUNTRIES } from '@/lib/user/accepted-countries'

const STEPS = {
  EMAIL: 1,
  CODE: 2,
  PHONE: 3,
  PROFILE: 4,
  SHIPPING: 5,
  COMPLETE: 6,
}

export default function VendorSignupForm({ signInHref = '/vendor/login' }) {
  const [step, setStep] = useState(STEPS.EMAIL)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [phone, setPhone] = useState('')
  const [fullName, setFullName] = useState('')
  const [brandName, setBrandName] = useState('')
  const [shippingCountry, setShippingCountry] = useState(String(ACCEPTED_COUNTRIES[0] || 'Nigeria'))
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const post = async (url, payload) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(data?.error || 'Request failed.')
    }
    return data
  }

  const handleSendCode = async (event) => {
    event.preventDefault()
    if (isBusy) return

    setIsBusy(true)
    setError('')
    try {
      await post('/api/auth/vendor-onboarding/email', { email })
      setMessage('A verification code has been sent to your email.')
      setStep(STEPS.CODE)
    } catch (err) {
      setError(err?.message || 'Unable to send verification code.')
    } finally {
      setIsBusy(false)
    }
  }

  const handleVerifyCode = async (event) => {
    event.preventDefault()
    if (isBusy) return

    setIsBusy(true)
    setError('')
    try {
      await post('/api/auth/vendor-onboarding/verify', { email, code })
      setMessage('Email verified.')
      setStep(STEPS.PHONE)
    } catch (err) {
      setError(err?.message || 'Unable to verify code.')
    } finally {
      setIsBusy(false)
    }
  }

  const handleResendCode = async () => {
    if (isBusy || resendCooldown > 0) return
    setIsBusy(true)
    setError('')
    setMessage('')
    try {
      await post('/api/auth/vendor-onboarding/email', { email })
      setMessage('A new verification code has been sent.')
      setResendCooldown(30)
    } catch (err) {
      setError(err?.message || 'Unable to resend verification code.')
    } finally {
      setIsBusy(false)
    }
  }

  const handleChangeEmail = () => {
    if (isBusy) return
    setCode('')
    setError('')
    setMessage('')
    setResendCooldown(0)
    setStep(STEPS.EMAIL)
  }

  const handlePhoneContinue = async (event) => {
    event.preventDefault()
    if (isBusy) return
    if (!phone.trim()) {
      setError('Phone number is required.')
      return
    }
    setError('')
    setMessage('')
    setStep(STEPS.PROFILE)
  }

  const handleProfileContinue = async (event) => {
    event.preventDefault()
    if (isBusy) return
    setIsBusy(true)
    setError('')
    try {
      const data = await post('/api/auth/vendor-onboarding/brand', { brandName })
      if (!data?.available) {
        setError('Brand name already exists. Please choose another.')
        return
      }
      setMessage('Brand name is available.')
      setStep(STEPS.SHIPPING)
    } catch (err) {
      setError(err?.message || 'Unable to validate brand name.')
    } finally {
      setIsBusy(false)
    }
  }

  const handleSubmitRequest = async (event) => {
    event.preventDefault()
    if (isBusy) return
    setIsBusy(true)
    setError('')
    try {
      await post('/api/auth/vendor-onboarding/submit', {
        phone,
        fullName,
        brandName,
        shippingCountry,
      })
      setMessage('Your seller account is now active. You can sign in and access your dashboard immediately.')
      setStep(STEPS.COMPLETE)
    } catch (err) {
      setError(err?.message || 'Unable to submit vendor request.')
    } finally {
      setIsBusy(false)
    }
  }

  useEffect(() => {
    if (resendCooldown <= 0) return undefined
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  return (
    <div className='mt-8 grid gap-4'>
      <p className='text-xs font-semibold uppercase tracking-[0.18em] text-slate-500'>
        Step {Math.min(step, 5)} of 5
      </p>
      {error ? <p className='text-sm text-rose-500'>{error}</p> : null}
      {message ? <p className='text-sm text-emerald-600'>{message}</p> : null}

      {step === STEPS.EMAIL ? (
        <form className='grid gap-4' onSubmit={handleSendCode}>
          <label className='space-y-2 text-sm font-semibold text-slate-700'>
            Email address
            <input
              type='email'
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder='you@brand.com'
              autoComplete='email'
              className='w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none'
              required
            />
          </label>
          <button
            type='submit'
            disabled={isBusy}
            className='mt-2 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70'
          >
            {isBusy ? 'Sending code...' : 'Send verification code'}
          </button>
        </form>
      ) : null}

      {step === STEPS.CODE ? (
        <form className='grid gap-4' onSubmit={handleVerifyCode}>
          <p className='text-xs text-slate-500'>Code sent to {email}</p>
          <label className='space-y-2 text-sm font-semibold text-slate-700'>
            Verification code
            <input
              type='text'
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder='Enter code from your email'
              className='w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none'
              required
            />
          </label>
          <button
            type='submit'
            disabled={isBusy}
            className='mt-2 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70'
          >
            {isBusy ? 'Verifying...' : 'Verify code'}
          </button>
          <div className='flex flex-wrap items-center justify-between gap-3 text-sm'>
            <button
              type='button'
              onClick={handleResendCode}
              disabled={isBusy || resendCooldown > 0}
              className='font-semibold text-slate-700 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50'
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
            </button>
            <button
              type='button'
              onClick={handleChangeEmail}
              disabled={isBusy}
              className='font-semibold text-slate-700 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50'
            >
              Change email
            </button>
          </div>
        </form>
      ) : null}

      {step === STEPS.PHONE ? (
        <form className='grid gap-4' onSubmit={handlePhoneContinue}>
          <label className='space-y-2 text-sm font-semibold text-slate-700'>
            Phone number
            <input
              type='tel'
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder='+234...'
              className='w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none'
              required
            />
          </label>
          <button
            type='submit'
            disabled={isBusy}
            className='mt-2 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70'
          >
            Continue
          </button>
        </form>
      ) : null}

      {step === STEPS.PROFILE ? (
        <form className='grid gap-4' onSubmit={handleProfileContinue}>
          <label className='space-y-2 text-sm font-semibold text-slate-700'>
            Full name
            <input
              type='text'
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder='Your full name'
              autoComplete='name'
              className='w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none'
              required
            />
          </label>
          <label className='space-y-2 text-sm font-semibold text-slate-700'>
            Brand or shop name
            <input
              type='text'
              value={brandName}
              onChange={(event) => setBrandName(event.target.value)}
              placeholder='Your brand or shop name'
              autoComplete='organization'
              className='w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none'
              required
            />
          </label>
          <button
            type='submit'
            disabled={isBusy}
            className='mt-2 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70'
          >
            {isBusy ? 'Checking brand...' : 'Continue'}
          </button>
        </form>
      ) : null}

      {step === STEPS.SHIPPING ? (
        <form className='grid gap-4' onSubmit={handleSubmitRequest}>
          <label className='space-y-2 text-sm font-semibold text-slate-700'>
            Where are you shipping from?
            <select
              value={shippingCountry}
              onChange={(event) => setShippingCountry(event.target.value)}
              className='w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none'
            >
              {ACCEPTED_COUNTRIES.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </label>
          <button
            type='submit'
            disabled={isBusy}
            className='mt-2 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70'
          >
            {isBusy ? 'Submitting...' : 'Activate seller account'}
          </button>
        </form>
      ) : null}

      {step === STEPS.COMPLETE ? (
        <div className='rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700'>
          Seller access enabled. Continue to sign in to your dashboard.
        </div>
      ) : null}

      <div className='flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500'>
        <span>Already have a seller account?</span>
        <Link href={signInHref} className='font-semibold text-slate-700 hover:text-slate-900'>
          Seller sign in
        </Link>
      </div>
    </div>
  )
}
