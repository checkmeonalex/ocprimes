'use client';
import { Suspense } from 'react';
import OrdersPage from '../OrdersPage';

export default function DashboardDemoOrdersPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <OrdersPage />
    </Suspense>
  );
}
