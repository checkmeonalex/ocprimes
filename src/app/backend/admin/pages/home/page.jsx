import { requireAdminOrPublicPage } from '@/lib/auth/require-page-access'
import AdminSidebar from '@/components/AdminSidebar'
import AdminDesktopHeader from '@/components/admin/AdminDesktopHeader';
import HomePageEditorClient from './components/HomePageEditorClient'

export default async function AdminHomePageRoute() {
  await requireAdminOrPublicPage('pages', '/backend/admin/pages/home')

  return (
    <div className='flex h-screen overflow-hidden bg-slate-50 text-slate-900'>
      <AdminSidebar />
      <main className='flex flex-1 flex-col overflow-hidden'>
        <AdminDesktopHeader />
        <div className='flex-1 overflow-y-auto pb-8 sm:px-6 lg:px-10'>
          <HomePageEditorClient />
        </div>
      </main>
    </div>
  )
}
