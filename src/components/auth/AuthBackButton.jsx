'use client'

import { useRouter } from 'next/navigation'

export default function AuthBackButton({
  fallbackHref = '/',
  className = '',
}) {
  const router = useRouter()

  const handleClick = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }

    router.push(fallbackHref)
  }

  return (
    <button
      type='button'
      onClick={handleClick}
      className={className}
    >
      <svg
        aria-hidden='true'
        viewBox='0 0 20 20'
        fill='none'
        className='h-4 w-4'
      >
        <path
          d='M11.5 4.5 6 10l5.5 5.5'
          stroke='currentColor'
          strokeWidth='1.8'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
      <span>Return</span>
    </button>
  )
}
