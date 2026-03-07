import AccountSecurityIcon from '@/components/common/AccountSecurityIcon'

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

  if (label === 'Messages') {
    return (
      <svg {...iconProps}>
        <path
          d='M4 6.5h16v10H9l-5 3v-13z'
          stroke='currentColor'
          strokeWidth='1.5'
          strokeLinejoin='round'
        />
        <path d='M8 10h8M8 13h6' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
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
      <svg
        className={className}
        viewBox='0 -0.5 25 25'
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
        aria-hidden='true'
      >
        <path
          fillRule='evenodd'
          clipRule='evenodd'
          d='M5.5 12.9543C5.51239 14.0398 5.95555 15.076 6.73197 15.8348C7.50838 16.5936 8.55445 17.0128 9.64 17.0003H11.646C12.1915 17.0007 12.7131 17.224 13.09 17.6183L14.159 18.7363C14.3281 18.9076 14.5588 19.004 14.7995 19.004C15.0402 19.004 15.2709 18.9076 15.44 18.7363L17.1 17.0003L17.645 16.3923C17.7454 16.2833 17.8548 16.1829 17.972 16.0923C18.9349 15.3354 19.4979 14.179 19.5 12.9543V8.04428C19.4731 5.7845 17.6198 3.97417 15.36 4.00028H9.64C7.38021 3.97417 5.5269 5.7845 5.5 8.04428V12.9543Z'
          stroke='currentColor'
          strokeWidth='1.5'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <path
          d='M16.1957 12.3245C16.3504 11.9403 16.1644 11.5034 15.7802 11.3486C15.396 11.1939 14.959 11.3799 14.8043 11.7641L16.1957 12.3245ZM14.616 13.2503L15.0898 13.8317L15.0926 13.8294L14.616 13.2503ZM10.364 13.2193L9.87845 13.7909L9.88182 13.7938L10.364 13.2193ZM10.2002 11.7315C10.0517 11.3448 9.61791 11.1517 9.23121 11.3001C8.84451 11.4486 8.65137 11.8824 8.79982 12.2691L10.2002 11.7315ZM10.25 8.00031C10.25 7.58609 9.91421 7.25031 9.5 7.25031C9.08579 7.25031 8.75 7.58609 8.75 8.00031H10.25ZM8.75 9.00031C8.75 9.41452 9.08579 9.75031 9.5 9.75031C9.91421 9.75031 10.25 9.41452 10.25 9.00031H8.75ZM16.25 8.00031C16.25 7.58609 15.9142 7.25031 15.5 7.25031C15.0858 7.25031 14.75 7.58609 14.75 8.00031H16.25ZM14.75 9.00031C14.75 9.41452 15.0858 9.75031 15.5 9.75031C15.9142 9.75031 16.25 9.41452 16.25 9.00031H14.75ZM14.8043 11.7641C14.662 12.1173 14.4334 12.4292 14.1394 12.6712L15.0926 13.8294C15.5804 13.4279 15.9597 12.9105 16.1957 12.3245L14.8043 11.7641ZM14.1422 12.6689C13.1801 13.4528 11.7968 13.4427 10.8462 12.6448L9.88182 13.7938C11.3838 15.0545 13.5696 15.0704 15.0898 13.8317L14.1422 12.6689ZM10.8495 12.6477C10.5597 12.4015 10.3364 12.0865 10.2002 11.7315L8.79982 12.2691C9.02618 12.8587 9.39708 13.382 9.87846 13.7909L10.8495 12.6477ZM8.75 8.00031V9.00031H10.25V8.00031H8.75ZM14.75 8.00031V9.00031H16.25V8.00031H14.75Z'
          fill='currentColor'
        />
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
    return <AccountSecurityIcon className={className} aria-hidden='true' />
  }

  return (
    <svg {...iconProps}>
      <path d='M7 7h10M7 12h10M7 17h10' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
    </svg>
  )
}
