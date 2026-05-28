'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ACCEPTED_COUNTRIES } from '@/lib/user/accepted-countries'

const STEPS = {
  EMAIL: 1,
  CODE: 2,
  PHONE: 3,
  PROFILE: 4,
  CATEGORIES: 5,
  SHIPPING: 6,
  COMPLETE: 7,
}

const STEP_META = {
  [STEPS.CODE]:       { title: 'Check your inbox',        sub: null },
  [STEPS.PHONE]:      { title: 'Your phone number',        sub: "Your customers will use this to contact you." },
  [STEPS.PROFILE]:    { title: 'Set up your brand',        sub: 'What should customers call your shop?' },
  [STEPS.CATEGORIES]: { title: 'What do you sell?',        sub: 'Select all categories that apply to your store.' },
  [STEPS.SHIPPING]:   { title: 'Where do you ship from?',  sub: 'Choose your primary shipping region.' },
}

const FASHION_CATS_PRIMARY = [
  { id: 'clothing',    label: 'Clothing'        },
  { id: 'shoes',       label: 'Shoes'           },
  { id: 'bags',        label: 'Bags & Handbags' },
  { id: 'accessories', label: 'Accessories'     },
  { id: 'jewelry',     label: 'Jewelry'         },
  { id: 'dresses',     label: 'Dresses & Skirts'},
  { id: 'menswear',    label: "Men's Wear"      },
  { id: 'activewear',  label: 'Activewear'      },
  { id: 'kids',        label: "Kids' Fashion"   },
  { id: 'lingerie',    label: 'Lingerie'        },
]

const FASHION_CATS_MORE = [
  { id: 'fragrance',   label: 'Fragrances'      },
  { id: 'swimwear',    label: 'Swimwear'        },
  { id: 'outerwear',   label: 'Outerwear'       },
  { id: 'denim',       label: 'Denim'           },
  { id: 'traditional', label: 'Traditional Wear'},
  { id: 'streetwear',  label: 'Streetwear'      },
  { id: 'vintage',     label: 'Vintage & Thrift'},
  { id: 'eyewear',     label: 'Eyewear'         },
  { id: 'watches',     label: 'Watches'         },
  { id: 'hats',        label: 'Hats & Caps'     },
]

// ── Segmented 4-box OTP input ──────────────────────────────────────────────
function OtpBoxes({ value, onChange }) {
  const refs = useRef([])

  const OTP_LEN = 6

  const handleChange = (i, raw) => {
    const digit = raw.replace(/\D/g, '').slice(-1)
    const arr = (value + '    ').slice(0, OTP_LEN).split('')
    arr[i] = digit
    const next = arr.join('').trimEnd()
    onChange(next)
    if (digit && i < OTP_LEN - 1) refs.current[i + 1]?.focus()
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace') {
      if (!value[i] && i > 0) {
        const arr = (value + '    ').slice(0, OTP_LEN).split('')
        arr[i - 1] = ''
        onChange(arr.join('').trimEnd())
        refs.current[i - 1]?.focus()
      }
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LEN)
    onChange(pasted)
    const focusIdx = Math.min(pasted.length, OTP_LEN - 1)
    refs.current[focusIdx]?.focus()
  }

  return (
    <div className="flex justify-center gap-3">
      {Array.from({ length: OTP_LEN }, (_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className="h-14 w-14 rounded-xl border-2 border-slate-200 bg-white text-center text-2xl font-bold text-slate-900 outline-none transition focus:border-slate-900"
          autoFocus={i === 0}
        />
      ))}
    </div>
  )
}

// ── Loading dots animation ────────────────────────────────────────────────
function Dots() {
  return (
    <span className="inline-flex items-center justify-center gap-1">
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" />
    </span>
  )
}

// ── Progress dots ─────────────────────────────────────────────────────────
function StepProgress({ step }) {
  const steps = [STEPS.CODE, STEPS.PHONE, STEPS.PROFILE, STEPS.CATEGORIES, STEPS.SHIPPING]
  return (
    <div className="mb-7 mt-6 flex items-center justify-center gap-1.5">
      {steps.map((s) => (
        <div
          key={s}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            step >= s ? 'w-7 bg-slate-900' : 'w-1.5 bg-slate-200'
          }`}
        />
      ))}
    </div>
  )
}

export default function VendorSignupForm({
  signInHref = '/vendor/login',
  variant = 'default',
  onBackChange = null,
}) {
  const isSellerClean = variant === 'seller-clean'
  const [step, setStep] = useState(STEPS.EMAIL)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [phone, setPhone] = useState('')
  const [fullName, setFullName] = useState('')
  const [brandName, setBrandName] = useState('')
  const [shippingCountry, setShippingCountry] = useState(String(ACCEPTED_COUNTRIES[0] || 'Nigeria'))
  const [selectedCategories, setSelectedCategories] = useState([])
  const [showMoreCats, setShowMoreCats] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const SESSION_KEY = 'alxora_seller_signup'
  const SESSION_TTL = 60 * 60 * 1000 // 1 hour in ms

  // Restore session on mount — discard if older than 1 hour
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY)
      if (!saved) return
      const { step: s, email: e, savedAt } = JSON.parse(saved)
      if (!savedAt || Date.now() - savedAt > SESSION_TTL) {
        localStorage.removeItem(SESSION_KEY)
        return
      }
      if (s > STEPS.EMAIL && s < STEPS.COMPLETE && e) {
        setStep(s)
        setEmail(e)
      }
    } catch {}
  }, [])

  // Persist step + email with timestamp while mid-flow
  useEffect(() => {
    try {
      if (step > STEPS.EMAIL && step < STEPS.COMPLETE) {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ step, email, savedAt: Date.now() }))
      } else {
        localStorage.removeItem(SESSION_KEY)
      }
    } catch {}
  }, [step, email])

  const post = async (url, payload) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) throw new Error(data?.error || 'Request failed.')
    return data
  }

  const handleSendCode = async (event) => {
    event.preventDefault()
    if (isBusy) return
    setIsBusy(true)
    setError('')
    try {
      const data = await post('/api/auth/vendor-onboarding/email', { email })
      if (data?.alreadySeller) {
        setMessage('You already have a seller account.')
        setStep(STEPS.COMPLETE)
        return
      }
      setMessage('A verification code has been sent to your email.')
      setStep(STEPS.CODE)
    } catch (err) {
      setError(err?.message || 'Unable to send verification code.')
    } finally {
      setIsBusy(false)
    }
  }

  const verifyCode = useCallback(async () => {
    if (isBusy) return
    setIsBusy(true)
    setError('')
    try {
      const data = await post('/api/auth/vendor-onboarding/verify', { email, code })
      if (data?.alreadyVendor) {
        setStep(STEPS.COMPLETE)
        setMessage('You already have a seller account.')
        return
      }
      setMessage('Email verified.')
      setStep(STEPS.PHONE)
    } catch (err) {
      setError(err?.message || 'Unable to verify code.')
    } finally {
      setIsBusy(false)
    }
  }, [isBusy, email, code])

  const handleVerifyCode = (e) => { e.preventDefault(); verifyCode() }

  // Auto-verify the moment a complete 4-digit code is entered or pasted
  useEffect(() => {
    if (step === STEPS.CODE && code.length === 6) verifyCode()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  const handleResendCode = async () => {
    if (isBusy || resendCooldown > 0) return
    setIsBusy(true)
    setError('')
    setMessage('')
    try {
      await post('/api/auth/vendor-onboarding/email', { email })
      setMessage('A new code has been sent.')
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
    if (!phone.trim()) { setError('Phone number is required.'); return }
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
      if (!data?.available) { setError('Brand name already taken. Please choose another.'); return }
      setMessage('Brand name is available.')
      setStep(STEPS.CATEGORIES)
    } catch (err) {
      setError(err?.message || 'Unable to validate brand name.')
    } finally {
      setIsBusy(false)
    }
  }

  const toggleCategory = (id) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  const handleCategoriesContinue = (e) => {
    e.preventDefault()
    if (selectedCategories.length === 0) {
      setError('Pick at least one category to continue.')
      return
    }
    setError('')
    setMessage('')
    setStep(STEPS.SHIPPING)
  }

  const handleSubmitRequest = async (event) => {
    event.preventDefault()
    if (isBusy) return
    setIsBusy(true)
    setError('')
    try {
      await post('/api/auth/vendor-onboarding/submit', { phone, fullName, brandName, shippingCountry, categories: selectedCategories })
      setMessage('Your seller account is now active.')
      setStep(STEPS.COMPLETE)
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.')
    } finally {
      setIsBusy(false)
    }
  }

  useEffect(() => {
    if (resendCooldown <= 0) return undefined
    const timer = setInterval(() => setResendCooldown((p) => (p <= 1 ? 0 : p - 1)), 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  // Register step-aware back function with parent shell
  useEffect(() => {
    if (!onBackChange) return
    const clear = () => { setError(''); setMessage('') }
    const backMap = {
      [STEPS.EMAIL]:      null,
      [STEPS.CODE]:       () => { clear(); setCode(''); setStep(STEPS.EMAIL) },
      [STEPS.PHONE]:      () => { clear(); setStep(STEPS.CODE) },
      [STEPS.PROFILE]:    () => { clear(); setStep(STEPS.PHONE) },
      [STEPS.CATEGORIES]: () => { clear(); setStep(STEPS.PROFILE) },
      [STEPS.SHIPPING]:   () => { clear(); setStep(STEPS.CATEGORIES) },
      [STEPS.COMPLETE]:   null,
    }
    // useState setters are stable so wrapping in a new fn avoids stale-closure issues
    const fn = backMap[step] ?? null
    onBackChange(fn ? () => fn : null)
  }, [step, onBackChange])

  const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-0'
  const primaryBtnCls = 'w-full rounded-full bg-[#f5d10b] px-4 py-3.5 text-[15px] font-semibold text-slate-950 transition hover:bg-[#e9c300] disabled:cursor-not-allowed disabled:opacity-60'
  const ghostBtnCls = 'text-sm font-medium text-slate-500 underline underline-offset-2 transition hover:text-slate-900 disabled:opacity-50'

  const meta = STEP_META[step]

  return (
    <div className="space-y-5">

      {/* Progress bar (steps 2–5) */}
      {step > STEPS.EMAIL && step < STEPS.COMPLETE && (
        <StepProgress step={step} />
      )}

      {/* Step heading */}
      {meta && (
        <div className="mb-2 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{meta.title}</h2>
          {meta.sub && <p className="mt-1.5 text-sm text-slate-500">{meta.sub}</p>}
        </div>
      )}

      {/* Feedback */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}
      {message && !error && step !== STEPS.CODE && step !== STEPS.COMPLETE && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
          </svg>
          {message}
        </div>
      )}

      {/* ── STEP 1: Email ─────────────────────────────────── */}
      {step === STEPS.EMAIL && (
        <form className="space-y-5" onSubmit={handleSendCode}>
          {isSellerClean && (
            <div className="mb-2 space-y-2">
              <h2 className="text-[1.85rem] font-semibold tracking-tight text-slate-950 leading-tight">
                Sign in to start selling
              </h2>
              <p className="text-[15px] leading-relaxed text-slate-500">
                Use your existing Alxora account to unlock seller access.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              {isSellerClean ? 'Email address' : 'Email address'}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@brand.com"
              autoComplete="email"
              className={inputCls}
              required
            />
          </div>

          <button type="submit" disabled={isBusy} className={primaryBtnCls}>
            {isBusy ? <Dots /> : 'Continue'}
          </button>

          {isSellerClean && (
            <div className="space-y-5 pt-1">
              <p className="text-xs leading-5 text-slate-400">
                By continuing, you agree to Alxora&apos;s seller terms and{' '}
                <Link href="/privacy-policy" className="font-medium text-slate-600 underline underline-offset-2">
                  Privacy Notice
                </Link>.
              </p>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-100" />
                <span className="text-xs text-slate-400">New to Alxora?</span>
                <div className="h-px flex-1 bg-slate-100" />
              </div>

              <Link
                href="/signup"
                className="flex w-full items-center justify-center rounded-full border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
              >
                Create an Alxora account
              </Link>

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Already have a seller account?</span>
                <Link href={signInHref} className="font-medium text-slate-700 underline underline-offset-2 hover:text-slate-900">
                  Sign in
                </Link>
              </div>
            </div>
          )}
        </form>
      )}

      {/* ── STEP 2: OTP ──────────────────────────────────── */}
      {step === STEPS.CODE && (
        <form className="space-y-6" onSubmit={handleVerifyCode}>
          <p className="text-center text-sm text-slate-500">
            Sent to <span className="font-medium text-slate-700">{email}</span>
          </p>

          <OtpBoxes value={code} onChange={setCode} />

          <button
            type="submit"
            disabled={isBusy || code.length < 6}
            className={primaryBtnCls}
          >
            {isBusy ? <Dots /> : 'Verify code'}
          </button>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleResendCode}
              disabled={isBusy || resendCooldown > 0}
              className={ghostBtnCls}
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
            </button>
            <button
              type="button"
              onClick={handleChangeEmail}
              disabled={isBusy}
              className={ghostBtnCls}
            >
              Change email
            </button>
          </div>
        </form>
      )}

      {/* ── STEP 3: Phone ────────────────────────────────── */}
      {step === STEPS.PHONE && (
        <form className="space-y-5" onSubmit={handlePhoneContinue}>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Phone number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+234 800 000 0000"
              className={inputCls}
              required
            />
          </div>
          <button type="submit" disabled={isBusy} className={primaryBtnCls}>
            Continue
          </button>
        </form>
      )}

      {/* ── STEP 4: Profile ──────────────────────────────── */}
      {step === STEPS.PROFILE && (
        <form className="space-y-5" onSubmit={handleProfileContinue}>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              autoComplete="name"
              className={inputCls}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Brand or shop name</label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="e.g. Maison Verte"
              autoComplete="organization"
              className={inputCls}
              required
            />
          </div>
          <button type="submit" disabled={isBusy} className={primaryBtnCls}>
            {isBusy ? 'Checking availability…' : 'Continue'}
          </button>
        </form>
      )}

      {/* ── STEP 5: Categories ───────────────────────────── */}
      {step === STEPS.CATEGORIES && (
        <form className="space-y-5" onSubmit={handleCategoriesContinue}>
          <div className="grid grid-cols-2 gap-2">
            {FASHION_CATS_PRIMARY.map((cat) => {
              const active = selectedCategories.includes(cat.id)
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className={`rounded-xl border px-3.5 py-2.5 text-center text-sm font-medium transition-all ${
                    active
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                  }`}
                >
                  {cat.label}
                </button>
              )
            })}

            {showMoreCats && FASHION_CATS_MORE.map((cat) => {
              const active = selectedCategories.includes(cat.id)
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className={`rounded-xl border px-3.5 py-2.5 text-center text-sm font-medium transition-all ${
                    active
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                  }`}
                >
                  {cat.label}
                </button>
              )
            })}
          </div>

          {!showMoreCats && (
            <button
              type="button"
              onClick={() => setShowMoreCats(true)}
              className="mx-auto flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Show 10 more categories
            </button>
          )}

          <button type="submit" className={primaryBtnCls}>
            {selectedCategories.length > 0
              ? `Continue with ${selectedCategories.length} selected`
              : 'Continue'}
          </button>
        </form>
      )}

      {/* ── STEP 6: Shipping ─────────────────────────────── */}
      {step === STEPS.SHIPPING && (
        <form className="space-y-5" onSubmit={handleSubmitRequest}>
          <div className="space-y-2">
            {ACCEPTED_COUNTRIES.map((country) => (
              <button
                key={country}
                type="button"
                onClick={() => setShippingCountry(country)}
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-[15px] font-medium transition ${
                  shippingCountry === country
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                }`}
                aria-pressed={shippingCountry === country}
              >
                <span>{country === 'International' ? 'International (Worldwide)' : country}</span>
                {shippingCountry === country && (
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 0 1 0 1.414l-8 8a1 1 0 0 1-1.414 0l-4-4a1 1 0 0 1 1.414-1.414L8 12.586l7.293-7.293a1 1 0 0 1 1.414 0Z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
          <button type="submit" disabled={isBusy} className={primaryBtnCls}>
            {isBusy ? 'Activating…' : 'Activate seller account'}
          </button>
        </form>
      )}

      {/* ── STEP 6: Complete ─────────────────────────────── */}
      {step === STEPS.COMPLETE && (
        message === 'You already have a seller account.' ? (
          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
              <svg className="h-8 w-8 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Account already exists</h3>
              <p className="mt-2 text-sm text-slate-500">
                This email is already linked to a seller account. Sign in to access your dashboard.
              </p>
            </div>
            <Link
              href={signInHref}
              className={primaryBtnCls + ' inline-flex items-center justify-center'}
            >
              Sign in to your seller account
            </Link>
          </div>
        ) : (
          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
              <svg className="h-8 w-8 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-900">You&apos;re all set!</h3>
              <p className="mt-2 text-sm text-slate-500">
                Your seller account is now active. Sign in to access your dashboard.
              </p>
            </div>
            <Link
              href={signInHref}
              className={primaryBtnCls + ' inline-flex items-center justify-center'}
            >
              Go to seller dashboard →
            </Link>
          </div>
        )
      )}
    </div>
  )
}
