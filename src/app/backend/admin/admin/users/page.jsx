'use client';
import AdminUsersPanel from '@/components/admin/AdminUsersPanel';
import AdminRequestsPanel from '@/components/admin/AdminRequestsPanel';
import VendorRequestsPanel from '@/components/admin/VendorRequestsPanel';
import AdminShell from '@/components/admin/AdminShell';

export default function DashboardDemoAdminUsersPage() {
  return (
    <AdminShell>
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Admin</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Users</h1>
          <p className="mt-2 text-sm text-slate-500">Manage admins and internal accounts.</p>
        </div>
        <div className="space-y-6">
          <AdminUsersPanel />
          <AdminRequestsPanel />
          <VendorRequestsPanel />
        </div>
      </div>
    </AdminShell>
  );
}
