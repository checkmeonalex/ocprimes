'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminShell from '@/components/admin/AdminShell';
import InteractiveTrendChart from '@/components/admin/InteractiveTrendChart';
import { DASHBOARD_RANGE_OPTIONS, DEFAULT_DASHBOARD_RANGE } from '@/lib/admin/dashboard-range-config';

/* ─── helpers ─────────────────────────────────────────────── */
const toNum = (v) => { const n = Number(v ?? 0); return Number.isFinite(n) ? n : 0; };
const fmtMoney = (v) => {
  const n = toNum(v);
  try {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
  } catch { return `₦${Math.round(n).toLocaleString()}`; }
};
const fmtCount = (v) => toNum(v).toLocaleString();
const fmtDate = (v) => {
  const d = new Date(String(v || ''));
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-NG', { month: 'short', day: '2-digit', year: 'numeric' });
};
const pctDelta = (cur, prev) => {
  const c = toNum(cur), p = toNum(prev);
  if (!Number.isFinite(c) || !Number.isFinite(p) || p === 0) return null;
  const d = ((c - p) / Math.abs(p)) * 100;
  return { value: Math.abs(d).toFixed(1), up: d >= 0 };
};

/* ─── micro components ────────────────────────────────────── */
function Sk({ className = '' }) {
  return <div className={`animate-pulse rounded bg-slate-100 ${className}`} />;
}

function DeltaBadge({ delta }) {
  if (!delta) return null;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
      delta.up ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'
    }`}>
      {delta.up ? '↑' : '↓'} {delta.value}%
    </span>
  );
}

function KpiCard({ label, description, value, note, delta, isMoney, icon }) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm dark:border-zinc-700/50 dark:bg-[#2c2c2e]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-500 dark:bg-[#3a3a3c] dark:text-zinc-400">
          {icon}
        </div>
        <DeltaBadge delta={delta} />
      </div>
      <p className="mt-2.5 text-[22px] font-bold leading-none tracking-tight text-slate-900 dark:text-white">
        {isMoney ? fmtMoney(value) : fmtCount(value)}
      </p>
      <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</p>
      {description && <p className="mt-0.5 text-[10px] leading-4 text-slate-400 dark:text-slate-500">{description}</p>}
    </article>
  );
}

function SectionCard({ title, aside, children }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-zinc-700/50 dark:bg-[#2c2c2e]">
      <div className="flex items-center justify-between border-b border-slate-50 px-4 py-3 dark:border-zinc-700/50">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</p>
        {aside && <span className="text-[11px] text-slate-400">{aside}</span>}
      </div>
      <div className="p-4">{children}</div>
    </article>
  );
}

function EmptySlate({ icon, text }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
      <span className="text-2xl">{icon}</span>
      <p className="text-xs text-slate-400">{text}</p>
    </div>
  );
}

/* ─── icons ───────────────────────────────────────────────── */
const IcoRevenue = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round" />
  </svg>
);
const IcoOrders = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path d="M8 9h8M8 13h8M8 17h4" strokeLinecap="round" />
  </svg>
);
const IcoProducts = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 3 4 7.5l8 4.5 8-4.5L12 3Z" />
    <path d="M4 7.5V16.5L12 21l8-4.5V7.5" />
  </svg>
);
const IcoCustomers = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </svg>
);

/* ─── page ────────────────────────────────────────────────── */
export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [range, setRange] = useState(DEFAULT_DASHBOARD_RANGE);

  useEffect(() => {
    let dead = false;
    const ctrl = new AbortController();
    setLoading(true);
    setError('');
    fetch(`/api/admin/dashboard?range=${range}`, { credentials: 'include', cache: 'no-store', signal: ctrl.signal })
      .then(r => r.json().then(p => ({ ok: r.ok, p })))
      .then(({ ok, p }) => {
        if (dead) return;
        if (!ok) throw new Error(p?.error || 'Unable to load dashboard.');
        setData(p);
      })
      .catch(e => { if (!dead && e?.name !== 'AbortError') setError(e.message || 'Unable to load dashboard.'); })
      .finally(() => { if (!dead) setLoading(false); });
    return () => { dead = true; ctrl.abort(); };
  }, [range]);

  const stats = data?.stats ?? {};
  const topProducts = Array.isArray(data?.topProducts) ? data.topProducts : [];
  const topSold = Array.isArray(data?.topSoldItems) ? data.topSoldItems : [];
  const labels = Array.isArray(data?.charts?.labels) ? data.charts.labels : [];
  const revCur = Array.isArray(data?.charts?.revenue?.current) ? data.charts.revenue.current : [];
  const revPrev = Array.isArray(data?.charts?.revenue?.previous) ? data.charts.revenue.previous : [];
  const ordCur = Array.isArray(data?.charts?.orders?.current) ? data.charts.orders.current : [];
  const ordPrev = Array.isArray(data?.charts?.orders?.previous) ? data.charts.orders.previous : [];
  const windowLabel = data?.range?.windowLabel || 'Past 30 days';
  const compLabel = data?.range?.comparisonLabel || 'previous period';
  const catInterest = data?.categoryInterest ?? null;
  const topCats = Array.isArray(catInterest?.topCategories) ? catInterest.topCategories : [];

  const kpis = useMemo(() => [
    {
      label: 'Total Sales',
      description: 'Revenue earned this period.',
      isMoney: true,
      icon: <IcoRevenue />,
      ...(stats.revenue ?? {}),
    },
    {
      label: 'Total Orders',
      description: 'Orders placed so far.',
      isMoney: false,
      icon: <IcoOrders />,
      ...(stats.orders ?? {}),
    },
    {
      label: 'Total Products',
      description: 'Live listings in your store.',
      isMoney: false,
      icon: <IcoProducts />,
      ...(stats.products ?? {}),
    },
    {
      label: 'Total Customers',
      description: 'Shoppers with an account.',
      isMoney: false,
      icon: <IcoCustomers />,
      ...(stats.customers ?? {}),
    },
  ], [stats]);

  return (
    <AdminShell bg="bg-slate-50/60">
      <div className="mx-auto w-full max-w-[1280px] space-y-4 pb-16 pt-4">

        {/* ── Header row ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Overview</h1>
            <p className="mt-0.5 text-xs text-slate-400">
              {range === 'all' ? 'Showing your complete store history.' : `Showing data for ${windowLabel.toLowerCase()}.`}
            </p>
          </div>
          <div className="flex items-center gap-0 overflow-x-auto border-b border-slate-200 dark:border-zinc-700/50 sm:gap-1 sm:border-b-0 sm:rounded-full sm:border sm:border-slate-200 sm:bg-white sm:p-1 dark:sm:border-slate-700 dark:sm:bg-slate-900">
            {DASHBOARD_RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setRange(opt.key)}
                className={`relative shrink-0 whitespace-nowrap px-3 py-2 text-[11px] font-semibold transition
                  sm:rounded-full sm:py-1
                  ${range === opt.key
                    ? 'text-slate-900 after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:rounded-full after:bg-slate-900 sm:bg-slate-900 sm:text-white sm:shadow-sm sm:after:hidden dark:text-white dark:sm:bg-slate-700'
                    : 'text-slate-400 hover:text-slate-700 after:hidden dark:text-slate-500 dark:hover:text-slate-300'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-600">{error}</div>
        )}

        {/* ── KPI cards ── */}
        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <article key={i} className="rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm">
                  <Sk className="h-8 w-8 rounded-xl" />
                  <Sk className="mt-3 h-6 w-28" />
                  <Sk className="mt-1.5 h-3 w-20" />
                </article>
              ))
            : kpis.map((kpi) => (
                <KpiCard
                  key={kpi.label}
                  label={kpi.label}
                  description={kpi.description}
                  value={kpi.value}
                  note={kpi.note}
                  delta={pctDelta(kpi.value, kpi.previousValue)}
                  isMoney={kpi.isMoney}
                  icon={kpi.icon}
                />
              ))}
        </section>

        {/* ── Charts row ── */}
        <section className="grid gap-3 lg:grid-cols-[3fr_2fr]">
          {/* Revenue chart */}
          <SectionCard
            title="Revenue"
            aside={
              <span className="flex items-center gap-3">
                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-slate-900" /><span className="text-slate-500">{windowLabel}</span></span>
                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-slate-300" /><span className="text-slate-400">{compLabel}</span></span>
              </span>
            }
          >
            {loading
              ? <Sk className="h-[160px] w-full rounded-xl" />
              : <InteractiveTrendChart labels={labels} currentSeries={revCur} previousSeries={revPrev} currentLabel={windowLabel} previousLabel={compLabel} formatValue={fmtMoney} height={160} />
            }
          </SectionCard>

          {/* Orders chart */}
          <SectionCard
            title="Orders"
            aside={
              <span className="flex items-center gap-3">
                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-slate-900" /><span className="text-slate-500">{windowLabel}</span></span>
                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-slate-300" /><span className="text-slate-400">{compLabel}</span></span>
              </span>
            }
          >
            {loading
              ? <Sk className="h-[160px] w-full rounded-xl" />
              : <InteractiveTrendChart labels={labels} currentSeries={ordCur} previousSeries={ordPrev} currentLabel={windowLabel} previousLabel={compLabel} formatValue={fmtCount} height={160} />
            }
          </SectionCard>
        </section>

        {/* ── Products + Sold items ── */}
        <section className="grid gap-3 lg:grid-cols-[3fr_2fr]">

          {/* Top products table */}
          <article className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-50 px-4 py-3">
              <p className="text-sm font-semibold text-slate-800">Top Products</p>
              <Link href="/admin/products" className="text-[11px] font-medium text-slate-400 hover:text-slate-700 transition">View all →</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="border-b border-slate-50 bg-slate-50/60">
                    <th className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Product</th>
                    <th className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Added</th>
                    <th className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Price</th>
                    <th className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400 text-right">Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                  {loading
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <tr key={i}>
                          <td className="px-4 py-2.5"><Sk className="h-3 w-32" /></td>
                          <td className="px-4 py-2.5"><Sk className="h-3 w-20" /></td>
                          <td className="px-4 py-2.5"><Sk className="h-3 w-16" /></td>
                          <td className="px-4 py-2.5"><Sk className="h-3 w-20 ml-auto" /></td>
                        </tr>
                      ))
                    : topProducts.length > 0
                      ? topProducts.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/60 transition">
                            <td className="px-4 py-2.5 font-medium text-slate-800">{item.name}</td>
                            <td className="px-4 py-2.5 text-slate-400">{fmtDate(item.dateAdded)}</td>
                            <td className="px-4 py-2.5 text-slate-600">{fmtMoney(item.price)}</td>
                            <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{fmtMoney(item.earning)}</td>
                          </tr>
                        ))
                      : (
                          <tr>
                            <td colSpan="4" className="px-4 py-8 text-center text-xs text-slate-400">No product sales yet.</td>
                          </tr>
                        )}
                </tbody>
              </table>
            </div>
          </article>

          {/* Top sold items */}
          <SectionCard title="Best Sellers" aside="Last 30 days">
            {loading
              ? <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex justify-between"><Sk className="h-2.5 w-28" /><Sk className="h-2.5 w-8" /></div>
                      <Sk className="h-1.5 w-full rounded-full" />
                    </div>
                  ))}</div>
              : topSold.length > 0
                ? <div className="space-y-3">
                    {topSold.map((item, i) => (
                      <div key={item.id ?? i}>
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="min-w-0 truncate text-xs font-medium text-slate-700">{item.name}</span>
                          <span className="shrink-0 text-[11px] font-semibold text-slate-500">{fmtCount(item.quantity)}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-1.5 rounded-full bg-slate-800 transition-all duration-500"
                            style={{ width: `${Math.max(3, Math.min(100, toNum(item.percent)))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                : <EmptySlate icon="📦" text="Best-selling items appear once paid orders flow in." />
            }
          </SectionCard>
        </section>

        {/* ── Category interest ── */}
        {catInterest && (
          <section className="grid gap-3 lg:grid-cols-[3fr_2fr]">
            {/* Summary cards */}
            <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Category demand signals</p>
                  <p className="text-[11px] text-slate-400">Shoppers waiting on empty categories</p>
                </div>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">{windowLabel}</span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {[
                  { label: 'Interested', value: catInterest.totalInterested, sub: 'Unique shoppers' },
                  { label: 'New this window', value: catInterest.newInterested, sub: `${fmtCount(catInterest.previousInterested)} prior` },
                  { label: 'Categories', value: catInterest.categoriesTracked, sub: 'Collecting signals' },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl bg-slate-50 px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{s.label}</p>
                    <p className="mt-1 text-xl font-bold text-slate-900">{fmtCount(s.value)}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">{s.sub}</p>
                  </div>
                ))}
              </div>
            </article>

            {/* Top categories */}
            <SectionCard title="Most requested" aside="Unique shoppers">
              {topCats.length > 0
                ? <div className="space-y-3">
                    {topCats.map((item) => {
                      const pct = topCats[0]?.totalInterested > 0
                        ? Math.max(4, Math.round((toNum(item.totalInterested) / toNum(topCats[0].totalInterested)) * 100))
                        : 0;
                      return (
                        <div key={item.categoryId ?? item.categoryName}>
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <span className="truncate text-xs font-medium text-slate-700">{item.categoryName}</span>
                            <span className="shrink-0 text-[11px] font-semibold text-slate-500">{fmtCount(item.totalInterested)}</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-1.5 rounded-full transition-all duration-500"
                              style={{
                                width: `${pct}%`,
                                background: 'linear-gradient(90deg,#e1d083,#c0b8ad,#966d10)',
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                : <EmptySlate icon="🏷️" text="Category demand will appear here once shoppers start requesting." />
              }
            </SectionCard>
          </section>
        )}

        {/* ── Quick nav shortcuts ── */}
        <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {[
            { label: 'New Order', sub: 'View all orders', href: '/admin/orders', icon: <IcoOrders /> },
            { label: 'Add Product', sub: 'Create new listing', href: '/admin/products', icon: <IcoProducts /> },
            { label: 'Customers', sub: 'View all accounts', href: '/admin/customers', icon: <IcoCustomers /> },
            { label: 'Store Front', sub: 'Manage storefront', href: '/admin/store-front', icon: (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3.5 10.5h17M5 10.5V19h14v-8.5M4.5 6h15l1 4.5h-17Z" />
              </svg>
            )},
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm transition hover:border-slate-200 hover:shadow-md dark:border-zinc-700/50 dark:bg-[#2c2c2e] dark:hover:border-slate-700"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                {item.icon}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-800">{item.label}</p>
                <p className="truncate text-[10px] text-slate-400">{item.sub}</p>
              </div>
            </Link>
          ))}
        </section>

      </div>
    </AdminShell>
  );
}
