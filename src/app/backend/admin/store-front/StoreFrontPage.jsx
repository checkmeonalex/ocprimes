'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
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

const SOCIAL_KEYS = [
  'social_whatsapp',
  'social_instagram_url', 'social_instagram_handle',
  'social_facebook_url', 'social_facebook_handle',
  'social_x_url', 'social_x_handle',
  'social_twitch_url', 'social_twitch_handle',
  'social_tiktok_url', 'social_tiktok_handle',
  'social_pinterest_url', 'social_pinterest_handle',
];

// ── Icons ────────────────────────────────────────────────────────────────
const IcoBack = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IcoBrand = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="3" width="8" height="8" rx="2" />
    <path d="M15 3h6v6M12 12l9-9M15 21h6v-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IcoNav = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M4 6h16M4 12h10M4 18h16" strokeLinecap="round" />
  </svg>
);
const IcoConnect = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" />
    <path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6" strokeLinecap="round" />
  </svg>
);
const IcoSections = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="4" width="18" height="6" rx="1.5" />
    <rect x="3" y="14" width="8" height="6" rx="1.5" />
    <rect x="13" y="14" width="8" height="6" rx="1.5" />
  </svg>
);
const IcoChevron = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IcoAi = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="4" y="4" width="16" height="16" rx="4" />
    <path d="M9 9h.01M15 9h.01M8.5 14.5c1 1 2.2 1.5 3.5 1.5s2.5-.5 3.5-1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function SettingCard({ icon, title, summary, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md sm:p-5"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-900">{title}</span>
        <span className="mt-0.5 block truncate text-xs text-slate-500">{summary}</span>
      </span>
      <span className="mt-1.5 shrink-0 text-slate-300">
        <IcoChevron />
      </span>
    </button>
  );
}

export default function StoreFrontPage() {
  const router = useRouter();
  const { pushAlert } = useAlerts();
  const [view, setView] = useState('home'); // 'home' | 'branding' | 'navigation' | 'connect' | 'sections'
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

  const isAnySaving =
    isLogoSaving || isLogoFullSaving || isFontSaving || isSizeSaving ||
    isSavingCollectionsMode || isSavingSocial || isNameSaving;

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

  // ── Summaries shown on the home grid cards ──────────────────────────────
  const brandingSummary = logoFullUrl || logoUrl
    ? 'Logo set'
    : logoFont
      ? `${brandName} in a custom font`
      : 'No logo yet';

  const navigationSummary = brand?.collections_menu_mode === 'flat' ? 'Flat list' : 'Grouped';

  const connectedCount = SOCIAL_KEYS.filter((key) => String(brand?.[key] || '').trim()).length
    ? new Set(
        SOCIAL_KEYS.filter((key) => String(brand?.[key] || '').trim()).map((key) =>
          key.replace(/^social_/, '').replace(/_(url|handle)$/, ''),
        ),
      ).size
    : 0;
  const connectSummary = connectedCount > 0 ? `${connectedCount} platform${connectedCount > 1 ? 's' : ''} connected` : 'Not connected yet';

  const blockCount = Array.isArray(brand?.storefront_blocks) ? brand.storefront_blocks.length : 0;
  const sectionsSummary = blockCount > 0 ? `${blockCount} section${blockCount > 1 ? 's' : ''}` : 'No sections yet';

  const viewMeta = {
    branding: { title: 'Branding', subtitle: 'Logo, header logo, and store name font.' },
    navigation: { title: 'Navigation', subtitle: 'How categories appear in the Collections menu.' },
    connect: { title: 'Connect', subtitle: 'Social links shoppers can find on your storefront.' },
    sections: { title: 'Sections', subtitle: 'Build and arrange your storefront layout.' },
  }[view];

  return (
    <AdminShell>
      <div className={view === 'sections' ? 'mx-auto w-full max-w-[1400px] space-y-6' : 'mx-auto w-full max-w-5xl space-y-6'}>

        {/* ── Store name header — always visible ─────────────────────── */}
        <section className="px-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Store front</p>
              {isAnySaving && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                  Saving…
                </span>
              )}
            </div>

            {String(brand?.slug || '').trim() ? (
              <a
                href={`/${String(brand.slug).trim()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <span>View store</span>
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 5h5v5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="m10 14 9-9" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M19 14v5H5V5h5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            ) : null}
          </div>

          {view === 'home' ? (
            <>
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
            </>
          ) : (
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setView('home')}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                aria-label="Back to Store front"
              >
                <IcoBack />
              </button>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{viewMeta?.title}</h2>
                <p className="text-sm text-slate-500">{viewMeta?.subtitle}</p>
              </div>
            </div>
          )}
        </section>

        {/* ── Home: grid of setting cards, Shopify Settings-home style ─── */}
        {view === 'home' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <SettingCard icon={<IcoBrand />} title="Branding" summary={brandingSummary} onClick={() => setView('branding')} />
            <SettingCard icon={<IcoNav />} title="Navigation" summary={navigationSummary} onClick={() => setView('navigation')} />
            <SettingCard icon={<IcoConnect />} title="Connect" summary={connectSummary} onClick={() => setView('connect')} />
            <SettingCard icon={<IcoSections />} title="Sections" summary={sectionsSummary} onClick={() => setView('sections')} />
            <SettingCard
              icon={<IcoAi />}
              title="AI connector"
              summary="Connect Claude or another AI tool to manage your store"
              onClick={() => router.push('/admin/settings')}
            />
          </div>
        )}

        {/* ── Branding ─────────────────────────────────────────────────── */}
        {view === 'branding' && (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
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
          </section>
        )}

        {/* ── Navigation ───────────────────────────────────────────────── */}
        {view === 'navigation' && (
          <StoreFrontCollectionsMenuSection
            isLoading={isLoading}
            brand={brand}
            isSaving={isSavingCollectionsMode}
            onChangeMode={handleChangeCollectionsMenuMode}
          />
        )}

        {/* ── Connect ──────────────────────────────────────────────────── */}
        {view === 'connect' && (
          <StoreFrontSocialLinksSection
            isLoading={isLoading}
            brand={brand}
            isSaving={isSavingSocial}
            onSave={handleSaveSocial}
          />
        )}

        {/* ── Sections (page builder + live preview) ──────────────────── */}
        {view === 'sections' && (
          <StoreFrontPageBuilder
            isLoading={isLoading}
            brand={brand}
            onSave={saveStoreFront}
            categoryOptions={categoryOptions}
            tags={tags}
          />
        )}
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
