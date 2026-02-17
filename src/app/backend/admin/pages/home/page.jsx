import { redirect } from 'next/navigation'
import { requireDashboardAccess } from '@/lib/auth/dashboard-access'
import AdminSidebar from '@/components/AdminSidebar'
import AdminDesktopHeader from '@/components/admin/AdminDesktopHeader';
import HomePageEditorRedirect from '../components/HomePageEditorRedirect'

export default async function AdminHomePageRoute() {
  const { role } = await requireDashboardAccess('/backend/admin/pages/home')
  if (role !== 'admin') {
    redirect('/backend/admin/dashboard')
  }

  return (
    <div className='min-h-screen bg-slate-50 text-slate-900'>
      <div className='flex min-h-screen'>
        <div className='sticky top-0 self-start h-screen'>
          <AdminSidebar />
        </div>

        <main className='flex-1 px-4 py-8 sm:px-6 lg:px-10'>
                  <AdminDesktopHeader />
          <HomePageEditorRedirect />
        </main>
      </div>
    </div>
  )
}
