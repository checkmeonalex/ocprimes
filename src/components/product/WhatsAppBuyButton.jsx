'use client'

import { WhatsAppIcon } from '@/components/vendor/VendorSocialIcons'

export function buildWhatsAppOrderUrl({ phone, productName, price = null, formattedPrice, quantity, variant, url }) {
  const digits = String(phone || '').replace(/[^0-9]/g, '')
  if (!digits) return ''

  const lines = [`Hi! I'd like to order:`, String(productName || '').trim()]
  if (variant) lines.push(variant)
  if (quantity && Number(quantity) > 1) lines.push(`Qty: ${quantity}`)
  const priceLabel = formattedPrice || (price != null ? String(price) : '')
  if (priceLabel) lines.push(`Price: ${priceLabel}`)
  if (url) lines.push(url)

  const text = encodeURIComponent(lines.filter(Boolean).join('\n'))
  return `https://wa.me/${digits}?text=${text}`
}

export default function WhatsAppBuyButton({ href, className = '', size = 'default', label = 'Order on WhatsApp' }) {
  if (!href) return null

  const sizeClasses =
    size === 'compact'
      ? 'h-11 text-[11px] gap-1.5'
      : 'h-12 text-xs gap-2'

  return (
    <a
      href={href}
      target='_blank'
      rel='noopener noreferrer'
      className={`inline-flex w-full items-center justify-center rounded-full bg-[#25D366] font-black uppercase tracking-[0.15em] text-white transition hover:bg-[#1ebe5a] ${sizeClasses} ${className}`}
    >
      <WhatsAppIcon className='h-4 w-4 shrink-0' />
      {label}
    </a>
  )
}
