import AdminShell from '../_components/AdminShell'
import { sizeGuides } from '../_lib/mockData.ts'

export default function AdminSizeGuidesPage() {
  return (
    <AdminShell>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>Size Guides</p>
          <h1 className='mt-2 text-2xl font-semibold text-slate-900'>Sizing tables</h1>
          <p className='mt-2 text-sm text-slate-500'>Maintain sizing guidance across categories.</p>
        </div>
        <button className='rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold text-white'>
          Create guide
        </button>
      </div>

      <div className='mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]'>
        <div className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
          <div className='flex items-center justify-between'>
            <p className='text-xs font-semibold text-slate-500'>Published guides</p>
            <button className='text-xs font-semibold text-slate-400'>Manage categories</button>
          </div>
          <div className='mt-4 space-y-3'>
            {sizeGuides.map((guide) => (
              <div
                key={guide.id}
                className='flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/60 px-4 py-3'
              >
                <div>
                  <p className='text-sm font-semibold text-slate-900'>{guide.title}</p>
                  <p className='text-xs text-slate-500'>{guide.category}</p>
                </div>
                <div className='text-xs text-slate-400'>Updated {guide.updated}</div>
                <button className='rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600'>
                  Edit
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className='space-y-4'>
          <div className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
            <p className='text-xs font-semibold text-slate-500'>Default table</p>
            <div className='mt-4 overflow-hidden rounded-2xl border border-slate-200/60'>
              <table className='w-full text-left text-xs text-slate-600'>
                <thead className='bg-slate-50 text-[11px] uppercase text-slate-400'>
                  <tr>
                    <th className='px-3 py-2'>Size</th>
                    <th className='px-3 py-2'>Chest</th>
                    <th className='px-3 py-2'>Length</th>
                  </tr>
                </thead>
                <tbody>
                  {['S', 'M', 'L', 'XL'].map((size) => (
                    <tr key={size} className='border-t border-slate-200/60'>
                      <td className='px-3 py-2 font-semibold'>{size}</td>
                      <td className='px-3 py-2'>32-36</td>
                      <td className='px-3 py-2'>24-27</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
            <p className='text-xs font-semibold text-slate-500'>Notes</p>
            <textarea
              rows={6}
              placeholder='Add general sizing notes for the team...'
              className='mt-3 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700'
            />
          </div>
        </div>
      </div>
    </AdminShell>
  )
}
