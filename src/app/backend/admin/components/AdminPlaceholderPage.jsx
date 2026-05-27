'use client';
import AdminShell from '@/components/admin/AdminShell';

function AdminPlaceholderPage({ title, description }) {
  return (
    <AdminShell>
      <div className="mx-auto w-full max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">Admin</p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-3 text-sm text-slate-500">{description}</p>
      </div>
    </AdminShell>
  );
}

export default AdminPlaceholderPage;
