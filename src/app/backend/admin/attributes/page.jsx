'use client';

import TaxonomyPage from '../components/TaxonomyPage';

export default function AdminAttributesPage() {
  return (
    <TaxonomyPage
      title="Attributes"
      description="Create and manage product attributes like color, size, and material."
      endpoint="/api/admin/attributes"
      singularLabel="attribute"
      pluralLabel="attributes"
      optionsEndpoint="/api/admin/attributes/options"
    />
  );
}
