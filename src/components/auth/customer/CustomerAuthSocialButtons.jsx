function GoogleIcon() {
  return (
    <svg aria-hidden='true' viewBox='-3 0 262 262' className='h-5 w-5' preserveAspectRatio='xMidYMid'>
      <path
        fill='#4285F4'
        d='M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027'
      />
      <path
        fill='#34A853'
        d='M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1'
      />
      <path
        fill='#FBBC05'
        d='M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782'
      />
      <path
        fill='#EB4335'
        d='M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251'
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

function GoogleLoadingDots() {
  return (
    <span className='inline-flex items-center gap-1.5' aria-label='Connecting to Google'>
      <span className='h-2.5 w-2.5 animate-bounce rounded-full bg-[#4285F4] [animation-delay:-0.24s]' />
      <span className='h-2.5 w-2.5 animate-bounce rounded-full bg-[#EB4335] [animation-delay:-0.12s]' />
      <span className='h-2.5 w-2.5 animate-bounce rounded-full bg-[#34A853]' />
    </span>
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
        {isGoogleLoading ? <GoogleLoadingDots /> : <GoogleIcon />}
        {!isGoogleLoading ? <span>Continue with Google</span> : null}
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
