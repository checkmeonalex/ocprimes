'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import { useAlerts } from '@/context/AlertContext';
import StoreFrontLogoSection from './components/StoreFrontLogoSection';
import StoreFrontCollectionsMenuSection from './components/StoreFrontCollectionsMenuSection';
import StoreFrontSocialLinksSection from './components/StoreFrontSocialLinksSection';
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
  const [isLogoFullSaving, setIsLogoFullSaving] = useState(false);
  const [isFontSaving, setIsFontSaving] = useState(false);
  const [isSizeSaving, setIsSizeSaving] = useState(false);
  const [isSavingCollectionsMode, setIsSavingCollectionsMode] = useState(false);
  const [isSavingSocial, setIsSavingSocial] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [logoFullFailed, setLogoFullFailed] = useState(false);
  const [brand, setBrand] = useState(null);
  const [isLogoMediaOpen, setIsLogoMediaOpen] = useState(false);
  const [isLogoFullMediaOpen, setIsLogoFullMediaOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [isNameSaving, setIsNameSaving] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [tags, setTags] = useState([]);
  const nameInputRef = useRef(null);

  const brandName = String(brand?.name || 'Store');
  const logoUrl = String(brand?.logo_url || '').trim();
  const logoFullUrl = String(brand?.logo_full_url || '').trim();
  const logoFont = String(brand?.logo_font || '').trim();
  const logoSizeDesktop = Number(brand?.logo_size_desktop) || null;
  const logoSizeMobile = Number(brand?.logo_size_mobile) || null;
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

  useEffect(() => {
    let mounted = true;
    const loadFilters = async () => {
      try {
        const [treeRes, filtersRes, tagsRes] = await Promise.all([
          fetch('/api/admin/categories/tree?limit=500').then((r) => r.json().catch(() => null)),
          fetch('/api/admin/product-filters?status=publish').then((r) => r.json().catch(() => null)),
          fetch('/api/admin/tags?per_page=50').then((r) => r.json().catch(() => null)),
        ]);
        if (!mounted) return;
        const categoryIds = Array.isArray(filtersRes?.category_ids) ? filtersRes.category_ids : [];
        if (Array.isArray(treeRes?.items)) {
          setCategoryOptions(
            categoryIds.length ? treeRes.items.filter((i) => categoryIds.includes(i.id)) : treeRes.items,
          );
        }
        if (Array.isArray(tagsRes?.items)) setTags(tagsRes.items);
      } catch {
        // non-critical: category/tag filter dropdowns just stay empty
      }
    };
    loadFilters();
    return () => {
      mounted = false;
    };
  }, []);

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

  const handleLogoFullSelect = useCallback(async (url) => {
    setIsLogoFullSaving(true);
    try {
      await saveStoreFront({ logo_full_url: url });
      notifySuccess('Header logo updated.');
    } catch (err) {
      notifyError(err?.message || 'Unable to save header logo.');
    } finally {
      setIsLogoFullSaving(false);
    }
  }, [saveStoreFront, notifySuccess, notifyError]);

  const handleRemoveLogoFull = useCallback(async () => {
    if (!brand) return;
    setIsLogoFullSaving(true);
    try {
      await saveStoreFront({ logo_full_url: null });
      setLogoFullFailed(false);
      notifySuccess('Header logo removed.');
    } catch (err) {
      notifyError(err?.message || 'Unable to remove header logo.');
    } finally {
      setIsLogoFullSaving(false);
    }
  }, [brand, notifyError, notifySuccess, saveStoreFront]);

  const handleFontSelect = useCallback(async (fontKey) => {
    if (!brand) return;
    setIsFontSaving(true);
    try {
      await saveStoreFront({ logo_font: fontKey || null });
      notifySuccess('Logo font updated.');
    } catch (err) {
      notifyError(err?.message || 'Unable to save font.');
    } finally {
      setIsFontSaving(false);
    }
  }, [brand, notifyError, notifySuccess, saveStoreFront]);

  const handleSizeChange = useCallback(async (patch) => {
    if (!brand) return;
    setIsSizeSaving(true);
    try {
      await saveStoreFront(patch);
      notifySuccess('Logo size updated.');
    } catch (err) {
      notifyError(err?.message || 'Unable to save logo size.');
    } finally {
      setIsSizeSaving(false);
    }
  }, [brand, notifyError, notifySuccess, saveStoreFront]);

  const handleStartEditName = useCallback(() => {
    setNameDraft(brandName === 'Store' ? '' : brandName);
    setIsEditingName(true);
  }, [brandName]);

  const handleCancelEditName = useCallback(() => {
    setIsEditingName(false);
    setNameDraft('');
  }, []);

  const handleSaveName = useCallback(async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed.length < 2) {
      notifyError('Store name must be at least 2 characters.');
      return;
    }
    if (trimmed === brandName) {
      setIsEditingName(false);
      return;
    }
    setIsNameSaving(true);
    try {
      await saveStoreFront({ name: trimmed });
      notifySuccess('Store name updated.');
      setIsEditingName(false);
    } catch (err) {
      notifyError(err?.message || 'Unable to save store name.');
    } finally {
      setIsNameSaving(false);
    }
  }, [nameDraft, brandName, saveStoreFront, notifySuccess, notifyError]);

  const handleNameKeyDown = useCallback(
    (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleSaveName();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        handleCancelEditName();
      }
    },
    [handleSaveName, handleCancelEditName],
  );

  useEffect(() => {
    if (isEditingName) nameInputRef.current?.focus();
  }, [isEditingName]);

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

  const handleSaveSocial = useCallback(
    async (patch) => {
      setIsSavingSocial(true);
      try {
        await saveStoreFront(patch);
        notifySuccess('Social links updated.');
      } catch (err) {
        notifyError(err?.message || 'Unable to save social links.');
      } finally {
        setIsSavingSocial(false);
      }
    },
    [saveStoreFront, notifySuccess, notifyError],
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
              <div className="mt-2">
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      ref={nameInputRef}
                      type="text"
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      onKeyDown={handleNameKeyDown}
                      maxLength={80}
                      disabled={isNameSaving}
                      className="w-full max-w-sm rounded-lg border border-slate-300 px-2.5 py-1 text-2xl font-semibold text-slate-900 outline-none focus:border-slate-500 disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={handleSaveName}
                      disabled={isNameSaving}
                      className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
                    >
                      {isNameSaving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEditName}
                      disabled={isNameSaving}
                      className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-semibold text-slate-900">{brandName}</h2>
                    <button
                      type="button"
                      onClick={handleStartEditName}
                      aria-label="Edit store name"
                      className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 20h9" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              <p className="mt-2 text-sm text-slate-500">
                Add your logo and make your store feel like yours.
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
              logoFullUrl={logoFullUrl}
              logoFullFailed={logoFullFailed}
              onLogoFullError={() => setLogoFullFailed(true)}
              isLogoFullUploading={isLogoFullSaving}
              onOpenLogoFullMediaLibrary={() => setIsLogoFullMediaOpen(true)}
              onRemoveLogoFull={handleRemoveLogoFull}
              logoFont={logoFont}
              isFontSaving={isFontSaving}
              onFontSelect={handleFontSelect}
              logoSizeDesktop={logoSizeDesktop}
              logoSizeMobile={logoSizeMobile}
              isSizeSaving={isSizeSaving}
              onSizeChange={handleSizeChange}
            />

            <StoreFrontCollectionsMenuSection
              isLoading={isLoading}
              brand={brand}
              isSaving={isSavingCollectionsMode}
              onChangeMode={handleChangeCollectionsMenuMode}
            />

            <StoreFrontSocialLinksSection
              isLoading={isLoading}
              brand={brand}
              isSaving={isSavingSocial}
              onSave={handleSaveSocial}
            />

            <StoreFrontPageBuilder
              isLoading={isLoading}
              brand={brand}
              onSave={saveStoreFront}
              categoryOptions={categoryOptions}
              tags={tags}
            />

      </div>

      <MediaLibraryModal
        isOpen={isLogoMediaOpen}
        onClose={() => setIsLogoMediaOpen(false)}
        onSelect={handleLogoSelect}
      />
      <MediaLibraryModal
        isOpen={isLogoFullMediaOpen}
        onClose={() => setIsLogoFullMediaOpen(false)}
        onSelect={handleLogoFullSelect}
      />
    </AdminShell>
  );
}
