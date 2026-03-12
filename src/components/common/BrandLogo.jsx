import Image from 'next/image'
import Link from 'next/link'
import minilogo from '@/app/storage/minilogo.png'

const joinClasses = (...values) => values.filter(Boolean).join(' ')

export function BrandLogoMark({
  className = 'h-8 w-8 text-[#f5d10b]',
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
        className='object-contain'
      />
    </span>
  )
}

export default function BrandLogo({
  href = null,
  onClick,
  variant = 'full',
  className = 'inline-flex items-center gap-3 text-gray-900',
  markClassName = 'h-8 w-8 shrink-0 text-[#f5d10b]',
  labelClassName = 'text-xl font-semibold tracking-tight text-current',
  label = 'OCPRIMES',
  ariaLabel = 'OCPRIMES',
}) {
  const content = (
    <>
      <BrandLogoMark className={markClassName} />
      {variant === 'full' ? <span className={labelClassName}>{label}</span> : null}
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
