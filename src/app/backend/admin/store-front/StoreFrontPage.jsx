'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import AdminSidebar from '@/components/AdminSidebar';
import AdminDesktopHeader from '@/components/admin/AdminDesktopHeader';
import { useAlerts } from '@/context/AlertContext';
import StoreFrontLogoSection from './components/StoreFrontLogoSection';
import StoreFrontSliderEditorContent from './components/StoreFrontSliderEditorContent';
import StoreFrontProductFilterSection from './components/StoreFrontProductFilterSection';
import StoreFrontSliderSection from './components/StoreFrontSliderSection';
import StoreFrontSliderMobileModal from './components/StoreFrontSliderMobileModal';
import { prepareWebpUpload } from '../image/utils/webpUtils.mjs';

const MAX_LOGO_UPLOAD_BYTES = 5 * 1024 * 1024;
const LOGO_RECOMMENDED_WIDTH = 512;
const LOGO_RECOMMENDED_HEIGHT = 512;
const MAX_SLIDES = 5;

const toInitials = (value = '') => {
  const cleaned = String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '')
    .toUpperCase();
  if (!cleaned) return 'ST';
  if (cleaned.length === 1) return `${cleaned}X`;
  return cleaned.slice(0, 2);
};

const normalizeSlots = (value, max = MAX_SLIDES) =>
  Array.from({ length: max }, (_, index) => {
    const nextValue = Array.isArray(value) ? value[index] : '';
    return typeof nextValue === 'string' ? nextValue.trim() : '';
  });

const compactSliderUrls = (value, max = MAX_SLIDES) =>
  (Array.isArray(value) ? value : [])
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean)
    .slice(0, max);

const compactSliderText = (value, max = MAX_SLIDES) =>
  (Array.isArray(value) ? value : [])
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .slice(0, max);

const isSafeSliderLink = (value = '') =>
  value === '' ||
  value.startsWith('/') ||
  value.startsWith('http://') ||
  value.startsWith('https://');

const readImageDimensions = (file) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const width = Number(image.naturalWidth) || 0;
      const height = Number(image.naturalHeight) || 0;
      URL.revokeObjectURL(objectUrl);
      resolve({ width, height });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Unable to read image dimensions.'));
    };
    image.src = objectUrl;
  });

export default function StoreFrontPage() {
  const { pushAlert } = useAlerts();
  const fileInputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState('');
  const [savingSliderLinks, setSavingSliderLinks] = useState(false);
  const [isDesktopSliderEditorOpen, setIsDesktopSliderEditorOpen] = useState(false);
  const [isMobileSliderEditorOpen, setIsMobileSliderEditorOpen] = useState(false);
  const [isSavingFilterMode, setIsSavingFilterMode] = useState(false);
  const [isSavingFilterTitle, setIsSavingFilterTitle] = useState(false);
  const [isSavingProductLimit, setIsSavingProductLimit] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [brand, setBrand] = useState(null);
  const [storefrontFilterTitleInput, setStorefrontFilterTitleInput] = useState('');
  const [storefrontProductLimitInput, setStorefrontProductLimitInput] = useState('8');
  const [bannerSliderImages, setBannerSliderImages] = useState(() => normalizeSlots([]));
  const [bannerSliderKeys, setBannerSliderKeys] = useState(() => normalizeSlots([]));
  const [bannerSliderLinks, setBannerSliderLinks] = useState(() => normalizeSlots([]));

  const brandName = String(brand?.name || 'Store');
  const logoUrl = String(brand?.logo_url || '').trim();
  const initials = useMemo(() => toInitials(brandName), [brandName]);
  const selectedFilterMode = brand?.storefront_filter_mode === 'tag' ? 'tag' : 'category';

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

  const notifyInfo = useCallback(
    (message) =>
      pushAlert({
        type: 'info',
        title: 'Storefront',
        message: String(message || ''),
      }),
    [pushAlert],
  );

  useEffect(() => {
    setLogoFailed(false);
  }, [logoUrl]);

  useEffect(() => {
    setStorefrontFilterTitleInput(String(brand?.storefront_filter_title || '').trim());
  }, [brand?.storefront_filter_title]);

  useEffect(() => {
    const nextLimit = Math.max(1, Math.min(48, Number(brand?.storefront_filter_product_limit) || 8));
    setStorefrontProductLimitInput(String(nextLimit));
  }, [brand?.storefront_filter_product_limit]);

  const syncBrandState = useCallback((nextBrand) => {
    const safeBrand = nextBrand && typeof nextBrand === 'object' ? nextBrand : null;
    const compactImages = compactSliderUrls(
      safeBrand?.banner_slider_urls?.length
        ? safeBrand?.banner_slider_urls
        : safeBrand?.banner_slider_mobile_urls,
    );
    const compactKeys = compactSliderText(
      safeBrand?.banner_slider_keys?.length
        ? safeBrand?.banner_slider_keys
        : safeBrand?.banner_slider_mobile_keys,
      compactImages.length,
    );
    const compactLinks = compactSliderText(safeBrand?.banner_slider_links, compactImages.length);
    setBrand(safeBrand);
    setBannerSliderImages(compactImages);
    setBannerSliderKeys(compactKeys);
    setBannerSliderLinks(compactLinks);
  }, []);

  const buildSliderPatch = useCallback(
    ({ images, keys, links }) => {
      const cleanImages = compactSliderUrls(images);
      const cleanKeys = compactSliderText(keys, cleanImages.length);
      const cleanLinks = compactSliderText(links, cleanImages.length);
      return {
        banner_slider_urls: cleanImages,
        banner_slider_keys: cleanKeys,
        banner_slider_mobile_urls: cleanImages,
        banner_slider_mobile_keys: cleanKeys,
        banner_slider_links: cleanLinks,
      };
    },
    [],
  );

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
    if (!isMobileSliderEditorOpen) return undefined;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMobileSliderEditorOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isMobileSliderEditorOpen]);

  const openPicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleLogoChange = useCallback(
    async (event) => {
      const file = event?.target?.files?.[0];
      event.target.value = '';
      if (!file) return;

      if (!String(file.type || '').startsWith('image/')) {
        notifyError('Please upload an image file (PNG, JPG, SVG, or WebP).');
        return;
      }
      if (file.size > MAX_LOGO_UPLOAD_BYTES) {
        notifyError('Logo is too large. Maximum file size is 5MB.');
        return;
      }

      let dimensions = { width: 0, height: 0 };
      try {
        dimensions = await readImageDimensions(file);
      } catch (dimErr) {
        notifyError(dimErr?.message || 'Unable to read image dimensions.');
        return;
      }

      if (
        dimensions.width !== LOGO_RECOMMENDED_WIDTH ||
        dimensions.height !== LOGO_RECOMMENDED_HEIGHT
      ) {
        notifyInfo(
          `Uploaded ${dimensions.width}x${dimensions.height}px. Recommended size is ${LOGO_RECOMMENDED_WIDTH}x${LOGO_RECOMMENDED_HEIGHT}px.`,
        );
      }

      setIsLogoUploading(true);
      try {
        const { webpFile } = await prepareWebpUpload(file, MAX_LOGO_UPLOAD_BYTES);
        const form = new FormData();
        form.set('file', webpFile);
        form.set('alt_text', `${brandName} logo`);

        const uploadResponse = await fetch('/api/admin/media/upload', {
          method: 'POST',
          body: form,
        });
        const uploadPayload = await uploadResponse.json().catch(() => null);
        if (!uploadResponse.ok) {
          throw new Error(uploadPayload?.error || 'Unable to upload logo.');
        }

        const uploadedUrl = String(uploadPayload?.url || '').trim();
        if (!uploadedUrl) {
          throw new Error('Upload succeeded but no URL was returned.');
        }

        await saveStoreFront({ logo_url: uploadedUrl });
        if (
          dimensions.width === LOGO_RECOMMENDED_WIDTH &&
          dimensions.height === LOGO_RECOMMENDED_HEIGHT
        ) {
          notifySuccess('Logo uploaded successfully at recommended size.');
        }
      } catch (uploadErr) {
        notifyError(uploadErr?.message || 'Unable to upload logo.');
      } finally {
        setIsLogoUploading(false);
      }
    },
    [brandName, notifyError, notifyInfo, notifySuccess, saveStoreFront],
  );

  const handleRemoveLogo = useCallback(async () => {
    if (!brand) return;
    setIsLogoUploading(true);
    try {
      await saveStoreFront({ logo_url: null });
      setLogoFailed(false);
      notifySuccess('Logo removed.');
    } catch (removeErr) {
      notifyError(removeErr?.message || 'Unable to remove logo.');
    } finally {
      setIsLogoUploading(false);
    }
  }, [brand, notifyError, notifySuccess, saveStoreFront]);

  const handleSliderUpload = useCallback(
    async (event, slotIndex) => {
      const file = event?.target?.files?.[0];
      event.target.value = '';
      if (!file || !brand) return;

      if (!String(file.type || '').startsWith('image/')) {
        notifyError('Please upload an image file (PNG, JPG, SVG, or WebP).');
        return;
      }
      if (file.size > MAX_LOGO_UPLOAD_BYTES) {
        notifyError('Slider image is too large. Maximum file size is 5MB.');
        return;
      }

      let dimensions = { width: 0, height: 0 };
      try {
        dimensions = await readImageDimensions(file);
      } catch (dimErr) {
        notifyError(dimErr?.message || 'Unable to read image dimensions.');
        return;
      }
      if (dimensions.width > 0 && dimensions.height > 0) {
        const ratio = dimensions.width / dimensions.height;
        const diff = Math.abs(ratio - 16 / 9);
        if (diff > 0.12) {
          notifyInfo(
            `Uploaded ${dimensions.width}x${dimensions.height}px. Recommended ratio is 16:9 for best fit.`,
          );
        }
      }

      const slotTag = `slider-${slotIndex}`;
      setUploadingSlot(slotTag);

      try {
        const { webpFile } = await prepareWebpUpload(file, MAX_LOGO_UPLOAD_BYTES);
        const form = new FormData();
        form.set('file', webpFile);
        form.set('alt_text', `${brandName} slider ${slotIndex + 1}`);

        const uploadResponse = await fetch('/api/admin/media/upload', {
          method: 'POST',
          body: form,
        });
        const uploadPayload = await uploadResponse.json().catch(() => null);
        if (!uploadResponse.ok) {
          throw new Error(uploadPayload?.error || 'Unable to upload slider image.');
        }

        const uploadedUrl = String(uploadPayload?.url || '').trim();
        const uploadedKey = String(uploadPayload?.key || '').trim();
        if (!uploadedUrl) {
          throw new Error('Upload succeeded but no URL was returned.');
        }

        const nextImages = [...bannerSliderImages];
        const nextKeys = [...bannerSliderKeys];
        nextImages[slotIndex] = uploadedUrl;
        nextKeys[slotIndex] = uploadedKey;

        await saveStoreFront(
          buildSliderPatch({
            images: nextImages,
            keys: nextKeys,
            links: bannerSliderLinks,
          }),
        );

        notifySuccess(`Slider image ${slotIndex + 1} saved.`);
      } catch (uploadErr) {
        notifyError(uploadErr?.message || 'Unable to upload slider image.');
      } finally {
        setUploadingSlot('');
      }
    },
    [
      bannerSliderImages,
      bannerSliderKeys,
      bannerSliderLinks,
      brand,
      brandName,
      buildSliderPatch,
      notifyError,
      notifyInfo,
      notifySuccess,
      saveStoreFront,
    ],
  );

  const handleRemoveSliderImage = useCallback(
    async (slotIndex) => {
      if (!brand) return;
      const slotTag = `slider-remove-${slotIndex}`;
      setUploadingSlot(slotTag);

      try {
        const nextImages = [...bannerSliderImages];
        const nextKeys = [...bannerSliderKeys];
        nextImages.splice(slotIndex, 1);
        nextKeys.splice(slotIndex, 1);
        const nextLinks = [...bannerSliderLinks];
        nextLinks.splice(slotIndex, 1);

        await saveStoreFront(
          buildSliderPatch({
            images: nextImages,
            keys: nextKeys,
            links: nextLinks,
          }),
        );

        notifySuccess(`Slider image ${slotIndex + 1} removed.`);
      } catch (removeErr) {
        notifyError(removeErr?.message || 'Unable to remove slider image.');
      } finally {
        setUploadingSlot('');
      }
    },
    [
      bannerSliderImages,
      bannerSliderKeys,
      bannerSliderLinks,
      buildSliderPatch,
      brand,
      notifyError,
      notifySuccess,
      saveStoreFront,
    ],
  );

  const handleSaveSliderLinks = useCallback(async () => {
    if (!brand) return;

    const nextLinks = compactSliderText(bannerSliderLinks, bannerSliderImages.length);
    const hasInvalidLink = nextLinks.some((value) => !isSafeSliderLink(value));
    if (hasInvalidLink) {
      notifyError('Each slider link must start with /, http://, or https://.');
      return;
    }

    setSavingSliderLinks(true);
    try {
      await saveStoreFront(
        buildSliderPatch({
          images: bannerSliderImages,
          keys: bannerSliderKeys,
          links: nextLinks,
        }),
      );
      notifySuccess('Slider links saved.');
    } catch (saveErr) {
      notifyError(saveErr?.message || 'Unable to save slider links.');
    } finally {
      setSavingSliderLinks(false);
    }
  }, [
    bannerSliderImages,
    bannerSliderKeys,
    bannerSliderLinks,
    brand,
    buildSliderPatch,
    notifyError,
    notifySuccess,
    saveStoreFront,
  ]);

  const handleChangeStoreFrontFilterMode = useCallback(
    async (nextMode) => {
      if (!brand || (nextMode !== 'category' && nextMode !== 'tag')) return;
      if (selectedFilterMode === nextMode) return;

      const previousMode = selectedFilterMode;
      setIsSavingFilterMode(true);
      setBrand((prev) => (prev ? { ...prev, storefront_filter_mode: nextMode } : prev));
      try {
        await saveStoreFront({ storefront_filter_mode: nextMode });
        notifySuccess(`Product filter set to ${nextMode === 'tag' ? 'tags' : 'categories'}.`);
      } catch (saveErr) {
        setBrand((prev) => (prev ? { ...prev, storefront_filter_mode: previousMode } : prev));
        notifyError(saveErr?.message || 'Unable to save product filter setting.');
      } finally {
        setIsSavingFilterMode(false);
      }
    },
    [brand, notifyError, notifySuccess, saveStoreFront, selectedFilterMode],
  );

  const handleToggleStoreFrontFilterOption = useCallback(
    async (optionId) => {
      if (!brand || !optionId) return;

      const currentCategoryIds = Array.isArray(brand?.storefront_filter_category_ids)
        ? [...brand.storefront_filter_category_ids]
        : [];
      const currentTagIds = Array.isArray(brand?.storefront_filter_tag_ids)
        ? [...brand.storefront_filter_tag_ids]
        : [];

      if (selectedFilterMode === 'tag') {
        const nextTagIds = currentTagIds.includes(optionId)
          ? currentTagIds.filter((id) => id !== optionId)
          : [...currentTagIds, optionId];

        setIsSavingFilterMode(true);
        setBrand((prev) => (prev ? { ...prev, storefront_filter_tag_ids: nextTagIds } : prev));
        try {
          await saveStoreFront({ storefront_filter_tag_ids: nextTagIds });
        } catch (saveErr) {
          setBrand((prev) => (prev ? { ...prev, storefront_filter_tag_ids: currentTagIds } : prev));
          notifyError(saveErr?.message || 'Unable to save tag filter selection.');
        } finally {
          setIsSavingFilterMode(false);
        }
        return;
      }

      const nextCategoryIds = currentCategoryIds.includes(optionId)
        ? currentCategoryIds.filter((id) => id !== optionId)
        : [...currentCategoryIds, optionId];

      setIsSavingFilterMode(true);
      setBrand((prev) =>
        prev ? { ...prev, storefront_filter_category_ids: nextCategoryIds } : prev,
      );
      try {
        await saveStoreFront({ storefront_filter_category_ids: nextCategoryIds });
      } catch (saveErr) {
        setBrand((prev) =>
          prev ? { ...prev, storefront_filter_category_ids: currentCategoryIds } : prev,
        );
        notifyError(saveErr?.message || 'Unable to save category filter selection.');
      } finally {
        setIsSavingFilterMode(false);
      }
    },
    [brand, notifyError, saveStoreFront, selectedFilterMode],
  );

  const handleSaveStoreFrontFilterTitle = useCallback(async () => {
    if (!brand) return;
    const nextTitle = String(storefrontFilterTitleInput || '').trim();
    const previousTitle = String(brand?.storefront_filter_title || '').trim();
    if (nextTitle === previousTitle) return;

    setIsSavingFilterTitle(true);
    setBrand((prev) => (prev ? { ...prev, storefront_filter_title: nextTitle } : prev));
    try {
      await saveStoreFront({ storefront_filter_title: nextTitle || null });
      notifySuccess(nextTitle ? 'Custom filter name saved.' : 'Filter name reset to default.');
    } catch (saveErr) {
      setBrand((prev) => (prev ? { ...prev, storefront_filter_title: previousTitle } : prev));
      notifyError(saveErr?.message || 'Unable to save filter name.');
    } finally {
      setIsSavingFilterTitle(false);
    }
  }, [brand, notifyError, notifySuccess, saveStoreFront, storefrontFilterTitleInput]);

  const handleSaveStoreFrontProductLimit = useCallback(async () => {
    if (!brand) return;
    const parsedLimit = Number(storefrontProductLimitInput);
    const nextLimit = Math.max(1, Math.min(48, Number.isFinite(parsedLimit) ? parsedLimit : 8));
    const previousLimit = Math.max(1, Math.min(48, Number(brand?.storefront_filter_product_limit) || 8));
    if (nextLimit === previousLimit) {
      setStorefrontProductLimitInput(String(nextLimit));
      return;
    }

    setIsSavingProductLimit(true);
    setBrand((prev) => (prev ? { ...prev, storefront_filter_product_limit: nextLimit } : prev));
    try {
      await saveStoreFront({ storefront_filter_product_limit: nextLimit });
      notifySuccess('Product count updated.');
    } catch (saveErr) {
      setBrand((prev) => (prev ? { ...prev, storefront_filter_product_limit: previousLimit } : prev));
      notifyError(saveErr?.message || 'Unable to save product count.');
    } finally {
      setIsSavingProductLimit(false);
    }
  }, [brand, notifyError, notifySuccess, saveStoreFront, storefrontProductLimitInput]);

  const sliderPreview = useMemo(() => {
    const slides = [];
    for (let index = 0; index < MAX_SLIDES; index += 1) {
      const imageUrl = bannerSliderImages[index] || '';
      if (!imageUrl) continue;
      slides.push({
        desktopUrl: imageUrl,
        mobileUrl: imageUrl,
        link: bannerSliderLinks[index] || '',
      });
    }
    return slides;
  }, [bannerSliderImages, bannerSliderLinks]);

  const activeSliderImages = bannerSliderImages;
  const visibleSliderSlots = useMemo(() => {
    const count = Array.isArray(activeSliderImages) ? activeSliderImages.length : 0;
    if (count <= 0) return 1;
    if (count >= MAX_SLIDES) return MAX_SLIDES;
    return count + 1;
  }, [activeSliderImages]);
  const hasAnySliderImage = useMemo(
    () => bannerSliderImages.some((value) => typeof value === 'string' && value.trim().length > 0),
    [bannerSliderImages],
  );

  const renderSliderEditorContent = useCallback(
    (inputPrefix) => (
      <StoreFrontSliderEditorContent
        inputPrefix={inputPrefix}
        brand={brand}
        brandName={brandName}
        sliderPreview={sliderPreview}
        visibleSliderSlots={visibleSliderSlots}
        activeSliderImages={activeSliderImages}
        uploadingSlot={uploadingSlot}
        onSliderUpload={handleSliderUpload}
        onRemoveSliderImage={handleRemoveSliderImage}
        hasAnySliderImage={hasAnySliderImage}
        savingSliderLinks={savingSliderLinks}
        onSaveSliderLinks={handleSaveSliderLinks}
        bannerSliderLinks={bannerSliderLinks}
        setBannerSliderLinks={setBannerSliderLinks}
        maxSlides={MAX_SLIDES}
      />
    ),
    [
      activeSliderImages,
      bannerSliderLinks,
      brand,
      brandName,
      handleRemoveSliderImage,
      handleSaveSliderLinks,
      handleSliderUpload,
      hasAnySliderImage,
      savingSliderLinks,
      sliderPreview,
      uploadingSlot,
      visibleSliderSlots,
    ],
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <AdminSidebar />
        <main className="flex-1 px-4 pb-8 sm:px-6 lg:px-10">
          <AdminDesktopHeader />
          <div className="mx-auto w-full max-w-5xl space-y-8">
            <section className="px-1">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Store front</p>
                {String(brand?.slug || '').trim() ? (
                  <Link
                    href={`/vendors/${String(brand.slug).trim()}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <span>View storefront</span>
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 5h5v5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="m10 14 9-9" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M19 14v5H5V5h5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
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
              isLogoUploading={isLogoUploading}
              fileInputRef={fileInputRef}
              onLogoChange={handleLogoChange}
              onOpenLogoPicker={openPicker}
              onRemoveLogo={handleRemoveLogo}
            />

            <StoreFrontProductFilterSection
              isLoading={isLoading}
              brand={brand}
              selectedMode={selectedFilterMode}
              isSaving={isSavingFilterMode}
              onChangeMode={handleChangeStoreFrontFilterMode}
              onToggleOption={handleToggleStoreFrontFilterOption}
              customTitleValue={storefrontFilterTitleInput}
              onCustomTitleChange={setStorefrontFilterTitleInput}
              onSaveCustomTitle={handleSaveStoreFrontFilterTitle}
              isSavingCustomTitle={isSavingFilterTitle}
              productLimitValue={storefrontProductLimitInput}
              onProductLimitChange={setStorefrontProductLimitInput}
              onSaveProductLimit={handleSaveStoreFrontProductLimit}
              isSavingProductLimit={isSavingProductLimit}
            />

            <StoreFrontSliderSection
              isLoading={isLoading}
              isDesktopSliderEditorOpen={isDesktopSliderEditorOpen}
              onToggleDesktopEditor={() => setIsDesktopSliderEditorOpen((prev) => !prev)}
              onOpenMobileEditor={() => setIsMobileSliderEditorOpen(true)}
              renderDesktopEditor={() => renderSliderEditorContent('desktop')}
            />

            <StoreFrontSliderMobileModal
              isOpen={isMobileSliderEditorOpen}
              onClose={() => setIsMobileSliderEditorOpen(false)}
              renderContent={() => renderSliderEditorContent('mobile')}
            />

          </div>
        </main>
      </div>
    </div>
  );
}
