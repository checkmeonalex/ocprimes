'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminBrandsManagementPage from './AdminBrandsManagementPage';
import TaxonomyPage from '../components/TaxonomyPage';

export default function AdminBrandsPage() {
  const router = useRouter();
  const [role, setRole] = useState('unknown');
  const [isPublic, setIsPublic] = useState(false);
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
        setIsPublic(Array.isArray(payload?.public_nav_keys) && payload.public_nav_keys.includes('brands'));
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

  useEffect(() => {
    if (isLoading) return;
    // Vendor and this page isn't toggled public — bounce, same as the
    // server-gated pages (Customers/Categories/Logistics/Extra). Brands
    // is fetched via a client role check (this page predates the shared
    // requireAdminOrPublicPage helper's server pattern), so the redirect
    // has to happen here instead.
    if (role === 'vendor' && !isPublic) {
      router.replace('/backend/admin/dashboard');
    }
  }, [isLoading, role, isPublic, router]);

  if (isLoading) {
    return null;
  }

  if (role === 'vendor' && !isPublic) {
    return null;
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
