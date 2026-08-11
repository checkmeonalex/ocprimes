'use client'

import { useEffect, useMemo, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useAuthUser } from '@/lib/auth/useAuthUser'
import { matchSizeGuide } from '@/lib/size-prediction/match'

// Reads the customer's saved Fit Profile and, if it matches this product's
// size guide, surfaces a one-line recommendation under the size selector —
// e.g. "Recommended: M · 92% match to your Fit Profile." No layout is
// reserved when there's nothing to show, so it never shifts the page for
// guests or profile-less customers.
export default function FitRecommendationBadge({ guide, selectedSize, onApply }) {
  const { user } = useAuthUser()
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    if (!user?.id) return
    let isActive = true
    fetch('/api/user/body-profile', {
      credentials: 'include',
      headers: { 'x-no-global-error-alert': '1' },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (isActive) setProfile(payload?.item || null)
      })
      .catch(() => {})
    return () => {
      isActive = false
    }
  }, [user?.id])

  const match = useMemo(() => {
    if (!profile || !guide) return null
    const estimate = {
      bustCm: profile.bust_cm ?? profile.estimated_bust_cm ?? undefined,
      waistCm: profile.waist_cm ?? profile.estimated_waist_cm ?? undefined,
      hipCm: profile.hip_cm ?? profile.estimated_hip_cm ?? undefined,
    }
    const result = matchSizeGuide(guide.columns || [], guide.rows || [], estimate)
    return result.best
  }, [profile, guide])

  if (!match) return null

  const alreadySelected = selectedSize && String(selectedSize).trim().toLowerCase() === match.size.trim().toLowerCase()

  return (
    <div className='mt-2 flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1.5 text-[11px] text-emerald-800'>
      <Sparkles size={12} className='shrink-0 text-emerald-600' />
      <span>
        Recommended for you: <span className='font-semibold'>{match.size}</span>
        <span className='text-emerald-600'> · {match.confidencePct}% match to your Fit Profile</span>
      </span>
      {!alreadySelected && onApply && (
        <button
          type='button'
          onClick={() => onApply(match.size)}
          className='ml-auto shrink-0 font-semibold underline underline-offset-2 hover:text-emerald-900'
        >
          Apply
        </button>
      )}
    </div>
  )
}
