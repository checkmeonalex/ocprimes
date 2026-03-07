import Link from 'next/link'

const joinClasses = (...values) => values.filter(Boolean).join(' ')

export function BrandLogoMark({
  className = 'h-8 w-8 text-[#f5d10b]',
  ...props
}) {
  return (
    <svg
      className={className}
      viewBox='0 0 24 24'
      fill='currentColor'
      aria-hidden='true'
      {...props}
    >
      <circle cx='12' cy='3.2' r='2.2' />
      <circle cx='12' cy='20.8' r='2.2' />
      <circle cx='3.2' cy='12' r='2.2' />
      <circle cx='20.8' cy='12' r='2.2' />
      <circle cx='6.3' cy='6.3' r='2.2' />
      <circle cx='17.7' cy='17.7' r='2.2' />
      <circle cx='17.7' cy='6.3' r='2.2' />
      <circle cx='6.3' cy='17.7' r='2.2' />
    </svg>
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
