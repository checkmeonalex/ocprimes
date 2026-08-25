'use client'

import AdminSidebar from '@/components/AdminSidebar'
import AdminDesktopHeader from '@/components/admin/AdminDesktopHeader'

export default function AdminShell({ children, noPad = false, bg }) {
  return (
    <div className={`flex h-screen overflow-hidden ${bg || 'bg-slate-50'} text-slate-900 dark:bg-[#000000] dark:text-zinc-100`}>
      <AdminSidebar />
      <main className="flex flex-1 flex-col overflow-hidden">
        <AdminDesktopHeader />
        <div className={`flex-1 overflow-y-auto${noPad ? '' : ' px-4 pb-10 sm:px-6 lg:px-10'}`}>
          {children}
        </div>
      </main>
    </div>
  )
}
