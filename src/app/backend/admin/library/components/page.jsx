'use client';
import LibraryPage from '../../LibraryPage';

export default function ComponentLibraryPage() {
  return (
    <LibraryPage
      listEndpoint="/api/admin/component-media"
      uploadEndpoint="/api/admin/component-media/upload"
      deleteEndpointBase="/api/admin/component-media"
      title="Component Image Library"
      filterOptions={[
        { label: 'All Images', value: 'all' },
        { label: 'Stale', value: 'stale' },
      ]}
    />
  );
}
