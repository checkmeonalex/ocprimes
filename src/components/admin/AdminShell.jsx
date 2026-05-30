'use client'

import AdminSidebar from '@/components/AdminSidebar'
import AdminDesktopHeader from '@/components/admin/AdminDesktopHeader'
import { useAdminTheme } from '@/context/AdminThemeContext'

export default function AdminShell({ children, noPad = false, bg }) {
  const { isDark } = useAdminTheme()
  const defaultBg = isDark ? 'bg-[#1c1c1e]' : (bg || 'bg-slate-50')

  return (
    <div className={`flex h-screen overflow-hidden ${defaultBg} text-slate-900 dark:text-zinc-100`}>
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
