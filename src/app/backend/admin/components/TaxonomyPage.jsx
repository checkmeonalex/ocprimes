'use client';
import AdminShell from '@/components/admin/AdminShell';
import TaxonomyManager from './TaxonomyManager';

function TaxonomyPage({ title, description, endpoint, singularLabel, pluralLabel, optionsEndpoint }) {
  return (
    <AdminShell>
      <TaxonomyManager
        title={title}
        description={description}
        endpoint={endpoint}
        singularLabel={singularLabel}
        pluralLabel={pluralLabel}
        optionsEndpoint={optionsEndpoint}
      />
    </AdminShell>
  );
}

export default TaxonomyPage;
