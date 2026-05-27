'use client'

export default function CountryFlagIcon({ country, className = 'h-3 w-4' }) {
  const sharedProps = {
    className,
    viewBox: '0 0 48 32',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': true,
  }

  if (country === 'Nigeria') {
    return (
      <svg {...sharedProps}>
        <rect width='16' height='32' fill='#128A43' />
        <rect x='16' width='16' height='32' fill='#FFFFFF' />
        <rect x='32' width='16' height='32' fill='#128A43' />
      </svg>
    )
  }

  if (country === 'International') {
    return (
      <svg {...sharedProps}>
        <rect width='48' height='32' fill='#0f172a' />
        <circle cx='24' cy='16' r='10' fill='none' stroke='#E2E8F0' strokeWidth='1.8' />
        <path d='M14 16h20M24 6v20M17 10.5c2 1.7 4.5 2.5 7 2.5s5-.8 7-2.5M17 21.5c2-1.7 4.5-2.5 7-2.5s5 .8 7 2.5' stroke='#E2E8F0' strokeWidth='1.5' strokeLinecap='round' />
      </svg>
    )
  }

  return (
    <svg {...sharedProps}>
      <rect width='48' height='32' fill='#E5E7EB' />
    </svg>
  )
}
