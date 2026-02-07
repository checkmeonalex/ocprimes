'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'

const buildShareTargets = ({ shareUrl, productName }) => {
  const encodedUrl = encodeURIComponent(shareUrl || '')
  const encodedTitle = encodeURIComponent(productName || 'Check this out')
  const encodedText = encodeURIComponent(`${productName || 'Check this out'} ${shareUrl || ''}`)

  return [
    {
      key: 'x',
      label: 'X (Twitter)',
      iconSrc: '/icons/share/shareicon6.png',
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    },
    {
      key: 'facebook',
      label: 'Facebook',
      iconSrc: '/icons/share/shareicon1.png',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      iconSrc: '/icons/share/shareicon5.png',
      href: `https://wa.me/?text=${encodedText}`,
    },
    {
      key: 'instagram',
      label: 'Instagram',
      iconSrc: '/icons/share/shareicon3.png',
      href: 'https://www.instagram.com/',
    },
    {
      key: 'tiktok',
      label: 'TikTok',
      iconSrc: '/icons/share/shareicon4.png',
      href: 'https://www.tiktok.com/',
    },
    {
      key: 'email',
      label: 'Email',
      iconSrc: '/icons/share/shareicon2.png',
      href: `mailto:?subject=${encodedTitle}&body=${encodedText}`,
    },
  ]
}

const fallbackCopy = async (text) => {
  const input = document.createElement('textarea')
  input.value = text
  input.setAttribute('readonly', '')
  input.style.position = 'absolute'
  input.style.left = '-9999px'
  document.body.appendChild(input)
  input.select()
  document.execCommand('copy')
  document.body.removeChild(input)
}

const ShareProductModal = ({ open, onClose, shareUrl, productName }) => {
  const [copied, setCopied] = useState(false)

  const targets = useMemo(
    () => buildShareTargets({ shareUrl, productName }),
    [productName, shareUrl],
  )

  useEffect(() => {
    if (!open) return
    const handleEsc = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose, open])

  useEffect(() => {
    if (!open) setCopied(false)
  }, [open])

  if (!open) return null

  const handleCopy = async () => {
    if (!shareUrl) return
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl)
      } else {
        await fallbackCopy(shareUrl)
      }
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch (_error) {
      setCopied(false)
    }
  }

  const openTarget = (href) => {
    if (!href) return
    window.open(href, '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      className='fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4'
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className='w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl'>
        <div className='flex items-center justify-between'>
          <h3 className='text-[28px] font-semibold text-gray-900'>Share</h3>
          <button
            type='button'
            aria-label='Close share dialog'
            onClick={onClose}
            className='inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition'
          >
            ✕
          </button>
        </div>

        <p className='mt-6 text-sm font-medium text-gray-700'>Share this link via</p>
        <div className='mt-3 flex flex-wrap gap-3'>
          {targets.map((target) => (
            <button
              key={target.key}
              type='button'
              onClick={() => openTarget(target.href)}
              className='group w-[58px]'
              aria-label={target.label}
            >
              <span className='flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white transition group-hover:border-gray-300 group-hover:bg-gray-50'>
                <Image
                  src={target.iconSrc}
                  alt={target.label}
                  width={20}
                  height={20}
                  className='h-5 w-5'
                />
              </span>
              <span className='mt-2 block text-[11px] text-gray-700 whitespace-nowrap'>
                {target.label}
              </span>
            </button>
          ))}
        </div>

        <div className='mt-5 border-t border-gray-200 pt-5'>
          <p className='text-sm font-semibold text-gray-900'>Page link</p>
          <div className='mt-2 flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2'>
            <span className='min-w-0 flex-1 truncate text-xs text-gray-600'>{shareUrl}</span>
            <button
              type='button'
              onClick={handleCopy}
              className='inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-600 hover:bg-gray-200 hover:text-gray-800 transition'
              aria-label='Copy link'
            >
              ⧉
            </button>
          </div>
          {copied && (
            <p className='mt-2 text-xs font-medium text-green-600'>Link copied</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default ShareProductModal
