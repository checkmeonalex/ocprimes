'use client';
import AdminSidebar from '@/components/AdminSidebar';

function AdminPlaceholderPage({ title, description }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <div className="sticky top-0 self-start h-screen">
          <AdminSidebar />
        </div>

        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
          <div className="mx-auto w-full max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">Admin</p>
            <h1 className="mt-3 text-2xl font-semibold text-slate-900">{title}</h1>
            <p className="mt-3 text-sm text-slate-500">{description}</p>
          </div>
        </main>
      </div>
    </div>
  );
}

export default AdminPlaceholderPage;
