import Image from 'next/image'
import Link from 'next/link'
import fulllogo from '@/app/storage/fulllogo.png'
import minilogo from '@/app/storage/minilogo.png'
import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand'

const joinClasses = (...values) => values.filter(Boolean).join(' ')

export function BrandLogoMark({
  className = 'h-12 w-12 text-[#f5d10b] sm:h-10 sm:w-10',
  ...props
}) {
  return (
    <span
      className={joinClasses('relative inline-block overflow-hidden', className)}
      aria-hidden='true'
      {...props}
    >
      <Image
        src={minilogo}
        alt=''
        fill
        sizes='64px'
        className='object-contain contrast-150 saturate-[1.7] brightness-[0.98] drop-shadow-[0_0_0.4px_rgba(15,23,42,0.45)]'
      />
    </span>
  )
}

export function BrandLogoFull({
  className = 'h-auto w-[112px] min-[360px]:w-[124px] sm:w-[168px]',
  ...props
}) {
  return (
    <span
      className={joinClasses('inline-block shrink-0', className)}
      aria-hidden='true'
      {...props}
    >
      <Image
        src={fulllogo}
        alt=''
        priority={false}
        className='h-auto w-full object-contain'
      />
    </span>
  )
}

export default function BrandLogo({
  href = null,
  onClick,
  variant = 'full',
  className = 'inline-flex items-center gap-3 text-gray-900',
  markClassName = 'h-12 w-12 shrink-0 text-[#f5d10b] sm:h-10 sm:w-10',
  labelClassName = 'text-xl font-semibold tracking-tight text-current',
  taglineClassName = 'text-[10px] font-medium uppercase tracking-[0.42em] text-current/70',
  label = BRAND_NAME,
  ariaLabel = BRAND_NAME,
  showTagline = false,
  tagline = BRAND_TAGLINE,
}) {
  const content = (
    <>
      {variant === 'full' ? (
        <BrandLogoFull />
      ) : (
        <BrandLogoMark className={markClassName} />
      )}
      {variant !== 'full' && variant !== 'mark' ? (
        <span className='flex min-w-0 flex-col'>
          <span className={labelClassName}>{label}</span>
          {showTagline ? <span className={taglineClassName}>{tagline}</span> : null}
        </span>
      ) : null}
      {variant === 'full' && showTagline ? (
        <span className='flex min-w-0 flex-col justify-center'>
          <span className={taglineClassName}>{tagline}</span>
        </span>
      ) : null}
    </>
  )

  if (!href) {
    return (
      <span
        className={className}
        aria-label={variant === 'mark' ? ariaLabel : undefined}
      >
        {content}
      </span>
    )
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      className={joinClasses(className, variant === 'mark' ? 'justify-center' : '')}
      aria-label={variant === 'mark' ? ariaLabel : undefined}
    >
      {content}
    </Link>
  )
}
