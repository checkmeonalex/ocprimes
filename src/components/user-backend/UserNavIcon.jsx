export default function UserNavIcon({ label, className = 'h-5 w-5' }) {
  const iconProps = {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': true,
  }

  if (label === 'Notifications') {
    return (
      <svg {...iconProps}>
        <path
          d='M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V10a6 6 0 1 0-12 0v4.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0m6 0H9'
          stroke='currentColor'
          strokeWidth='1.5'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
    )
  }

  if (label === 'Your orders') {
    return (
      <svg {...iconProps}>
        <rect x='4' y='5' width='16' height='14' rx='2' stroke='currentColor' strokeWidth='1.5' />
        <path d='M8 9h8M8 13h5' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
      </svg>
    )
  }

  if (label === 'Wishlist') {
    return (
      <svg {...iconProps}>
        <path
          d='M12 20s-5.5-3.7-7.4-6.7C2.3 9.7 4.4 5.5 8 5.5c1.8 0 3 .9 4 2.2 1-1.3 2.2-2.2 4-2.2 3.6 0 5.7 4.2 3.4 7.8C17.5 16.3 12 20 12 20z'
          stroke='currentColor'
          strokeWidth='1.5'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
    )
  }

  if (label === 'Your reviews') {
    return (
      <svg {...iconProps}>
        <path d='M4 6.5h16v9H9l-5 3v-12z' stroke='currentColor' strokeWidth='1.5' strokeLinejoin='round' />
        <path d='m11 10 1 2 2.2.3-1.6 1.6.4 2.1L11 15l-2 .9.4-2.1-1.6-1.6 2.2-.3 1-2z' stroke='currentColor' strokeWidth='1.2' />
      </svg>
    )
  }

  if (label === 'Your profile') {
    return (
      <svg {...iconProps}>
        <circle cx='12' cy='8' r='3.5' stroke='currentColor' strokeWidth='1.5' />
        <path d='M5 19c1.8-3 4-4.5 7-4.5s5.2 1.5 7 4.5' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
      </svg>
    )
  }

  if (label === 'Coupons & offers') {
    return (
      <svg {...iconProps}>
        <path d='M4.5 8a2 2 0 0 0 0 4v4h15v-4a2 2 0 0 0 0-4V4h-15v4z' stroke='currentColor' strokeWidth='1.5' />
        <path d='M12 4v12' stroke='currentColor' strokeWidth='1.5' strokeDasharray='2 2' />
      </svg>
    )
  }

  if (label === 'Browsing history') {
    return (
      <svg {...iconProps}>
        <path d='M12 7.5v4l2.5 2.5' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
        <path d='M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 12H2m2.5-5v2.5H7' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
      </svg>
    )
  }

  if (label === 'Followed stores') {
    return (
      <svg {...iconProps}>
        <path d='M4 9h16l-1.2 10H5.2L4 9zM6 9l1-4h10l1 4' stroke='currentColor' strokeWidth='1.5' strokeLinejoin='round' />
      </svg>
    )
  }

  if (label === 'Addresses') {
    return (
      <svg {...iconProps}>
        <path d='M12 20s6-6.6 6-10a6 6 0 1 0-12 0c0 3.4 6 10 6 10z' stroke='currentColor' strokeWidth='1.5' />
        <circle cx='12' cy='10' r='2.2' stroke='currentColor' strokeWidth='1.5' />
      </svg>
    )
  }

  if (label === 'Account & security') {
    return (
      <svg {...iconProps}>
        <path d='M12 4 5 7v5c0 4.5 3.1 7 7 8 3.9-1 7-3.5 7-8V7l-7-3z' stroke='currentColor' strokeWidth='1.5' />
        <path d='M10.5 11.5v-1a1.5 1.5 0 1 1 3 0v1M10 11.5h4v3h-4z' stroke='currentColor' strokeWidth='1.5' />
      </svg>
    )
  }

  return (
    <svg {...iconProps}>
      <path d='M7 7h10M7 12h10M7 17h10' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
    </svg>
  )
}

