'use client'

import { usePathname } from 'next/navigation'

// The account landing page is an immersive profile hub whose card grid already
// covers every sidebar destination, so the sidebar only renders on subpages.
export default function AccountShell({ sidebar, children }) {
  const pathname = usePathname()
  const isLanding = pathname === '/UserBackend' || pathname === '/account'

  return (
    <div
      className={`grid grid-cols-1 gap-4 overflow-visible lg:gap-0 ${
        isLanding ? 'account-sticky-shell' : 'lg:grid-cols-[18rem_minmax(0,1fr)]'
      }`}
    >
      {isLanding ? null : <div className='hidden lg:block'>{sidebar}</div>}
      <main className='min-w-0 overflow-x-hidden bg-transparent'>{children}</main>
    </div>
  )
}
