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

  if (country === 'Egypt') {
    return (
      <svg {...sharedProps}>
        <rect width='48' height='10.67' fill='#CE1126' />
        <rect y='10.67' width='48' height='10.66' fill='#FFFFFF' />
        <rect y='21.33' width='48' height='10.67' fill='#000000' />
        <circle cx='24' cy='16' r='2' fill='#C7A317' />
      </svg>
    )
  }

  if (country === 'Ghana') {
    return (
      <svg {...sharedProps}>
        <rect width='48' height='10.67' fill='#CE1126' />
        <rect y='10.67' width='48' height='10.66' fill='#FCD116' />
        <rect y='21.33' width='48' height='10.67' fill='#006B3F' />
        <polygon points='24,12 26,17 31,17 27,20 29,25 24,22 19,25 21,20 17,17 22,17' fill='#000000' />
      </svg>
    )
  }

  if (country === 'Ivory Coast') {
    return (
      <svg {...sharedProps}>
        <rect width='16' height='32' fill='#F77F00' />
        <rect x='16' width='16' height='32' fill='#FFFFFF' />
        <rect x='32' width='16' height='32' fill='#009E60' />
      </svg>
    )
  }

  if (country === 'Algeria') {
    return (
      <svg {...sharedProps}>
        <rect width='24' height='32' fill='#006233' />
        <rect x='24' width='24' height='32' fill='#FFFFFF' />
        <circle cx='26' cy='16' r='7' fill='#D21034' />
        <circle cx='28.5' cy='16' r='6' fill='#FFFFFF' />
        <polygon points='30,16 33,17 31,19 31.5,22 29,20.5 26.5,22 27,19 25,17 28,16 29,13' fill='#D21034' />
      </svg>
    )
  }

  if (country === 'Morocco') {
    return (
      <svg {...sharedProps}>
        <rect width='48' height='32' fill='#C1272D' />
        <polygon points='24,8 26.8,20 16.5,12.5 31.5,12.5 21.2,20' fill='none' stroke='#006233' strokeWidth='2.2' />
      </svg>
    )
  }

  if (country === 'USA') {
    return (
      <svg {...sharedProps}>
        {Array.from({ length: 13 }).map((_, i) => (
          <rect
            key={i}
            y={i * (32 / 13)}
            width='48'
            height={32 / 13}
            fill={i % 2 === 0 ? '#B22234' : '#FFFFFF'}
          />
        ))}
        <rect width='22' height='17' fill='#3C3B6E' />
      </svg>
    )
  }

  if (country === 'UK') {
    return (
      <svg {...sharedProps}>
        <rect width='48' height='32' fill='#012169' />
        <path d='M0 0L48 32M48 0L0 32' stroke='#FFFFFF' strokeWidth='6' />
        <path d='M0 0L48 32M48 0L0 32' stroke='#C8102E' strokeWidth='3' />
        <path d='M24 0V32M0 16H48' stroke='#FFFFFF' strokeWidth='10' />
        <path d='M24 0V32M0 16H48' stroke='#C8102E' strokeWidth='6' />
      </svg>
    )
  }

  if (country === 'UAE') {
    return (
      <svg {...sharedProps}>
        <rect width='12' height='32' fill='#FF0000' />
        <rect x='12' width='36' height='10.67' fill='#009A49' />
        <rect x='12' y='10.67' width='36' height='10.66' fill='#FFFFFF' />
        <rect x='12' y='21.33' width='36' height='10.67' fill='#000000' />
      </svg>
    )
  }

  if (country === 'Canada') {
    return (
      <svg {...sharedProps}>
        <rect width='12' height='32' fill='#D52B1E' />
        <rect x='12' width='24' height='32' fill='#FFFFFF' />
        <rect x='36' width='12' height='32' fill='#D52B1E' />
        <polygon points='24,9 26,14 31,14 27,17 28.5,23 24,19.5 19.5,23 21,17 17,14 22,14' fill='#D52B1E' />
      </svg>
    )
  }

  return (
    <svg {...sharedProps}>
      <rect width='48' height='32' fill='#E5E7EB' />
    </svg>
  )
}
