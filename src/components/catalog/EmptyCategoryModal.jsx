'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createPortal } from 'react-dom'
import { useAlerts } from '@/context/AlertContext'
import { useAuthUser } from '@/lib/auth/useAuthUser'

const buildNextPath = (pathname, searchParams) => {
  const base = String(pathname || '').trim() || '/'
  const search = searchParams?.toString?.() || ''
  return search ? `${base}?${search}` : base
}

export default function EmptyCategoryModal({
  isOpen,
  categoryName = '',
  onClose,
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user } = useAuthUser()
  const { pushAlert } = useAlerts()
  const [isMounted, setIsMounted] = useState(false)

  const cleanCategoryName = useMemo(
    () => String(categoryName || '').trim() || 'this category',
    [categoryName],
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

  if (!isMounted || !isOpen) return null

  const handleNotifyClick = () => {
    if (!user) {
      const next = encodeURIComponent(buildNextPath(pathname, searchParams))
      router.push(`/signup?next=${next}`)
      onClose?.()
      return
    }

    pushAlert({
      type: 'info',
      title: 'Category alerts are almost here',
      message: `We are still setting up availability alerts for ${cleanCategoryName}. Check back again soon.`,
      timeoutMs: 5000,
    })
    onClose?.()
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

          <div className='relative mx-auto mb-5 flex h-36 w-36 items-center justify-center'>
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
            <h2 id='empty-category-modal-title' className='text-[1.85rem] font-semibold tracking-tight text-slate-950'>
              We&apos;re getting {cleanCategoryName} ready.
            </h2>
            <p id='empty-category-modal-description' className='mt-3 text-sm leading-6 text-slate-600'>
              New items will appear here soon.
            </p>
          </div>

          <div className='mt-6 grid gap-3'>
            <button
              type='button'
              onClick={handleNotifyClick}
              className='inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgb(225_208_131)_0%,rgb(192_184_173)_45%,rgb(150_109_16)_100%)] px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_14px_30px_rgba(150,109,16,0.2)] transition hover:brightness-[1.03]'
            >
              Notify me when available
            </button>
            <button
              type='button'
              onClick={handleSellerClick}
              className='inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50'
            >
              Launch your collection
            </button>
          </div>

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
        `}</style>
      </section>
    </div>
  )

  return createPortal(modalContent, document.body)
}
