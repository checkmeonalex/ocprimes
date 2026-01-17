import AdminShell from '../_components/AdminShell'
import { products } from '../_lib/mockData.ts'

export default function AdminProductsPage() {
  return (
    <AdminShell>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>Products</p>
          <h1 className='mt-2 text-2xl font-semibold text-slate-900'>Catalog management</h1>
          <p className='mt-2 text-sm text-slate-500'>Edit listings, inventory, and pricing.</p>
        </div>
        <div className='flex flex-wrap items-center gap-3'>
          <button className='rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600'>
            Bulk actions
          </button>
          <button className='rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white'>
            Add product
          </button>
        </div>
      </div>

      <div className='mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]'>
        <div className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div className='flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs text-slate-500'>
              <span className='h-2 w-2 rounded-full bg-emerald-500' />
              120 Active products
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              <button className='rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600'>
                Filters
              </button>
              <button className='rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600'>
                Sort
              </button>
              <button className='rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600'>
                Export
              </button>
            </div>
          </div>

          <div className='mt-4 space-y-3'>
            {products.map((product) => (
              <div
                key={product.id}
                className='flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/60 px-4 py-3'
              >
                <div className='flex items-center gap-4'>
                  <div className='h-14 w-14 rounded-2xl bg-slate-100' />
                  <div>
                    <p className='text-sm font-semibold text-slate-900'>{product.name}</p>
                    <p className='text-xs text-slate-400'>SKU: {product.sku}</p>
                  </div>
                </div>
                <div className='text-sm text-slate-500'>{product.price}</div>
                <div className='text-xs text-slate-500'>{product.stock}</div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    product.status === 'Active'
                      ? 'bg-emerald-100 text-emerald-600'
                      : product.status === 'Draft'
                        ? 'bg-amber-100 text-amber-600'
                        : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {product.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className='space-y-4'>
          <div className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
            <p className='text-xs font-semibold text-slate-500'>Weekly highlights</p>
            <div className='mt-4 space-y-3 text-sm text-slate-600'>
              <div className='rounded-2xl border border-slate-200/60 px-4 py-3'>
                Top category: Footwear
              </div>
              <div className='rounded-2xl border border-slate-200/60 px-4 py-3'>
                Return rate down 8%
              </div>
              <div className='rounded-2xl border border-slate-200/60 px-4 py-3'>
                12 products need images
              </div>
            </div>
          </div>
          <div className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
            <p className='text-xs font-semibold text-slate-500'>Recent reviews</p>
            <div className='mt-4 space-y-3 text-sm text-slate-600'>
              <div className='rounded-2xl border border-slate-200/60 px-4 py-3'>
                “Great fit and fast delivery.”
              </div>
              <div className='rounded-2xl border border-slate-200/60 px-4 py-3'>
                “Packaging could improve.”
              </div>
              <div className='rounded-2xl border border-slate-200/60 px-4 py-3'>
                “Sizing guide helped a lot.”
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  )
}
