'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createPortal } from 'react-dom'
import { useAuthUser } from '@/lib/auth/useAuthUser'

const buildNextPath = (pathname, searchParams) => {
  const base = String(pathname || '').trim() || '/'
  const search = searchParams?.toString?.() || ''
  return search ? `${base}?${search}` : base
}

export default function EmptyCategoryModal({
  isOpen,
  category = null,
  onClose,
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user, isLoading: isAuthLoading } = useAuthUser()
  const [isMounted, setIsMounted] = useState(false)
  const [notifyState, setNotifyState] = useState('idle')
  const [notifyError, setNotifyError] = useState('')

  const cleanCategoryId = useMemo(() => String(category?.id || '').trim(), [category?.id])
  const cleanCategorySlug = useMemo(() => String(category?.slug || '').trim(), [category?.slug])
  const cleanCategoryImageUrl = useMemo(
    () => String(category?.imageUrl || '').trim(),
    [category?.imageUrl],
  )
  const cleanCategoryImageAlt = useMemo(
    () => String(category?.imageAlt || category?.name || '').trim() || 'Category image',
    [category?.imageAlt, category?.name],
  )

  const cleanCategoryName = useMemo(
    () => String(category?.name || '').trim() || 'this category',
    [category?.name],
  )

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isOpen) return undefined

    const originalOverflow = document.body.style.overflow
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) {
      setNotifyState('idle')
      setNotifyError('')
      return
    }

    setNotifyState('idle')
    setNotifyError('')
  }, [cleanCategoryId, isOpen])

  useEffect(() => {
    if (!isOpen) return
    if (!isAuthLoading && !user && notifyState === 'checking-auth') {
      setNotifyState('guest')
      setNotifyError('Sign in to get notified when this category is available.')
    }
  }, [isAuthLoading, isOpen, notifyState, user])

  if (!isMounted || !isOpen) return null

  const handleNotifyClick = async () => {
    if (isAuthLoading) {
      setNotifyState('checking-auth')
      setNotifyError('')
      return
    }

    if (!user) {
      setNotifyState('guest')
      setNotifyError('Sign in to get notified when this category is available.')
      return
    }

    if (!cleanCategoryId || notifyState === 'submitting' || notifyState === 'success') {
      return
    }

    setNotifyState('submitting')
    setNotifyError('')

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'notify_category_interest',
          categoryId: cleanCategoryId,
          categoryName: cleanCategoryName,
          categorySlug: cleanCategorySlug || null,
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to save this notification request.')
      }

      setNotifyState('success')
    } catch (error) {
      setNotifyState('idle')
      setNotifyError(error?.message || 'Unable to save this notification request.')
    }
  }

  const handleSigninClick = () => {
    const next = encodeURIComponent(buildNextPath(pathname, searchParams))
    router.push(`/signup?next=${next}`)
  }

  const handleSellerClick = () => {
    router.push('/sellersignup')
    onClose?.()
  }

  const modalContent = (
    <div
      className='fixed inset-0 z-[2147483600] flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-[2px]'
      onClick={onClose}
    >
      <section
        role='dialog'
        aria-modal='true'
        aria-labelledby='empty-category-modal-title'
        aria-describedby='empty-category-modal-description'
        className='w-full max-w-md overflow-hidden rounded-[28px] border border-[#d7cfc2] bg-[linear-gradient(180deg,#fffdfa_0%,#f8f3e7_100%)] shadow-[0_28px_90px_rgba(15,23,42,0.22)]'
        onClick={(event) => event.stopPropagation()}
      >
        <div className='relative overflow-hidden px-6 pb-5 pt-6'>
          <div className='pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(225,208,131,0.42),transparent_72%)]' />

          <button
            type='button'
            onClick={onClose}
            className='absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#dfd6c4] bg-white/90 text-slate-500 transition hover:text-slate-800'
            aria-label='Close availability dialog'
          >
            ✕
          </button>

          <div className='relative mx-auto mb-4 flex h-32 w-32 items-center justify-center'>
            <div className='absolute inset-x-4 bottom-5 h-16 rounded-[18px] border border-[#b9922b] bg-[linear-gradient(180deg,#f0d783_0%,#b6841e_100%)] shadow-[0_16px_28px_rgba(150,109,16,0.24)]' />
            <div className='absolute inset-x-7 bottom-10 h-10 rounded-[14px] border border-[#f6e8b4]/70 bg-[linear-gradient(180deg,rgba(255,248,225,0.7)_0%,rgba(255,255,255,0.08)_100%)]' />
            <div className='empty-category-item absolute left-9 top-3 h-9 w-9 rounded-xl bg-[linear-gradient(135deg,#f6e6aa_0%,#c59526_100%)] shadow-[0_10px_18px_rgba(150,109,16,0.18)]' />
            <div className='empty-category-item empty-category-item--delay-1 absolute left-[3.35rem] top-0 h-8 w-8 rounded-full bg-[linear-gradient(135deg,#fff3c8_0%,#cf9f32_100%)] shadow-[0_10px_18px_rgba(150,109,16,0.2)]' />
            <div className='empty-category-item empty-category-item--delay-2 absolute right-9 top-4 h-10 w-10 rounded-[16px] bg-[linear-gradient(135deg,#e2d7c4_0%,#b78f39_100%)] shadow-[0_10px_18px_rgba(150,109,16,0.18)]' />
            <div className='empty-category-spark absolute right-8 top-8 h-2.5 w-2.5 rounded-full bg-[#fff3c8]' />
            <div className='empty-category-spark empty-category-spark--delay absolute left-8 top-11 h-2 w-2 rounded-full bg-[#ead08d]' />
          </div>

          <div className='text-center'>
            <p className='mb-2 text-[11px] font-semibold uppercase tracking-[0.34em] text-[#9a7a2d]'>
              New arrivals loading
            </p>
            <h2 id='empty-category-modal-title' className='mx-auto max-w-[15ch] text-[1.45rem] font-semibold tracking-tight text-slate-950 sm:text-[1.6rem]'>
              Getting {cleanCategoryName} ready
            </h2>
            <div className='mt-4 flex flex-col items-center'>
              <div className='relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-[#ead9a1] bg-[linear-gradient(180deg,#fff7de_0%,#efe1b4_100%)] p-1.5 shadow-[0_14px_26px_rgba(150,109,16,0.16)]'>
                {cleanCategoryImageUrl ? (
                  <img
                    src={cleanCategoryImageUrl}
                    alt={cleanCategoryImageAlt}
                    className='h-full w-full rounded-full object-cover'
                  />
                ) : (
                  <div className='flex h-full w-full items-center justify-center rounded-full bg-white text-[11px] font-semibold text-slate-400'>
                    Image
                  </div>
                )}
              </div>
              <p className='mt-2 text-sm font-semibold text-slate-700'>{cleanCategoryName}</p>
            </div>
            <p id='empty-category-modal-description' className='mt-3 text-sm leading-6 text-slate-600'>
              New items will appear here soon.
            </p>
          </div>

          <div className='mt-6 grid gap-3'>
            <button
              type='button'
              onClick={handleNotifyClick}
              disabled={
                !cleanCategoryId ||
                notifyState === 'checking-auth' ||
                notifyState === 'submitting' ||
                notifyState === 'success'
              }
              className={`inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold shadow-[0_14px_30px_rgba(150,109,16,0.2)] transition ${
                notifyState === 'success'
                  ? 'bg-[linear-gradient(135deg,#e6f7ec_0%,#bce9c9_48%,#7dd39a_100%)] text-emerald-950'
                  : 'bg-[linear-gradient(135deg,rgb(225_208_131)_0%,rgb(192_184_173)_45%,rgb(150_109_16)_100%)] text-slate-950 hover:brightness-[1.03]'
              } ${notifyState === 'submitting' || notifyState === 'checking-auth' ? 'cursor-wait opacity-90' : ''} ${
                !cleanCategoryId ? 'cursor-not-allowed opacity-60' : ''
              }`}
            >
              {notifyState === 'success' ? (
                <span className='empty-category-notify-success inline-flex items-center gap-2'>
                  <span className='inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/80 text-emerald-700'>
                    <svg viewBox='0 0 20 20' fill='none' className='h-3.5 w-3.5' stroke='currentColor' strokeWidth='2.4'>
                      <path d='M4.5 10.5 8 14l7.5-8' strokeLinecap='round' strokeLinejoin='round' />
                    </svg>
                  </span>
                  You&apos;ll be notified
                </span>
              ) : notifyState === 'checking-auth' ? (
                <span className='inline-flex items-center gap-2'>
                  <span className='h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
                  Checking your account
                </span>
              ) : notifyState === 'submitting' ? (
                <span className='inline-flex items-center gap-2'>
                  <span className='h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
                  Saving your spot
                </span>
              ) : (
                'Notify me when available'
              )}
            </button>
            {notifyState === 'guest' ? (
              <button
                type='button'
                onClick={handleSigninClick}
                className='inline-flex items-center justify-center rounded-2xl border border-[#d7c27d] bg-[#fff8e4] px-4 py-3 text-sm font-semibold text-[#8e6713] transition hover:bg-[#fff3cc]'
              >
                Sign in to get alerts
              </button>
            ) : null}
            <button
              type='button'
              onClick={handleSellerClick}
              className='inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50'
            >
              Launch your collection
            </button>
          </div>

          {notifyError ? (
            <p className='mt-3 text-center text-xs font-medium text-rose-600'>{notifyError}</p>
          ) : null}

          <div className='mt-4 flex items-center justify-center'>
            <button
              type='button'
              onClick={onClose}
              className='text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 transition hover:text-slate-800'
            >
              I&apos;ll check again later
            </button>
          </div>
        </div>

        <style jsx>{`
          .empty-category-item {
            animation: empty-category-drop 2.6s ease-in-out infinite;
          }

          .empty-category-item--delay-1 {
            animation-delay: 0.45s;
          }

          .empty-category-item--delay-2 {
            animation-delay: 0.9s;
          }

          .empty-category-spark {
            animation: empty-category-spark 1.9s ease-in-out infinite;
          }

          .empty-category-spark--delay {
            animation-delay: 0.55s;
          }

          .empty-category-notify-success {
            animation: empty-category-success-pop 420ms ease-out;
          }

          @keyframes empty-category-drop {
            0%,
            100% {
              transform: translateY(-2px) scale(0.96);
              opacity: 0;
            }
            18% {
              opacity: 1;
            }
            58% {
              transform: translateY(48px) scale(1);
              opacity: 1;
            }
            78% {
              transform: translateY(54px) scale(0.88);
              opacity: 0;
            }
          }

          @keyframes empty-category-spark {
            0%,
            100% {
              transform: scale(0.45);
              opacity: 0.1;
            }
            45% {
              transform: scale(1);
              opacity: 0.95;
            }
          }

          @keyframes empty-category-success-pop {
            0% {
              transform: scale(0.86);
              opacity: 0;
            }
            100% {
              transform: scale(1);
              opacity: 1;
            }
          }
        `}</style>
      </section>
    </div>
  )

  return createPortal(modalContent, document.body)
}
