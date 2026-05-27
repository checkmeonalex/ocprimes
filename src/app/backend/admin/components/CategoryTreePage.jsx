'use client';
import AdminShell from '@/components/admin/AdminShell';
import CategoryTreeManager from './CategoryTreeManager';

function CategoryTreePage() {
  return (
    <AdminShell>
      <CategoryTreeManager />
    </AdminShell>
  );
}

export default CategoryTreePage;
