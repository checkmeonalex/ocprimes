'use client'

export default function CustomerConversationPlaceholder() {
  return (
    <section className='hidden h-full min-h-0 items-center justify-center bg-slate-50 lg:flex'>
      <div className='mx-auto max-w-md text-center'>
        <div className='mx-auto inline-flex h-28 w-28 items-center justify-center rounded-full bg-slate-200 text-slate-600'>
          <svg viewBox='0 0 120 120' className='h-16 w-16' fill='none' stroke='currentColor' strokeWidth='4'>
            <path d='M24 30h72v46H57l-18 14v-14H24z' strokeLinecap='round' strokeLinejoin='round' />
            <path d='M45 49h30M45 61h22' strokeLinecap='round' />
          </svg>
        </div>
        <h2 className='mt-6 text-4xl font-semibold tracking-tight text-slate-900'>Messages</h2>
        <p className='mt-3 text-base text-slate-400'>
          Your product chats with sellers appear here.
        </p>
      </div>
    </section>
  )
}
