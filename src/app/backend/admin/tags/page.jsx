'use client';
import AdminSidebar from '@/components/AdminSidebar';
import AdminDesktopHeader from '@/components/admin/AdminDesktopHeader';
import TagsCompactManager from './TagsCompactManager';

export default function AdminTagsPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <div className="sticky top-0 self-start h-screen">
          <AdminSidebar />
        </div>
        <main className="flex-1 px-4 pb-8 sm:px-6 lg:px-10">
          <AdminDesktopHeader />
          <TagsCompactManager />
        </main>
      </div>
    </div>
  );
}
