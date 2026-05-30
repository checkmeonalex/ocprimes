'use client'

import AdminShell from '@/components/admin/AdminShell'
import HomePageAdminCard from './components/HomePageAdminCard'

export default function PagesIndexPage() {
  return (
    <AdminShell>
      <div className="px-4 pt-5 pb-12 sm:px-0">
        <HomePageAdminCard />
      </div>
    </AdminShell>
  )
}
