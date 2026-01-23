'use client';
import AdminUsersPanel from '@/components/admin/AdminUsersPanel';
import AdminRequestsPanel from '@/components/admin/AdminRequestsPanel';
import AdminSidebar from '@/components/AdminSidebar';

export default function DashboardDemoAdminUsersPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <div className="sticky top-0 self-start h-screen">
          <AdminSidebar />
        </div>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10">
          <div className="mx-auto w-full max-w-6xl">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Admin
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-900">
                Users
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Manage admins and internal accounts.
              </p>
            </div>
            <div className="space-y-6">
              <AdminUsersPanel />
              <AdminRequestsPanel />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
