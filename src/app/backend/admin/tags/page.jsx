'use client';
import AdminShell from '@/components/admin/AdminShell';
import TagsCompactManager from './TagsCompactManager';

export default function AdminTagsPage() {
  return (
    <AdminShell>
      <TagsCompactManager />
    </AdminShell>
  );
}
