import AdminShell from '../_components/AdminShell'
import { mediaItems } from '../_lib/mockData.ts'

export default function AdminLibraryPage() {
  return (
    <AdminShell>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>Media</p>
          <h1 className='mt-2 text-2xl font-semibold text-slate-900'>Asset library</h1>
          <p className='mt-2 text-sm text-slate-500'>Organize product photos, banners, and campaigns.</p>
        </div>
        <div className='flex flex-wrap items-center gap-3'>
          <button className='rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600'>
            Upload
          </button>
          <button className='rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white'>
            Create folder
          </button>
        </div>
      </div>

      <div className='mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div className='flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs text-slate-500'>
            <span className='h-2 w-2 rounded-full bg-blue-500' />
            12 assets synced
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <button className='rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600'>
              All images
            </button>
            <button className='rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600'>
              Unattached
            </button>
            <button className='rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600'>
              Stale
            </button>
          </div>
        </div>

        <div className='mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          {mediaItems.map((item) => (
            <div key={item.id} className='rounded-2xl border border-slate-200/60 bg-slate-50 p-3'>
              <div className='h-32 rounded-xl bg-gradient-to-br from-slate-200 via-slate-100 to-white' />
              <div className='mt-3'>
                <p className='text-sm font-semibold text-slate-900'>{item.title}</p>
                <p className='text-xs text-slate-500'>{item.size}</p>
              </div>
              <button className='mt-3 w-full rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600'>
                View details
              </button>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  )
}
