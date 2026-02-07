'use client'

import AdminSidebar from '@/components/AdminSidebar'
import HomePageAdminCard from './components/HomePageAdminCard'

export default function PagesIndexPage() {
  return (
    <div className='min-h-screen bg-slate-50 text-slate-900'>
      <div className='flex min-h-screen'>
        <div className='sticky top-0 self-start h-screen'>
          <AdminSidebar />
        </div>

        <main className='flex-1 px-4 py-8 sm:px-6 lg:px-10'>
          <HomePageAdminCard />
        </main>
      </div>
    </div>
  )
}
