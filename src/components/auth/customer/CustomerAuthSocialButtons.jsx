function GoogleIcon() {
  return (
    <svg aria-hidden='true' viewBox='0 0 24 24' className='h-5 w-5'>
      <path
        fill='#EA4335'
        d='M12 10.2v3.9h5.4c-.2 1.2-.9 2.3-1.9 3.1l3.1 2.4c1.8-1.7 2.9-4.1 2.9-6.9 0-.7-.1-1.4-.2-2H12Z'
      />
      <path
        fill='#34A853'
        d='M12 22c2.6 0 4.8-.9 6.4-2.4l-3.1-2.4c-.9.6-2 .9-3.3.9-2.5 0-4.6-1.7-5.4-4H3.4v2.5A10 10 0 0 0 12 22Z'
      />
      <path
        fill='#4A90E2'
        d='M6.6 14.1a6.1 6.1 0 0 1 0-4V7.6H3.4a10 10 0 0 0 0 8.9l3.2-2.4Z'
      />
      <path
        fill='#FBBC05'
        d='M12 5.9c1.4 0 2.7.5 3.6 1.4l2.7-2.7A10 10 0 0 0 3.4 7.6l3.2 2.5c.8-2.4 2.9-4.2 5.4-4.2Z'
      />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg aria-hidden='true' viewBox='0 0 24 24' className='h-5 w-5 text-[#1877F2]'>
      <path
        fill='currentColor'
        d='M13.2 21v-7.8h2.6l.4-3H13.2V8.4c0-.9.3-1.6 1.7-1.6h1.5V4.1c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.9v2.2H8v3h2.5V21h2.7Z'
      />
    </svg>
  )
}

const baseButtonClassName =
  'flex w-full items-center justify-center gap-3 rounded-sm border px-4 py-3 text-sm font-medium transition'

export default function CustomerAuthSocialButtons({
  isGoogleLoading,
  isGoogleDisabled,
  onGoogleClick,
}) {
  return (
    <div className='grid gap-3'>
      <button
        type='button'
        onClick={onGoogleClick}
        disabled={isGoogleDisabled}
        className={`${baseButtonClassName} border-slate-300 bg-white text-slate-800 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-70`}
      >
        <GoogleIcon />
        <span>{isGoogleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
      </button>

      <button
        type='button'
        disabled
        aria-disabled='true'
        className={`${baseButtonClassName} cursor-not-allowed border-slate-300 bg-white text-slate-400`}
      >
        <FacebookIcon />
        <span>Facebook (coming soon)</span>
      </button>
    </div>
  )
}
