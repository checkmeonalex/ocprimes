'use client';
import TaxonomyPage from '../components/TaxonomyPage';

export default function AdminBrandsPage() {
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
