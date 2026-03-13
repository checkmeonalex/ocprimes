import Image from 'next/image'
import Link from 'next/link'
import fulllogo from '@/app/storage/fulllogo.png'
import minilogo from '@/app/storage/minilogo.png'

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
  label = 'Alxora',
  ariaLabel = 'Alxora',
}) {
  const content = (
    <>
      {variant === 'full' ? (
        <BrandLogoFull />
      ) : (
        <BrandLogoMark className={markClassName} />
      )}
      {variant !== 'full' && variant !== 'mark' ? (
        <span className={labelClassName}>{label}</span>
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
