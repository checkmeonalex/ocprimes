'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import { useAlerts } from '@/context/AlertContext';
import StoreFrontLogoSection from './components/StoreFrontLogoSection';
import StoreFrontCollectionsMenuSection from './components/StoreFrontCollectionsMenuSection';
import StoreFrontPageBuilder from './components/StoreFrontPageBuilder';
import MediaLibraryModal from './components/MediaLibraryModal';

const toInitials = (value = '') => {
  const cleaned = String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '')
    .toUpperCase();
  if (!cleaned) return 'ST';
  if (cleaned.length === 1) return `${cleaned}X`;
  return cleaned.slice(0, 2);
};

export default function StoreFrontPage() {
  const { pushAlert } = useAlerts();
  const [isLoading, setIsLoading] = useState(true);
  const [isLogoSaving, setIsLogoSaving] = useState(false);
  const [isSavingCollectionsMode, setIsSavingCollectionsMode] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [brand, setBrand] = useState(null);
  const [isLogoMediaOpen, setIsLogoMediaOpen] = useState(false);

  const brandName = String(brand?.name || 'Store');
  const logoUrl = String(brand?.logo_url || '').trim();
  const initials = useMemo(() => toInitials(brandName), [brandName]);

  const notifyError = useCallback(
    (message) =>
      pushAlert({
        type: 'error',
        title: 'Storefront',
        message: String(message || 'Something went wrong.'),
      }),
    [pushAlert],
  );

  const notifySuccess = useCallback(
    (message) =>
      pushAlert({
        type: 'success',
        title: 'Storefront',
        message: String(message || 'Saved.'),
      }),
    [pushAlert],
  );

  useEffect(() => {
    setLogoFailed(false);
  }, [logoUrl]);

  const syncBrandState = useCallback((nextBrand) => {
    const safeBrand = nextBrand && typeof nextBrand === 'object' ? nextBrand : null;
    setBrand(safeBrand);
  }, []);

  const saveStoreFront = useCallback(
    async (patch) => {
      const response = await fetch('/api/admin/store-front', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to save store front settings.');
      }
      syncBrandState(payload?.item || null);
      return payload?.item || null;
    },
    [syncBrandState],
  );

  const loadStoreFront = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/store-front', { method: 'GET', cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to load store front settings.');
      }
      syncBrandState(payload?.item || null);
      setLogoFailed(false);
    } catch (loadErr) {
      notifyError(loadErr?.message || 'Unable to load store front settings.');
    } finally {
      setIsLoading(false);
    }
  }, [notifyError, syncBrandState]);

  useEffect(() => {
    loadStoreFront();
  }, [loadStoreFront]);

  const handleLogoSelect = useCallback(
    async (url) => {
      setIsLogoSaving(true);
      try {
        await saveStoreFront({ logo_url: url });
        notifySuccess('Logo updated.');
      } catch (err) {
        notifyError(err?.message || 'Unable to save logo.');
      } finally {
        setIsLogoSaving(false);
      }
    },
    [saveStoreFront, notifySuccess, notifyError],
  );

  const handleRemoveLogo = useCallback(async () => {
    if (!brand) return;
    setIsLogoSaving(true);
    try {
      await saveStoreFront({ logo_url: null });
      setLogoFailed(false);
      notifySuccess('Logo removed.');
    } catch (removeErr) {
      notifyError(removeErr?.message || 'Unable to remove logo.');
    } finally {
      setIsLogoSaving(false);
    }
  }, [brand, notifyError, notifySuccess, saveStoreFront]);

  const handleChangeCollectionsMenuMode = useCallback(
    async (nextMode) => {
      if (!brand || (nextMode !== 'grouped' && nextMode !== 'flat')) return;
      const currentMode = brand?.collections_menu_mode === 'flat' ? 'flat' : 'grouped';
      if (currentMode === nextMode) return;

      const previousMode = currentMode;
      setIsSavingCollectionsMode(true);
      setBrand((prev) => (prev ? { ...prev, collections_menu_mode: nextMode } : prev));
      try {
        await saveStoreFront({ collections_menu_mode: nextMode });
        notifySuccess(`Collections menu set to ${nextMode}.`);
      } catch (saveErr) {
        setBrand((prev) => (prev ? { ...prev, collections_menu_mode: previousMode } : prev));
        notifyError(saveErr?.message || 'Unable to save collections menu setting.');
      } finally {
        setIsSavingCollectionsMode(false);
      }
    },
    [brand, notifyError, notifySuccess, saveStoreFront],
  );

  return (
    <AdminShell>
      <div className="mx-auto w-full max-w-5xl space-y-8">
            <section className="px-1">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Store front</p>
                {String(brand?.slug || '').trim() ? (
                  <a
                    href={`/${String(brand.slug).trim()}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <span>View storefront</span>
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 5h5v5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="m10 14 9-9" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M19 14v5H5V5h5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </a>
                ) : null}
              </div>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Shop Branding</h2>
              <p className="mt-2 text-sm text-slate-500">
                Upload your store logo and banner images to customize your storefront.
              </p>
            </section>

            <StoreFrontLogoSection
              isLoading={isLoading}
              brand={brand}
              brandName={brandName}
              logoUrl={logoUrl}
              logoFailed={logoFailed}
              onLogoError={() => setLogoFailed(true)}
              initials={initials}
              isLogoUploading={isLogoSaving}
              onOpenMediaLibrary={() => setIsLogoMediaOpen(true)}
              onRemoveLogo={handleRemoveLogo}
            />

            <StoreFrontCollectionsMenuSection
              isLoading={isLoading}
              brand={brand}
              isSaving={isSavingCollectionsMode}
              onChangeMode={handleChangeCollectionsMenuMode}
            />

            <StoreFrontPageBuilder
              isLoading={isLoading}
              brand={brand}
              onSave={saveStoreFront}
            />

      </div>

      <MediaLibraryModal
        isOpen={isLogoMediaOpen}
        onClose={() => setIsLogoMediaOpen(false)}
        onSelect={handleLogoSelect}
      />
    </AdminShell>
  );
}
