'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import AdminDesktopHeader from '@/components/admin/AdminDesktopHeader';
import InteractiveTrendChart from '@/components/admin/InteractiveTrendChart';
import { DASHBOARD_RANGE_OPTIONS, DEFAULT_DASHBOARD_RANGE } from '@/lib/admin/dashboard-range-config';

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/80 ${className}`} />;
}

const formatDashboardMoney = (value) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return '₦0';
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `₦${Math.round(amount).toLocaleString()}`;
  }
};

const formatDashboardCount = (value) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return '0';
  return amount.toLocaleString();
};

const formatProductDate = (value) => {
  const timestamp = new Date(String(value || '')).getTime();
  if (Number.isNaN(timestamp)) return '—';
  return new Date(timestamp).toLocaleDateString('en-NG', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
};

function DashboardStatCard({ label, value, note, isMoney = false }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M7 17 17 7" />
          <path d="M9 7h8v8" />
        </svg>
      </div>
      <p className="mt-4 text-[1.75rem] font-semibold leading-none text-slate-900">
        {isMoney ? formatDashboardMoney(value) : formatDashboardCount(value)}
      </p>
      <p className="mt-2 text-xs text-slate-400">{note}</p>
    </article>
  );
}

function EmptyState({ title, copy }) {
  return (
    <div className="flex h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 text-center">
      <p className="text-base font-semibold text-slate-700">{title}</p>
      <p className="mt-2 max-w-sm text-sm text-slate-500">{copy}</p>
    </div>
  );
}

function DashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRange, setSelectedRange] = useState(DEFAULT_DASHBOARD_RANGE);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const loadDashboard = async () => {
      setIsLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ range: selectedRange });
        const response = await fetch(`/api/admin/dashboard?${params.toString()}`, {
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error || 'Unable to load dashboard.');
        }
        if (!cancelled) {
          setDashboard(payload);
        }
      } catch (err) {
        if (!cancelled && err?.name !== 'AbortError') {
          setError(err?.message || 'Unable to load dashboard.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [selectedRange]);

  const statCards = useMemo(() => {
    if (!dashboard?.stats) return [];
    return [
      { ...dashboard.stats.revenue, isMoney: true },
      { ...dashboard.stats.products, isMoney: false },
      { ...dashboard.stats.orders, isMoney: false },
      { ...dashboard.stats.customers, isMoney: false },
    ];
  }, [dashboard]);

  const topProducts = Array.isArray(dashboard?.topProducts) ? dashboard.topProducts : [];
  const topSoldItems = Array.isArray(dashboard?.topSoldItems) ? dashboard.topSoldItems : [];
  const chartLabels = Array.isArray(dashboard?.charts?.labels) ? dashboard.charts.labels : [];
  const revenueCurrent = Array.isArray(dashboard?.charts?.revenue?.current) ? dashboard.charts.revenue.current : [];
  const revenuePrevious = Array.isArray(dashboard?.charts?.revenue?.previous) ? dashboard.charts.revenue.previous : [];
  const ordersCurrent = Array.isArray(dashboard?.charts?.orders?.current) ? dashboard.charts.orders.current : [];
  const ordersPrevious = Array.isArray(dashboard?.charts?.orders?.previous) ? dashboard.charts.orders.previous : [];
  const activeWindowLabel = dashboard?.range?.windowLabel || 'Past 30 days';
  const comparisonLabel = dashboard?.range?.comparisonLabel || 'previous period';

  return (
    <div className="min-h-screen overflow-x-clip bg-white text-slate-900">
      <div className="flex min-h-screen">
        <AdminSidebar />
        <main className="flex-1 px-4 pb-6 sm:px-6 lg:px-10">
          <AdminDesktopHeader />
          <div className="mx-auto w-full max-w-[1250px] px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-10">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Live operational overview for {activeWindowLabel.toLowerCase()}.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {DASHBOARD_RANGE_OPTIONS.map((option) => {
                  const isActive = selectedRange === option.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setSelectedRange(option.key)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        isActive
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {error ? (
              <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {isLoading
                ? Array.from({ length: 4 }).map((_, index) => (
                    <article key={`dashboard-kpi-${index}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="mt-4 h-10 w-32" />
                      <Skeleton className="mt-2 h-3 w-40" />
                    </article>
                  ))
                : statCards.map((card) => (
                    <DashboardStatCard
                      key={card.label}
                      label={card.label}
                      value={card.value}
                      note={card.note}
                      isMoney={card.isMoney}
                    />
                  ))}
            </section>

            <section className="mt-4 grid gap-4 xl:grid-cols-[2fr_1fr]">
              <article className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-base font-semibold text-slate-900">Revenue</p>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-black" />
                      This Week
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-slate-300" />
                      Previous Week
                    </span>
                  </div>
                </div>
                {isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-[220px] w-full" />
                    <div className="grid grid-cols-6 gap-2">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <Skeleton key={`revenue-axis-${index}`} className="h-3 w-full" />
                      ))}
                    </div>
                  </div>
                ) : (
                  <InteractiveTrendChart
                    labels={chartLabels}
                    currentSeries={revenueCurrent}
                    previousSeries={revenuePrevious}
                    currentLabel={activeWindowLabel}
                    previousLabel={comparisonLabel}
                    formatValue={formatDashboardMoney}
                  />
                )}
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-base font-semibold text-slate-900">Orders</p>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-black" />
                      This Week
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-slate-300" />
                      Previous Week
                    </span>
                  </div>
                </div>
                {isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-[220px] w-full" />
                    <div className="grid grid-cols-7 gap-2">
                      {Array.from({ length: 7 }).map((_, index) => (
                        <Skeleton key={`orders-axis-${index}`} className="h-3 w-full" />
                      ))}
                    </div>
                  </div>
                ) : (
                  <InteractiveTrendChart
                    labels={chartLabels}
                    currentSeries={ordersCurrent}
                    previousSeries={ordersPrevious}
                    currentLabel={activeWindowLabel}
                    previousLabel={comparisonLabel}
                    formatValue={formatDashboardCount}
                  />
                )}
              </article>
            </section>

            <section className="mt-4 grid gap-4 xl:grid-cols-[2fr_1fr]">
              <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <p className="text-base font-semibold text-slate-900">Top Products</p>
                  <span className="text-xs font-medium text-slate-400">Last 30 days</span>
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
                      {isLoading ? (
                        Array.from({ length: 4 }).map((_, index) => (
                          <tr key={`top-product-skeleton-${index}`}>
                            <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                            <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                            <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                            <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                          </tr>
                        ))
                      ) : topProducts.length > 0 ? (
                        topProducts.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-3 font-medium text-slate-800">{item.name}</td>
                            <td className="px-4 py-3 text-slate-500">{formatProductDate(item.dateAdded)}</td>
                            <td className="px-4 py-3 text-slate-700">{formatDashboardMoney(item.price)}</td>
                            <td className="px-4 py-3 text-slate-700">{formatDashboardMoney(item.earning)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="px-4 py-8 text-center text-sm text-slate-500">
                            No product sales yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-base font-semibold text-slate-900">Top Sold Items</p>
                  <span className="text-xs font-medium text-slate-400">Last 30 days</span>
                </div>

                {isLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div key={`sold-skeleton-${index}`} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Skeleton className="h-3 w-28" />
                          <Skeleton className="h-3 w-10" />
                        </div>
                        <Skeleton className="h-2 w-full rounded-full" />
                      </div>
                    ))}
                  </div>
                ) : topSoldItems.length > 0 ? (
                  <div className="space-y-3 text-sm">
                    {topSoldItems.map((item) => (
                      <div key={item.id}>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="min-w-0 flex-1 break-words font-medium leading-5 text-slate-700">
                            {item.name}
                          </span>
                          <span className="ml-3 shrink-0 text-slate-500">
                            {formatDashboardCount(item.quantity)}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-2 rounded-full bg-black"
                            style={{ width: `${Math.max(0, Math.min(100, Number(item.percent || 0)))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="Nothing sold yet"
                    copy="Your best-selling items will appear here once paid orders start flowing in."
                  />
                )}
              </article>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

export default DashboardPage;
