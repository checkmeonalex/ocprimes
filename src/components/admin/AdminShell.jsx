'use client'

import AdminSidebar from '@/components/AdminSidebar'
import AdminDesktopHeader from '@/components/admin/AdminDesktopHeader'

/**
 * Shared shell for every admin page.
 * Sidebar is fixed; only the content area scrolls.
 *
 * Props:
 *   children    — page content
 *   noPad       — skip default px/pb on the scroll container (page handles its own spacing)
 *   noBleed     — pass noBleed to AdminDesktopHeader (removes negative-margin bleed)
 *   bg          — override background colour class (default: "bg-slate-50")
 */
export default function AdminShell({ children, noPad = false, noBleed = false, bg = 'bg-slate-50' }) {
  return (
    <div className={`flex h-screen overflow-hidden ${bg} text-slate-900`}>
      <AdminSidebar />
      <main className="flex flex-1 flex-col overflow-hidden">
        <AdminDesktopHeader noBleed={noBleed} />
        <div className={`flex-1 overflow-y-auto${noPad ? '' : ' px-4 pb-10 sm:px-6 lg:px-10'}`}>
          {children}
        </div>
      </main>
    </div>
  )
}
