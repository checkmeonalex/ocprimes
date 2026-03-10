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

export default function VendorSignupForm({
  signInHref = '/vendor/login',
  variant = 'default',
}) {
  const isSellerClean = variant === 'seller-clean'
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

  const inputClassName = isSellerClean
    ? 'w-full rounded-sm border border-slate-400 bg-white px-4 py-3 text-[15px] font-normal text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900'
    : 'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none'

  const primaryButtonClassName = isSellerClean
    ? 'mt-2 w-full rounded-full bg-[#f5d10b] px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[#e9c300] disabled:cursor-not-allowed disabled:opacity-70'
    : 'mt-2 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70'

  const secondaryButtonClassName = isSellerClean
    ? 'font-medium text-slate-600 underline underline-offset-2 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50'
    : 'font-semibold text-slate-700 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50'

  return (
    <div className='mt-8 grid gap-4'>
      <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${isSellerClean ? 'text-slate-400' : 'text-slate-500'}`}>
        Step {Math.min(step, 5)} of 5
      </p>
      {error ? <p className='text-sm text-rose-500'>{error}</p> : null}
      {message ? <p className='text-sm text-emerald-600'>{message}</p> : null}

      {step === STEPS.EMAIL ? (
        <form className='grid gap-4' onSubmit={handleSendCode}>
          {isSellerClean ? (
            <div className='space-y-3'>
              <h2 className='text-[1.75rem] font-semibold tracking-tight text-slate-950'>
                Sell with an existing account
              </h2>
              <p className='text-base leading-7 text-slate-700'>
                If you already have an OcPrimes account, you can use the same email to activate your seller access.
              </p>
            </div>
          ) : null}

          <label className='space-y-2 text-sm font-semibold text-slate-700'>
            {isSellerClean ? 'Enter mobile number or email' : 'Email address'}
            <input
              type='email'
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={isSellerClean ? 'Enter your email' : 'you@brand.com'}
              autoComplete='email'
              className={inputClassName}
              required
            />
          </label>
          <button
            type='submit'
            disabled={isBusy}
            className={primaryButtonClassName}
          >
            {isBusy ? 'Sending code...' : 'Continue'}
          </button>

          {isSellerClean ? (
            <div className='space-y-5 pt-1'>
              <p className='text-xs leading-5 text-slate-500'>
                By continuing, you agree to OcPrimes&apos; seller terms and
                <span className='mx-1'>our</span>
                <Link href='/privacy-policy' className='font-medium text-slate-700 underline underline-offset-2'>
                  Privacy Notice
                </Link>
                .
              </p>

              <Link
                href='/UserBackend/messages?help_center=1'
                target='_blank'
                rel='noreferrer'
                className='inline-flex items-center gap-2 text-sm font-medium text-slate-700 transition hover:text-slate-950'
              >
                <span>Need help?</span>
                <svg aria-hidden='true' viewBox='0 0 20 20' fill='none' className='h-4 w-4'>
                  <path
                    d='M6.5 8 10 11.5 13.5 8'
                    stroke='currentColor'
                    strokeWidth='1.8'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                </svg>
              </Link>

              <div className='grid gap-4 pt-1'>
                <div className='flex items-center gap-4'>
                  <div className='h-px flex-1 bg-slate-200' />
                  <span className='text-sm text-slate-500'>New to OcPrimes?</span>
                  <div className='h-px flex-1 bg-slate-200' />
                </div>
                <Link
                  href='/signup'
                  className='inline-flex w-full items-center justify-center rounded-full border border-slate-300 px-4 py-3 text-sm font-medium text-slate-900 transition hover:border-slate-900'
                >
                  Create your customer account
                </Link>
              </div>
            </div>
          ) : null}
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
              className={inputClassName}
              required
            />
          </label>
          <button
            type='submit'
            disabled={isBusy}
            className={primaryButtonClassName}
          >
            {isBusy ? 'Verifying...' : 'Verify code'}
          </button>
          <div className='flex flex-wrap items-center justify-between gap-3 text-sm'>
            <button
              type='button'
              onClick={handleResendCode}
              disabled={isBusy || resendCooldown > 0}
              className={secondaryButtonClassName}
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
            </button>
            <button
              type='button'
              onClick={handleChangeEmail}
              disabled={isBusy}
              className={secondaryButtonClassName}
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
              className={inputClassName}
              required
            />
          </label>
          <button
            type='submit'
            disabled={isBusy}
            className={primaryButtonClassName}
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
              className={inputClassName}
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
              className={inputClassName}
              required
            />
          </label>
          <button
            type='submit'
            disabled={isBusy}
            className={primaryButtonClassName}
          >
            {isBusy ? 'Checking brand...' : 'Continue'}
          </button>
        </form>
      ) : null}

      {step === STEPS.SHIPPING ? (
        <form className='grid gap-4' onSubmit={handleSubmitRequest}>
          <div className='space-y-2 text-sm font-semibold text-slate-700'>
            Shipping mode
            <div className='grid gap-2'>
              {ACCEPTED_COUNTRIES.map((country) => (
                <button
                  key={country}
                  type='button'
                  onClick={() => setShippingCountry(country)}
                  className={`w-full border px-4 py-3 text-left text-sm font-medium transition ${
                    shippingCountry === country
                      ? isSellerClean
                        ? 'rounded-sm border-slate-900 bg-slate-900 text-white'
                        : 'rounded-2xl border-slate-900 bg-slate-900 text-white'
                      : isSellerClean
                        ? 'rounded-sm border-slate-300 bg-white text-slate-800 hover:border-slate-900'
                        : 'rounded-2xl border-slate-200 bg-white text-slate-800 hover:border-slate-300'
                  }`}
                  aria-pressed={shippingCountry === country}
                >
                  {country === 'International' ? 'International (Worldwide)' : country}
                </button>
              ))}
            </div>
          </div>
          <button
            type='submit'
            disabled={isBusy}
            className={primaryButtonClassName}
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
        <Link
          href={signInHref}
          className={`${isSellerClean ? 'font-medium underline underline-offset-2' : 'font-semibold'} text-slate-700 hover:text-slate-900`}
        >
          Seller sign in
        </Link>
      </div>
    </div>
  )
}
