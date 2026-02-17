'use client';
import AdminSidebar from '@/components/AdminSidebar';
import AdminDesktopHeader from '@/components/admin/AdminDesktopHeader';
import TaxonomyManager from './TaxonomyManager';

function TaxonomyPage({ title, description, endpoint, singularLabel, pluralLabel, optionsEndpoint }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <div className="sticky top-0 self-start h-screen">
          <AdminSidebar />
        </div>

        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10 lg:pt-0">
                  <AdminDesktopHeader />
          <TaxonomyManager
            title={title}
            description={description}
            endpoint={endpoint}
            singularLabel={singularLabel}
            pluralLabel={pluralLabel}
            optionsEndpoint={optionsEndpoint}
          />
        </main>
      </div>
    </div>
  );
}

export default TaxonomyPage;
