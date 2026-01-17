import AdminShell from '../_components/AdminShell'
import { dashboardComments, dashboardStats, recentOrders, storeProfile } from '../_lib/mockData.ts'

export default function AdminDashboardPage() {
  return (
    <AdminShell>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div className='flex w-full max-w-md items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500 shadow-sm sm:w-auto'>
          <svg viewBox='0 0 24 24' className='h-4 w-4 text-slate-400' fill='none' stroke='currentColor' strokeWidth='2'>
            <circle cx='11' cy='11' r='6' />
            <path d='m15.5 15.5 4 4' />
          </svg>
          <input
            className='w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none sm:w-64'
            placeholder='Search dashboard'
          />
        </div>
        <div className='flex items-center gap-4'>
          <div className='text-right text-xs text-slate-500'>
            <p className='font-semibold text-slate-900'>{storeProfile.balance}</p>
            Current balance
          </div>
          <div className='flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600'>
            <span className='h-7 w-7 rounded-full bg-slate-200' />
            {storeProfile.name}
          </div>
        </div>
      </div>

      <div className='mt-8 flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h1 className='text-2xl font-semibold text-slate-900'>Dashboard</h1>
          <p className='text-sm text-slate-500'>Daily health check for OcPrimes operations.</p>
        </div>
        <div className='flex flex-wrap items-center gap-3'>
          <button className='rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600'>
            August 2024
          </button>
          <button className='rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600'>
            Manage widgets
          </button>
          <button className='flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm'>
            +
          </button>
        </div>
      </div>

      <div className='mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        {dashboardStats.map((stat) => (
          <div key={stat.label} className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
            <div className='flex items-center justify-between text-xs text-slate-500'>
              <span>{stat.label}</span>
              <span className='text-emerald-500'>▲ {stat.change}</span>
            </div>
            <p className='mt-2 text-lg font-semibold text-slate-900'>{stat.value}</p>
            <div className='mt-3 h-12 w-full rounded-xl bg-gradient-to-r from-blue-100 via-slate-100 to-transparent' />
          </div>
        ))}
      </div>

      <div className='mt-6 grid gap-4 xl:grid-cols-[2fr_1fr]'>
        <div className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div>
              <p className='text-xs font-semibold text-slate-500'>Weekly revenue</p>
              <div className='mt-2 flex items-baseline gap-3'>
                <span className='text-xl font-semibold text-slate-900'>$25,900</span>
                <span className='text-xs text-emerald-500'>▲ 2.8%</span>
              </div>
            </div>
            <div className='text-xs text-slate-500'>Total earnings</div>
          </div>
          <div className='mt-4 h-48 rounded-2xl bg-gradient-to-br from-slate-50 via-white to-slate-100' />
        </div>
        <div className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
          <p className='text-xs font-semibold text-slate-500'>Top selling product</p>
          <div className='mt-4 flex items-center justify-center rounded-2xl bg-blue-50 p-6'>
            <div className='flex h-32 w-32 items-center justify-center rounded-full bg-blue-100 text-blue-500'>
              OcPrimes
            </div>
          </div>
          <div className='mt-4 text-center'>
            <p className='text-sm font-semibold text-slate-900'>OcPrime Runner</p>
            <p className='text-xs text-slate-500'>$129.00</p>
          </div>
        </div>
      </div>

      <div className='mt-6 grid gap-4 lg:grid-cols-3'>
        <div className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
          <p className='text-xs font-semibold text-slate-500'>Top regions by sales</p>
          <div className='mt-4 h-40 rounded-2xl bg-slate-100' />
        </div>
        <div className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
          <p className='text-xs font-semibold text-slate-500'>Traffic sources</p>
          <div className='mt-4 h-40 rounded-2xl bg-gradient-to-br from-fuchsia-100 via-blue-100 to-slate-100' />
        </div>
        <div className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
          <div className='flex items-center justify-between gap-3'>
            <p className='text-xs font-semibold text-slate-500'>Latest comments</p>
            <button className='text-[11px] font-semibold text-slate-400 transition hover:text-slate-600'>
              View all
            </button>
          </div>
          <div className='mt-4 space-y-3'>
            {dashboardComments.map((comment) => (
              <div key={comment.id} className='flex items-start gap-3'>
                <span className='h-9 w-9 rounded-full bg-slate-200' />
                <div>
                  <p className='text-xs font-semibold text-slate-700'>{comment.name}</p>
                  <p className='text-[11px] text-slate-400'>{comment.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className='mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
        <div className='flex items-center justify-between gap-3'>
          <div>
            <p className='text-xs font-semibold text-slate-500'>Latest orders</p>
            <p className='text-sm text-slate-500'>Recent activity across the store.</p>
          </div>
          <button className='rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600'>
            Export
          </button>
        </div>
        <div className='mt-4 space-y-3'>
          {recentOrders.map((order) => (
            <div
              key={order.id}
              className='flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/60 px-4 py-3 text-sm'
            >
              <div>
                <p className='font-semibold text-slate-900'>{order.customer}</p>
                <p className='text-xs text-slate-400'>Order {order.id}</p>
              </div>
              <div className='text-xs text-slate-500'>Total: {order.total}</div>
              <span className='rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white'>
                {order.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  )
}
