'use client';

import AdminSidebar from '@/components/AdminSidebar';
import AdminDesktopHeader from '@/components/admin/AdminDesktopHeader';

const KPI_CARDS = [
  { label: 'Total Sales', value: '700', note: '102 vs last month' },
  { label: 'Total Product', value: '398', note: '400 vs last month' },
  { label: 'Total Order', value: '$1,287', note: '$3,605 vs last month' },
  { label: 'Total Customer', value: '700', note: '102 vs last month' },
];

const TOP_PRODUCTS = [
  { name: 'Apple Watch Ultra', date: '12/01/2026', price: '$125', earning: '$22,987' },
  { name: 'Air Pods Pro', date: '12/01/2026', price: '$500', earning: '$65,658' },
  { name: 'Polo Shirt', date: '12/01/2026', price: '$125', earning: '$12,658' },
];

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/80 ${className}`} />;
}

function DashboardStatCard({ label, value, note }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M7 17 17 7" />
          <path d="M9 7h8v8" />
        </svg>
      </div>
      <p className="mt-4 text-[1.75rem] font-semibold leading-none text-slate-900">{value}</p>
      <p className="mt-2 text-xs text-slate-400">{note}</p>
    </article>
  );
}

function WooCommerceDashboardPage() {
  const isLineChartConnected = false;
  const isBarChartConnected = false;
  const isTopSoldConnected = false;

  return (
    <div className="min-h-screen bg-white overflow-x-clip text-slate-900">
      <div className="flex min-h-screen">
        <AdminSidebar />
        <main className="flex-1 px-4 pb-6 sm:px-6 lg:px-10">
                  <AdminDesktopHeader />
          <div className="mx-auto w-full max-w-[1250px] px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-10">
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {KPI_CARDS.map((card) => (
            <DashboardStatCard key={card.label} label={card.label} value={card.value} note={card.note} />
          ))}
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[2fr_1fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-base font-semibold text-slate-900">Product Views</p>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-lime-400" />Current Year</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" />Last Year</span>
              </div>
            </div>
            {isLineChartConnected ? (
              <svg viewBox="0 0 860 280" className="h-[280px] w-full">
                <path d="M0 40h860M0 95h860M0 150h860M0 205h860M0 260h860" stroke="#eef2f7" strokeWidth="1" />
                <polyline fill="none" stroke="#a3e635" strokeWidth="3" points="0,92 120,120 240,200 360,142 480,72 600,92 720,120 860,165" />
                <polyline fill="none" stroke="#facc15" strokeWidth="3" points="0,165 120,125 240,85 360,170 480,165 600,220 720,170 860,142" />
              </svg>
            ) : (
              <div className="space-y-3">
                <Skeleton className="h-[220px] w-full" />
                <div className="grid grid-cols-6 gap-2">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <Skeleton key={`line-chart-axis-${idx}`} className="h-3 w-full" />
                  ))}
                </div>
              </div>
            )}
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-base font-semibold text-slate-900">Product Views</p>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-lime-400" />This Week</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" />Last Week</span>
              </div>
            </div>
            {isBarChartConnected ? (
              <div className="grid h-[280px] grid-cols-7 items-end gap-3">
                {[62, 45, 70, 52, 75, 60, 68].map((left, idx) => (
                  <div key={`bar-${idx}`} className="grid grid-cols-2 items-end gap-1">
                    <div className="rounded-t-md bg-lime-400" style={{ height: `${left}%` }} />
                    <div className="rounded-t-md bg-amber-400" style={{ height: `${Math.max(28, left - 15)}%` }} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <Skeleton className="h-[220px] w-full" />
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 7 }).map((_, idx) => (
                    <Skeleton key={`bar-chart-axis-${idx}`} className="h-3 w-full" />
                  ))}
                </div>
              </div>
            )}
          </article>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[2fr_1fr]">
          <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="text-base font-semibold text-slate-900">Top Product</p>
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 6h16M7 12h10M10 18h4" />
              </svg>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Date Added</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Total Earning</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {TOP_PRODUCTS.map((item) => (
                    <tr key={item.name}>
                      <td className="px-4 py-3 font-medium text-slate-800">{item.name}</td>
                      <td className="px-4 py-3 text-slate-500">{item.date}</td>
                      <td className="px-4 py-3 text-slate-700">{item.price}</td>
                      <td className="px-4 py-3 text-slate-700">{item.earning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-base font-semibold text-slate-900">Top Sold Item</p>
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 6h16M7 12h10M10 18h4" />
              </svg>
            </div>

            {isTopSoldConnected ? (
              <div className="space-y-3 text-sm">
                {[
                  ['Watch', 60],
                  ['AirPods', 75],
                  ['Polo Shirt', 60],
                  ['Cap', 60],
                  ['Shoe', 50],
                ].map(([name, percent]) => (
                  <div key={name}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-medium text-slate-700">{name}</span>
                      <span className="text-slate-500">{percent}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-lime-400" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div key={`sold-skeleton-${idx}`} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-3 w-10" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>
          </div>
        </main>
      </div>
    </div>
  );
}

export default WooCommerceDashboardPage;
