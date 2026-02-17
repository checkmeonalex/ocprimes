'use client'

import AdminSidebar from '@/components/AdminSidebar'
import AdminDesktopHeader from '@/components/admin/AdminDesktopHeader'
import AttributesWorkspace from './components/AttributesWorkspace'

export default function AttributesPage() {
  return (
    <div className='min-h-screen bg-slate-50 text-slate-900'>
      <div className='flex min-h-screen'>
        <div className='sticky top-0 h-screen self-start'>
          <AdminSidebar />
        </div>

        <main className='flex-1 px-4 py-8 sm:px-6 lg:px-10 lg:pt-0'>
          <AdminDesktopHeader />
          <AttributesWorkspace />
        </main>
      </div>
    </div>
  )
}
