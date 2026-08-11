'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Pencil, X } from 'lucide-react'
import { useAuthUser } from '@/lib/auth/useAuthUser'
import { estimateMeasurements, applyMeasurementOverrides } from '@/lib/size-prediction/estimate'
import { matchSizeGuide, buildFitNote } from '@/lib/size-prediction/match'

const LOCAL_STORAGE_KEY = 'ocp:find-my-size:v2'

const BODY_SHAPES = [
  { key: 'hourglass', label: 'Hourglass' },
  { key: 'pear', label: 'Pear' },
  { key: 'apple', label: 'Apple' },
  { key: 'rectangle', label: 'Rectangle' },
  { key: 'inverted_triangle', label: 'Inverted Triangle' },
]

const FIT_PREFERENCES = [
  { key: 'fitted', label: 'Fitted' },
  { key: 'regular', label: 'Regular' },
  { key: 'relaxed', label: 'Relaxed' },
]

const AGE_RANGES = ['Under 18', '18-24', '25-34', '35-44', '45-54', '55+']

const emptyDetail = {
  age_range: '',
  body_shape: '',
  bust_cm: '',
  waist_cm: '',
  hip_cm: '',
  usual_size: '',
  fit_preference: '',
}

const readLocalProfile = () => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const writeLocalProfile = (profile) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(profile))
  } catch {
    // ignore quota/storage errors — local persistence is a nice-to-have
  }
}

const Stepper = ({ label, value, unit, min, max, step = 1, onChange }) => (
  <div>
    <div className='mb-2 flex items-baseline justify-between'>
      <span className='text-xs font-semibold uppercase tracking-wide text-stone-500'>{label}</span>
      <span className='text-lg font-semibold text-stone-900'>
        {value}
        <span className='ml-1 text-sm font-normal text-stone-400'>{unit}</span>
      </span>
    </div>
    <div className='flex items-center gap-3'>
      <button
        type='button'
        onClick={() => onChange(Math.max(min, value - step))}
        className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-stone-300 text-stone-600 hover:border-stone-500'
      >
        −
      </button>
      <input
        type='range'
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className='h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-stone-200 accent-stone-900'
      />
      <button
        type='button'
        onClick={() => onChange(Math.min(max, value + step))}
        className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-stone-300 text-stone-600 hover:border-stone-500'
      >
        +
      </button>
    </div>
  </div>
)

const MeasurementCheckRow = ({ check }) => (
  <div className='flex items-center gap-2 text-sm'>
    {check.inRange ? (
      <Check size={14} strokeWidth={3} className='text-emerald-600' />
    ) : (
      <X size={14} strokeWidth={3} className='text-amber-500' />
    )}
    <span className='capitalize text-stone-700'>{check.field}</span>
    <span className='text-stone-300'>—</span>
    <span className={check.inRange ? 'text-emerald-700' : 'text-amber-600'}>
      {check.inRange ? 'good fit' : check.direction === 'tight' ? 'runs tight' : 'runs loose'}
    </span>
  </div>
)

export default function FindMySizeWizard({ guide, onSizeSelect }) {
  const { user } = useAuthUser()
  const [step, setStep] = useState('quick') // 'quick' | 'result'
  const [showDetailed, setShowDetailed] = useState(false)
  const [gender, setGender] = useState('female')
  const [height, setHeight] = useState(165)
  const [weight, setWeight] = useState(60)
  const [detail, setDetail] = useState(emptyDetail)
  const [isSaving, setIsSaving] = useState(false)
  const [hasLoadedRemote, setHasLoadedRemote] = useState(false)

  useEffect(() => {
    const local = readLocalProfile()
    if (local) {
      if (local.gender) setGender(local.gender)
      if (local.height) setHeight(local.height)
      if (local.weight) setWeight(local.weight)
      if (local.detail) setDetail({ ...emptyDetail, ...local.detail })
    }
  }, [])

  useEffect(() => {
    if (!user?.id || hasLoadedRemote) return
    let isActive = true
    fetch('/api/user/body-profile', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (!isActive) return
        const item = payload?.item
        if (item) {
          setGender(item.gender)
          setHeight(Number(item.height_cm))
          setWeight(Number(item.weight_kg))
          setDetail({
            age_range: item.age_range || '',
            body_shape: item.body_shape || '',
            bust_cm: item.bust_cm ?? '',
            waist_cm: item.waist_cm ?? '',
            hip_cm: item.hip_cm ?? '',
            usual_size: item.usual_size || '',
            fit_preference: item.fit_preference || '',
          })
          setStep('result')
        }
        setHasLoadedRemote(true)
      })
      .catch(() => {
        if (isActive) setHasLoadedRemote(true)
      })
    return () => {
      isActive = false
    }
  }, [user?.id, hasLoadedRemote])

  const estimate = useMemo(() => {
    const base = estimateMeasurements(height, weight, gender)
    return applyMeasurementOverrides(base, {
      bustCm: detail.bust_cm ? Number(detail.bust_cm) : null,
      waistCm: detail.waist_cm ? Number(detail.waist_cm) : null,
      hipCm: detail.hip_cm ? Number(detail.hip_cm) : null,
    })
  }, [height, weight, gender, detail.bust_cm, detail.waist_cm, detail.hip_cm])

  const matchResult = useMemo(
    () => matchSizeGuide(guide?.columns || [], guide?.rows || [], estimate),
    [guide?.columns, guide?.rows, estimate],
  )

  const handleSubmit = async () => {
    writeLocalProfile({ gender, height, weight, detail })
    setStep('result')

    if (user?.id) {
      setIsSaving(true)
      try {
        await fetch('/api/user/body-profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            gender,
            height_cm: height,
            weight_kg: weight,
            age_range: detail.age_range || undefined,
            body_shape: detail.body_shape || undefined,
            bust_cm: detail.bust_cm ? Number(detail.bust_cm) : undefined,
            waist_cm: detail.waist_cm ? Number(detail.waist_cm) : undefined,
            hip_cm: detail.hip_cm ? Number(detail.hip_cm) : undefined,
            usual_size: detail.usual_size || undefined,
            fit_preference: detail.fit_preference || undefined,
          }),
        })
      } catch {
        // best-effort — the local copy already has it, no need to block the UI
      } finally {
        setIsSaving(false)
      }
    }
  }

  if (step === 'result') {
    const { best, alternatives } = matchResult

    if (!best) {
      return (
        <div className='py-6 text-center'>
          <p className='text-sm text-stone-500'>
            We couldn&apos;t match your measurements to this size chart. Try the Size Chart tab instead.
          </p>
          <button
            type='button'
            onClick={() => setStep('quick')}
            className='mt-4 text-xs font-semibold uppercase tracking-wide text-stone-600 underline underline-offset-2'
          >
            Edit measurements
          </button>
        </div>
      )
    }

    const hasDetail = Boolean(detail.body_shape || detail.bust_cm || detail.waist_cm || detail.hip_cm || detail.fit_preference)

    return (
      <div>
        <div className='mb-5 text-center'>
          <h3 className='text-lg font-semibold text-stone-900'>We found your best fit</h3>
          <p className='mt-1 text-xs text-stone-400'>
            {hasDetail ? 'Based on your detailed fit profile' : `Estimated from height ${height}cm, weight ${weight}kg`}
            {isSaving ? ' · saving…' : ''}
          </p>
        </div>

        <div className='mb-5 space-y-2 rounded-lg bg-stone-50 p-4'>
          <div className='mb-1 flex items-center justify-between'>
            <span className='text-sm font-semibold text-stone-900'>Confidence</span>
            <span className='text-sm font-semibold text-stone-900'>{best.confidencePct}%</span>
          </div>
          {best.checks.map((check) => (
            <MeasurementCheckRow key={check.field} check={check} />
          ))}
        </div>

        <button
          type='button'
          onClick={() => setStep('quick')}
          className='mb-6 flex items-center gap-1.5 text-xs font-medium text-stone-500 underline underline-offset-2 hover:text-stone-800'
        >
          <Pencil size={12} />
          Any doubts about the measurements? Edit
        </button>

        <div className='flex items-start gap-6'>
          <div>
            <p className='mb-2 text-[11px] font-semibold uppercase tracking-widest text-stone-400'>Best option</p>
            <button
              type='button'
              onClick={() => onSizeSelect?.(best.size)}
              className='relative flex h-20 w-20 items-center justify-center rounded-lg border-2 border-stone-900 text-xl font-semibold text-stone-900'
            >
              {best.size}
              <span className='absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white'>
                <Check size={12} strokeWidth={3} />
              </span>
            </button>
          </div>

          {alternatives.length > 0 && (
            <div className='flex-1'>
              <p className='mb-2 text-[11px] font-semibold uppercase tracking-widest text-stone-400'>Also try</p>
              <div className='flex flex-wrap gap-2'>
                {alternatives.map((alt) => (
                  <button
                    key={alt.size}
                    type='button'
                    onClick={() => onSizeSelect?.(alt.size)}
                    className='flex h-9 min-w-[40px] items-center justify-center rounded-md border border-stone-300 px-2 text-sm text-stone-700 hover:border-stone-500'
                  >
                    {alt.size}
                  </button>
                ))}
              </div>
              {alternatives
                .map((alt) => buildFitNote(alt))
                .filter(Boolean)
                .slice(0, 1)
                .map((note) => (
                  <p key={note} className='mt-2 text-[11px] text-stone-400'>
                    {note}
                  </p>
                ))}
            </div>
          )}
        </div>

        {onSizeSelect && (
          <button
            type='button'
            onClick={() => onSizeSelect(best.size)}
            className='mt-6 w-full rounded-lg bg-stone-900 py-3 text-sm font-semibold uppercase tracking-wide text-white hover:bg-stone-800'
          >
            Use size {best.size}
          </button>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className='mb-6 text-center'>
        <h3 className='text-lg font-semibold text-stone-900'>Let us find your best fit</h3>
        <p className='mt-1 text-xs text-stone-400'>Takes 10 seconds — we&apos;ll estimate your fit from this.</p>
      </div>

      <div className='mb-6'>
        <p className='mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500'>Gender</p>
        <div className='flex gap-2'>
          {[
            { key: 'female', label: 'Female' },
            { key: 'male', label: 'Male' },
          ].map((option) => (
            <button
              key={option.key}
              type='button'
              onClick={() => setGender(option.key)}
              className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition ${
                gender === option.key
                  ? 'border-stone-900 bg-stone-900 text-white'
                  : 'border-stone-300 text-stone-600 hover:border-stone-500'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className='space-y-6'>
        <Stepper label='Height' value={height} unit='cm' min={130} max={210} onChange={setHeight} />
        <Stepper label='Weight' value={weight} unit='kg' min={30} max={150} onChange={setWeight} />
      </div>

      {!showDetailed ? (
        <button
          type='button'
          onClick={() => setShowDetailed(true)}
          className='mt-6 w-full rounded-lg border border-dashed border-stone-300 py-2.5 text-xs font-semibold uppercase tracking-wide text-stone-500 hover:border-stone-400 hover:text-stone-700'
        >
          Want a more accurate recommendation?
        </button>
      ) : (
        <div className='mt-6 space-y-5 border-t border-stone-100 pt-5'>
          <p className='text-xs font-semibold uppercase tracking-wide text-stone-500'>Detailed fit (optional)</p>

          <div>
            <p className='mb-2 text-xs font-medium text-stone-500'>Age range</p>
            <div className='flex flex-wrap gap-2'>
              {AGE_RANGES.map((range) => (
                <button
                  key={range}
                  type='button'
                  onClick={() => setDetail((prev) => ({ ...prev, age_range: prev.age_range === range ? '' : range }))}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    detail.age_range === range
                      ? 'border-stone-900 bg-stone-900 text-white'
                      : 'border-stone-300 text-stone-600 hover:border-stone-500'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className='mb-2 text-xs font-medium text-stone-500'>Body shape</p>
            <div className='flex flex-wrap gap-2'>
              {BODY_SHAPES.map((shape) => (
                <button
                  key={shape.key}
                  type='button'
                  onClick={() =>
                    setDetail((prev) => ({ ...prev, body_shape: prev.body_shape === shape.key ? '' : shape.key }))
                  }
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    detail.body_shape === shape.key
                      ? 'border-stone-900 bg-stone-900 text-white'
                      : 'border-stone-300 text-stone-600 hover:border-stone-500'
                  }`}
                >
                  {shape.label}
                </button>
              ))}
            </div>
          </div>

          <div className='grid grid-cols-3 gap-3'>
            {[
              { key: 'bust_cm', label: 'Bust (cm)' },
              { key: 'waist_cm', label: 'Waist (cm)' },
              { key: 'hip_cm', label: 'Hip (cm)' },
            ].map((field) => (
              <div key={field.key}>
                <label className='mb-1 block text-[11px] font-medium text-stone-500'>{field.label}</label>
                <input
                  type='number'
                  inputMode='decimal'
                  value={detail[field.key]}
                  onChange={(event) => setDetail((prev) => ({ ...prev, [field.key]: event.target.value }))}
                  placeholder='—'
                  className='w-full rounded-lg border border-stone-300 px-2.5 py-2 text-sm text-stone-900'
                />
              </div>
            ))}
          </div>

          <div>
            <label className='mb-1 block text-xs font-medium text-stone-500'>Usual size</label>
            <input
              type='text'
              value={detail.usual_size}
              onChange={(event) => setDetail((prev) => ({ ...prev, usual_size: event.target.value }))}
              placeholder='e.g. M, or UK 10'
              className='w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900'
            />
          </div>

          <div>
            <p className='mb-2 text-xs font-medium text-stone-500'>Fit preference</p>
            <div className='flex gap-2'>
              {FIT_PREFERENCES.map((pref) => (
                <button
                  key={pref.key}
                  type='button'
                  onClick={() =>
                    setDetail((prev) => ({ ...prev, fit_preference: prev.fit_preference === pref.key ? '' : pref.key }))
                  }
                  className={`flex-1 rounded-lg border py-2 text-xs font-medium transition ${
                    detail.fit_preference === pref.key
                      ? 'border-stone-900 bg-stone-900 text-white'
                      : 'border-stone-300 text-stone-600 hover:border-stone-500'
                  }`}
                >
                  {pref.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <button
        type='button'
        onClick={handleSubmit}
        className='mt-8 w-full rounded-lg bg-stone-900 py-3 text-sm font-semibold uppercase tracking-wide text-white hover:bg-stone-800'
      >
        Find my fit
      </button>

      {!user?.id && (
        <p className='mt-3 text-center text-[11px] text-stone-400'>
          Sign in to save your fit profile across products and devices.
        </p>
      )}
    </div>
  )
}
