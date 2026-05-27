'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { createPortal } from 'react-dom'

function LoadingDots() {
  return (
    <span className='inline-flex items-center gap-1' aria-hidden='true'>
      <span className='h-1.5 w-1.5 animate-[bounce_1s_infinite_0ms] rounded-full bg-current' />
      <span className='h-1.5 w-1.5 animate-[bounce_1s_infinite_150ms] rounded-full bg-current' />
      <span className='h-1.5 w-1.5 animate-[bounce_1s_infinite_300ms] rounded-full bg-current' />
    </span>
  )
}

export default function OutOfStockNotifyModal({
  open,
  onClose,
  productName = 'This product',
  productImage = '',
}) {
  const [notifyState, setNotifyState] = useState('idle')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) {
      setNotifyState('idle')
      return
    }
    const handleEsc = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose, open])

  if (!open || !mounted) return null

  const handleNotify = () => {
    if (notifyState === 'loading') return
    setNotifyState('loading')
    window.setTimeout(() => {
      setNotifyState('success')
    }, 900)
  }

  return createPortal(
    <div
      className='fixed inset-0 z-[95] flex items-end justify-center bg-[#1f1111]/45 p-0 sm:items-center sm:p-4'
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className='w-full max-h-[78vh] overflow-hidden rounded-t-[28px] border border-[#e7ddd4] bg-white shadow-[0_-18px_44px_rgba(82,43,14,0.12)] sm:max-h-[85vh] sm:max-w-md sm:rounded-[28px] sm:shadow-[0_22px_60px_rgba(60,32,11,0.16)]'>
        <div className='overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 sm:p-5'>
          <div className='mx-auto mb-3 h-1.5 w-12 rounded-full bg-[#d8c2ad] sm:hidden' />
          <div className='flex items-start justify-between gap-3'>
            <div>
              <span className='inline-flex rounded-full bg-[#2b1811] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f6dfc5]'>
                Out of stock
              </span>
              <h3 className='mt-3 text-[1.35rem] font-semibold tracking-tight text-[#24120c]'>
                This item is currently unavailable
              </h3>
            </div>
            <button
              type='button'
              onClick={onClose}
              aria-label='Close out of stock modal'
              className='inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#e2d3c6] bg-white/80 text-[#6c5443] transition hover:bg-white hover:text-[#2f1c12]'
            >
              <svg viewBox='0 0 20 20' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                <path d='M6 6l8 8M14 6l-8 8' strokeLinecap='round' />
              </svg>
            </button>
          </div>

          <div className='mt-4 flex items-center gap-3'>
            <div className='relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-[#f5ece2]'>
              {productImage ? (
                <Image
                  src={productImage}
                  alt={productName}
                  fill
                  sizes='80px'
                  className='object-cover'
                />
              ) : (
                <div className='flex h-full w-full items-center justify-center text-xs font-semibold uppercase tracking-[0.24em] text-[#9e7b61]'>
                  Alxora
                </div>
              )}
            </div>
            <div className='min-w-0'>
              <p className='text-sm font-medium leading-snug text-[#24120c]'>
                {productName}
              </p>
              <p className='mt-1 text-xs leading-relaxed text-[#7d6250]'>This product is currently out of stock.</p>
            </div>
          </div>

          <div className='mt-5 flex flex-col gap-2 sm:flex-row'>
            <button
              type='button'
              onClick={handleNotify}
              disabled={notifyState === 'loading' || notifyState === 'success'}
              className={`inline-flex h-12 w-full items-center justify-center rounded-2xl px-4 text-sm font-semibold transition disabled:opacity-80 ${
                notifyState === 'success'
                  ? 'border border-emerald-500 bg-transparent text-emerald-600'
                  : 'bg-[#2b1811] text-[#f8eadb] hover:bg-[#1f110b]'
              }`}
            >
              {notifyState === 'loading'
                ? <LoadingDots />
                : notifyState === 'success'
                  ? 'We will notify you'
                  : 'Notify me when back'}
            </button>
            <button
              type='button'
              onClick={onClose}
              className='inline-flex h-12 w-full items-center justify-center rounded-2xl border border-[#dfccbd] bg-white/90 px-4 text-sm font-semibold text-[#4f392c] transition hover:bg-white'
            >
              Continue shopping
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
