'use client';
import { useEffect, useState } from 'react';
import AdminBrandsManagementPage from './AdminBrandsManagementPage';
import TaxonomyPage from '../components/TaxonomyPage';

export default function AdminBrandsPage() {
  const [role, setRole] = useState('unknown');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadRole = async () => {
      try {
        const response = await fetch('/api/auth/role', {
          method: 'GET',
          cache: 'no-store',
          credentials: 'include',
        });
        const payload = await response.json().catch(() => null);
        if (!active) return;
        if (!response.ok) {
          setRole('unknown');
          return;
        }
        setRole(payload?.role === 'admin' || payload?.role === 'vendor' ? payload.role : 'unknown');
      } catch {
        if (active) setRole('unknown');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void loadRole();
    return () => {
      active = false;
    };
  }, []);

  if (isLoading) {
    return <div className="px-4 py-8 text-sm text-slate-500">Loading brands...</div>;
  }

  if (role === 'admin') {
    return <AdminBrandsManagementPage />;
  }

  return (
    <TaxonomyPage
      title="Brands"
      description="Create and manage internal product brands."
      endpoint="/api/admin/brands"
      singularLabel="brand"
      pluralLabel="brands"
    />
  );
}
