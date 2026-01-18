import AdminShell from '../_components/AdminShell'
import AdminRequestsPanel from '@/components/admin/AdminRequestsPanel'
import AdminUsersPanel from '@/components/admin/AdminUsersPanel'

export default function AdminCustomersPage() {
  return (
    <AdminShell>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>Customers</p>
          <h1 className='mt-2 text-2xl font-semibold text-slate-900'>Customer profiles</h1>
          <p className='mt-2 text-sm text-slate-500'>Track loyalty, spend, and outreach.</p>
        </div>
        <button className='rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold text-white'>
          Add customer
        </button>
      </div>

      <div className='mt-6'>
        <AdminUsersPanel />
      </div>

      <div className='mt-6'>
        <AdminRequestsPanel />
      </div>
    </AdminShell>
  )
}
