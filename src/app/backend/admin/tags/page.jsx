'use client';
import TaxonomyPage from '../components/TaxonomyPage';

export default function AdminTagsPage() {
  return (
    <TaxonomyPage
      title="Tags"
      description="Create and manage internal product tags."
      endpoint="/api/admin/tags"
      singularLabel="tag"
      pluralLabel="tags"
    />
  );
}
