import CustomSelect from '@/components/common/CustomSelect'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { readStoredSiteId } from '../../../../utils/connector';
import LazyImage from '../components/LazyImage';
import ProductImageLibraryModal from './ProductImageLibraryModal';
import ProductCategorySelector from './ProductCategorySelector';
import ProductTagSelector from './ProductTagSelector';
import ProductBrandSelector from './ProductBrandSelector';
import ProductConditionSelector from './ProductConditionSelector';
import ProductPackagingSelector from './ProductPackagingSelector';
import ProductReturnPolicySelector from './ProductReturnPolicySelector';
import RichTextEditor from '../components/RichTextEditor';
import { buildProductPayload, createProduct, deleteProduct, updateProduct } from './functions/products';
import { fetchProductCategories } from './functions/categories';
import { createProductTag, fetchProductTags } from './functions/tags';
import { createCategoryRequest, fetchCategoryRequests } from './functions/categoryRequests.mjs';
import { fetchProductBrands } from './functions/brands';
import { fetchProductAttributes } from './functions/attributes';
import { fetchSizeGuides } from './functions/sizeGuides';
import LoadingButton from '../../../../components/LoadingButton';
import { useAlerts } from '@/context/AlertContext';
import { PRODUCT_CONDITION_VALUES } from '@/lib/admin/product-conditions';
import { PRODUCT_PACKAGING_VALUES } from '@/lib/admin/product-packaging';
import { PRODUCT_RETURN_POLICY_VALUES } from '@/lib/admin/product-returns';
import {
  PRODUCT_EDITOR_STEPS,
  getFurthestAccessibleStepIndex,
  isStepValid,
} from './editor/productFlow.mjs';

const toSlug = (value) => {
  if (!value) return '';
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const getAttributeGuidance = (attribute) => {
  const key = String(attribute?.taxonomy || attribute?.name || '').toLowerCase();
  if (key === 'color' || key === 'colour' || key.includes('color') || key.includes('colour')) {
    return 'Pick all colors available for this product.';
  }
  if (key.includes('size')) {
    return 'Select every size this product comes in.';
  }
  return 'Select all options that apply to this product.';
};

const isColorLikeAttribute = (attribute) => {
  const key = String(attribute?.taxonomy || attribute?.name || '').toLowerCase();
  return key === 'color' || key === 'colour' || key.includes('color') || key.includes('colour');
};

const normalizeHexColor = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const hex = raw.startsWith('#') ? raw : `#${raw}`;
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex) ? hex : '';
};

const getTermColorHex = (term) =>
  normalizeHexColor(term?.color_hex || term?.hex || term?.color || term?.value_hex);

const SHORT_DESCRIPTION_MAX = 500;
const CONDITION_VALUE_SET = new Set(PRODUCT_CONDITION_VALUES);
const PACKAGING_VALUE_SET = new Set(PRODUCT_PACKAGING_VALUES);
const RETURN_POLICY_VALUE_SET = new Set(PRODUCT_RETURN_POLICY_VALUES);
const MOBILE_STEP_META = [
  { stepIndex: 0, label: 'Basics' },
  { stepIndex: 1, label: 'Details' },
  { stepIndex: 2, label: 'Variations' },
  { stepIndex: 3, label: 'Tell Us More' },
  { stepIndex: 4, label: 'Preview' },
];

const getStorefrontOrigin = () => {
  if (typeof window === 'undefined') return '';
  return window.location?.origin || '';
};

const buildProductUrl = (product, fallbackSlug, options = {}) => {
  const preview = Boolean(options.preview);
  if (!preview) {
    if (product?.preview_link) return product.preview_link;
    if (product?.permalink) return product.permalink;
  }
  const baseUrl = getStorefrontOrigin();
  if (!baseUrl) return '';
  const slug = product?.slug || fallbackSlug;
  if (slug) {
    const base = `${baseUrl.replace(/\/+$/, '')}/product/${slug}`;
    return preview ? `${base}?preview=1` : base;
  }
  if (product?.id) {
    return `${baseUrl.replace(/\/+$/, '')}/?post_type=product&p=${product.id}`;
  }
  return '';
};

const withEmbedPreviewParam = (url) => {
  if (!url || typeof window === 'undefined') return url || '';
  try {
    const parsed = new URL(url, window.location.origin);
    parsed.searchParams.set('embed_preview', '1');
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch (_error) {
    return url;
  }
};

const normalizeAllowedValue = (value, allowedValues, fallback = '') => {
  const normalized = String(value || '').trim();
  if (!normalized) return fallback;
  return allowedValues.has(normalized) ? normalized : fallback;
};

const buildInitialForm = (product) => {
  if (!product) {
    return {
      name: '',
      status: 'publish',
      sku: '',
      price: '',
      regular_price: '',
      sale_price: '',
      stock_quantity: '',
      description: '',
      short_description: '',
      condition_check: '',
      packaging_style: 'in_wrap_nylon',
      return_policy: 'not_returnable',
      categories: '',
      image_id: '',
    };
  }
  return {
    name: product.name || '',
    status: product.status || 'publish',
    sku: product.sku || '',
    price: product.price || '',
    regular_price: product.regular_price || product.price || '',
    sale_price: product.sale_price || product.discount_price || '',
    stock_quantity: Number.isFinite(Number(product.stock_quantity)) ? String(product.stock_quantity) : '',
    description: product.description || '',
    short_description: product.short_description || '',
    condition_check: normalizeAllowedValue(product.condition_check, CONDITION_VALUE_SET, ''),
    packaging_style: normalizeAllowedValue(
      product.packaging_style,
      PACKAGING_VALUE_SET,
      'in_wrap_nylon',
    ),
    return_policy: normalizeAllowedValue(
      product.return_policy,
      RETURN_POLICY_VALUE_SET,
      'not_returnable',
    ),
    categories: normalizeEntityNames(product.categories).join(', '),
    image_id: product?.images?.[0]?.id ? String(product.images[0].id) : '',
  };
};

const emptyShortcutDefaults = {
  enabled: false,
  defaultTagIds: [],
  defaultCategoryIds: [],
  conditionCheck: '',
  packagingStyle: '',
  returnPolicy: '',
};

const normalizeShortcutIds = (value) =>
  Array.isArray(value)
    ? value.map((item) => String(item || '').trim()).filter(Boolean)
    : [];

const normalizeEntitySelectionIds = (value) =>
  Array.isArray(value)
    ? value
        .map((entry) => {
          if (entry == null) return '';
          if (typeof entry === 'string' || typeof entry === 'number') {
            return String(entry).trim();
          }
          if (typeof entry === 'object') {
            const id = String(entry.id || '').trim();
            if (id) return id;
            return String(entry.name || '').trim();
          }
          return '';
        })
        .filter(Boolean)
    : [];

const normalizeEntityNames = (value) =>
  Array.isArray(value)
    ? value
        .map((entry) => {
          if (entry == null) return '';
          if (typeof entry === 'string' || typeof entry === 'number') {
            return String(entry).trim();
          }
          if (typeof entry === 'object') {
            return String(entry.name || '').trim();
          }
          return '';
        })
        .filter(Boolean)
    : [];

const normalizeGallery = (images) => {
  const seen = new Set();
  const next = [];
  images.forEach((image) => {
    if (!image) return;
    const key = image.id ? `id:${image.id}` : image.url ? `url:${image.url}` : null;
    if (!key || seen.has(key)) return;
    seen.add(key);
    next.push(image);
  });
  return next;
};

function ProductPreviewModal({ isOpen, product, onClose, onExpand, onSaved, mode = 'modal' }) {
  const router = useRouter();
  const { pushAlert, confirmAlert } = useAlerts();
  const isFullPage = mode === 'page';
  const [isVisible, setIsVisible] = useState(false);
  const [form, setForm] = useState(() => buildInitialForm(product));
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isSkuAutoGenerated, setIsSkuAutoGenerated] = useState(
    Boolean(product?.sku_auto_generated),
  );
  const [slug, setSlug] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [autoSaveState, setAutoSaveState] = useState('idle');
  const [savedProduct, setSavedProduct] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [isPreviewFrameLoading, setIsPreviewFrameLoading] = useState(false);
  const [previewLoadProgress, setPreviewLoadProgress] = useState(0);
  const [isPreviewNavigationBlockedOpen, setIsPreviewNavigationBlockedOpen] = useState(false);
  const [blockedPreviewHref, setBlockedPreviewHref] = useState('');
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [galleryImages, setGalleryImages] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [pendingCategoryRequestIds, setPendingCategoryRequestIds] = useState([]);
  const [pendingCategoryRequests, setPendingCategoryRequests] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [frequentlyUsedCategories, setFrequentlyUsedCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState('');
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagsError, setTagsError] = useState('');
  const [tagsLoaded, setTagsLoaded] = useState(false);
  const [tagsPage, setTagsPage] = useState(0);
  const [tagsTotalPages, setTagsTotalPages] = useState(1);
  const [tagsLoadingMore, setTagsLoadingMore] = useState(false);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [createTagError, setCreateTagError] = useState('');
  const [isRequestingCategory, setIsRequestingCategory] = useState(false);
  const [requestCategoryError, setRequestCategoryError] = useState('');
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [availableBrands, setAvailableBrands] = useState([]);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [brandsError, setBrandsError] = useState('');
  const [brandsLoaded, setBrandsLoaded] = useState(false);
  const [variationEnabled, setVariationEnabled] = useState(false);
  const [availableAttributes, setAvailableAttributes] = useState([]);
  const [selectedAttributes, setSelectedAttributes] = useState([]);
  const [isAttributesLoading, setIsAttributesLoading] = useState(false);
  const [attributesError, setAttributesError] = useState('');
  const [expandedAttributes, setExpandedAttributes] = useState({});
  const [variations, setVariations] = useState([]);
  const [variationImagePickerId, setVariationImagePickerId] = useState('');
  const [isColorImageMapOpen, setIsColorImageMapOpen] = useState(false);
  const [colorImageMap, setColorImageMap] = useState({});
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [imageLibraryPurpose, setImageLibraryPurpose] = useState('product');
  const mainDescriptionEditorRef = useRef(null);
  const expandedDescriptionEditorRef = useRef(null);
  const autoSaveTimerRef = useRef(null);
  const autoSaveInFlightRef = useRef(false);
  const autoSaveQueuedRef = useRef(false);
  const lastSavedDraftFingerprintRef = useRef('');
  const hasInitializedExistingDraftRef = useRef(false);
  const [sizeGuides, setSizeGuides] = useState([]);
  const [isSizeGuidesLoading, setIsSizeGuidesLoading] = useState(false);
  const [sizeGuidesError, setSizeGuidesError] = useState('');
  const [sizeGuideEnabled, setSizeGuideEnabled] = useState(false);
  const [selectedSizeGuideId, setSelectedSizeGuideId] = useState('');
  const [useDefaultSizeGuides, setUseDefaultSizeGuides] = useState(true);
  const [showMobileMainHeader, setShowMobileMainHeader] = useState(true);
  const [isMobileActionsOpen, setIsMobileActionsOpen] = useState(false);
  const [activeAttributeEditorKey, setActiveAttributeEditorKey] = useState('');
  const [activeVariationEditorId, setActiveVariationEditorId] = useState('');
  const [shortcutDefaults, setShortcutDefaults] = useState(emptyShortcutDefaults);
  const [shortcutDefaultsLoaded, setShortcutDefaultsLoaded] = useState(false);
  const contentScrollRef = useRef(null);
  const previewIframeRef = useRef(null);
  const previewGuardCleanupRef = useRef(null);
  const hasAppliedShortcutDefaultsRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      setIsVisible(false);
      setIsDescriptionExpanded(false);
      return;
    }
    const timer = setTimeout(() => setIsVisible(true), 20);
    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (product?.id) {
      setShortcutDefaults(emptyShortcutDefaults);
      setShortcutDefaultsLoaded(true);
      return;
    }
    let isActive = true;
    setShortcutDefaultsLoaded(false);
    fetch('/api/user/profile', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!isActive) return;
        if (!response.ok) {
          setShortcutDefaults(emptyShortcutDefaults);
          setShortcutDefaultsLoaded(true);
          return;
        }
        const defaults = payload?.profile?.shortcuts?.productDefaults || {};
        const defaultTagIds = normalizeShortcutIds(defaults.defaultTagIds);
        const defaultCategoryIds = normalizeShortcutIds(defaults.defaultCategoryIds);
        setShortcutDefaults({
          enabled: defaults.enabled !== false,
          defaultTagIds:
            defaultTagIds.length > 0
              ? defaultTagIds
              : String(defaults.defaultTagId || '').trim()
                ? [String(defaults.defaultTagId || '').trim()]
                : [],
          defaultCategoryIds:
            defaultCategoryIds.length > 0
              ? defaultCategoryIds
              : String(defaults.defaultCategoryId || '').trim()
                ? [String(defaults.defaultCategoryId || '').trim()]
                : [],
          conditionCheck: String(defaults.conditionCheck || '').trim(),
          packagingStyle: String(defaults.packagingStyle || '').trim(),
          returnPolicy: String(defaults.returnPolicy || '').trim(),
        });
        setShortcutDefaultsLoaded(true);
      })
      .catch(() => {
        if (!isActive) return;
        setShortcutDefaults(emptyShortcutDefaults);
        setShortcutDefaultsLoaded(true);
      });
    return () => {
      isActive = false;
    };
  }, [isOpen, product?.id]);

  // Initialize selected categories when product changes
  useEffect(() => {
    if (product?.categories) {
      const categoryIds = normalizeEntitySelectionIds(product.categories);
      setSelectedCategories(categoryIds);
    } else {
      setSelectedCategories([]);
    }
    const pendingIds = Array.isArray(product?.pending_category_request_ids)
      ? product.pending_category_request_ids.map((id) => String(id)).filter(Boolean)
      : [];
    setPendingCategoryRequestIds(pendingIds);
  }, [product]);

  useEffect(() => {
    setIsSkuAutoGenerated(Boolean(product?.sku_auto_generated));
  }, [product?.sku_auto_generated]);

  useEffect(() => {
    if (product?.tags) {
      const tagIds = normalizeEntitySelectionIds(product.tags);
      setSelectedTags(tagIds);
    } else {
      setSelectedTags([]);
    }
  }, [product]);

  useEffect(() => {
    if (product?.brands) {
      const brandIds = normalizeEntitySelectionIds(product.brands);
      setSelectedBrands(brandIds);
    } else {
      setSelectedBrands([]);
    }
  }, [product]);

  useEffect(() => {
    setVariationEnabled(product?.product_type === 'variable');
  }, [product]);

  useEffect(() => {
    if (product?.size_guide?.id) {
      setSizeGuideEnabled(true);
      setSelectedSizeGuideId(String(product.size_guide.id));
      return;
    }
    setSizeGuideEnabled(false);
    setSelectedSizeGuideId('');
  }, [product]);

  useEffect(() => {
    const readPreference = () => {
      try {
        const raw = localStorage.getItem('agentic_use_default_size_guides');
        if (raw === null) return true;
        return raw === 'true';
      } catch (_error) {
        return true;
      }
    };
    setUseDefaultSizeGuides(readPreference());
    const handleStorage = (event) => {
      if (event.key === 'agentic_use_default_size_guides') {
        setUseDefaultSizeGuides(event.newValue !== 'false');
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleLoadCategories = useCallback(() => {
    if (categoriesLoaded || categoriesLoading) return;
    setCategoriesLoading(true);
    setCategoriesError('');
    fetchProductCategories()
      .then((payload) => {
        setAvailableCategories(Array.isArray(payload?.categories) ? payload.categories : []);
        setFrequentlyUsedCategories(
          Array.isArray(payload?.frequently_used) ? payload.frequently_used : [],
        );
        setCategoriesLoaded(true);
      })
      .catch((err) => {
        setAvailableCategories([]);
        setFrequentlyUsedCategories([]);
        setCategoriesError(err?.message || 'Unable to load categories.');
      })
      .finally(() => {
        setCategoriesLoading(false);
      });
  }, [categoriesLoaded, categoriesLoading]);

  const handleLoadCategoryRequests = useCallback(() => {
    fetchCategoryRequests({ status: 'pending', perPage: 100 })
      .then((payload) => {
        const items = Array.isArray(payload?.items) ? payload.items : [];
        setPendingCategoryRequests(items);
        setPendingCategoryRequestIds((prev) => {
          const allowedIds = new Set(
            items
              .map((item) => String(item?.id || '').trim())
              .filter(Boolean),
          );
          return (Array.isArray(prev) ? prev : [])
            .map((id) => String(id || '').trim())
            .filter((id) => id && allowedIds.has(id));
        });
      })
      .catch((_error) => {
        setPendingCategoryRequests([]);
      });
  }, []);

  const handleLoadTags = useCallback(() => {
    if (tagsLoaded || tagsLoading) return;
    setTagsLoading(true);
    setTagsError('');
    fetchProductTags({ page: 1, perPage: 50 })
      .then((payload) => {
        setAvailableTags(Array.isArray(payload?.tags) ? payload.tags : []);
        setTagsPage(Number(payload?.page || 1) || 1);
        setTagsTotalPages(Number(payload?.pages || 1) || 1);
        setTagsLoaded(true);
      })
      .catch((err) => {
        setAvailableTags([]);
        setTagsPage(0);
        setTagsTotalPages(1);
        setTagsError(err?.message || 'Unable to load tags.');
      })
      .finally(() => {
        setTagsLoading(false);
      });
  }, [tagsLoaded, tagsLoading]);

  const handleLoadMoreTags = useCallback(async () => {
    if (tagsLoading || tagsLoadingMore) return;
    if (!tagsLoaded) return;
    if (tagsPage >= tagsTotalPages) return;
    setTagsLoadingMore(true);
    setTagsError('');
    try {
      const nextPage = tagsPage + 1;
      const payload = await fetchProductTags({ page: nextPage, perPage: 50 });
      const incoming = Array.isArray(payload?.tags) ? payload.tags : [];
      setAvailableTags((prev) => {
        const existing = new Set((prev || []).map((item) => String(item?.id || '')));
        const merged = Array.isArray(prev) ? [...prev] : [];
        incoming.forEach((item) => {
          const id = String(item?.id || '');
          if (!id || existing.has(id)) return;
          existing.add(id);
          merged.push(item);
        });
        return merged;
      });
      setTagsPage(Number(payload?.page || nextPage) || nextPage);
      setTagsTotalPages(Number(payload?.pages || tagsTotalPages) || tagsTotalPages);
    } catch (err) {
      setTagsError(err?.message || 'Unable to load tags.');
    } finally {
      setTagsLoadingMore(false);
    }
  }, [tagsLoaded, tagsLoading, tagsLoadingMore, tagsPage, tagsTotalPages]);

  useEffect(() => {
    if (product?.id) return;
    if (!shortcutDefaultsLoaded) return;
    if (hasAppliedShortcutDefaultsRef.current) return;
    hasAppliedShortcutDefaultsRef.current = true;

    if (!shortcutDefaults.enabled) return;
    if (Array.isArray(shortcutDefaults.defaultCategoryIds) && shortcutDefaults.defaultCategoryIds.length) {
      handleLoadCategories();
    }
    if (Array.isArray(shortcutDefaults.defaultTagIds) && shortcutDefaults.defaultTagIds.length) {
      handleLoadTags();
    }

    setForm((prev) => ({
      ...prev,
      condition_check: prev.condition_check || shortcutDefaults.conditionCheck || '',
      packaging_style: shortcutDefaults.packagingStyle || prev.packaging_style,
      return_policy: shortcutDefaults.returnPolicy || prev.return_policy,
    }));

    if (Array.isArray(shortcutDefaults.defaultCategoryIds) && shortcutDefaults.defaultCategoryIds.length) {
      setSelectedCategories((prev) => {
        if (Array.isArray(prev) && prev.length) return prev;
        return [...shortcutDefaults.defaultCategoryIds];
      });
    }
    if (Array.isArray(shortcutDefaults.defaultTagIds) && shortcutDefaults.defaultTagIds.length) {
      setSelectedTags((prev) => {
        if (Array.isArray(prev) && prev.length) return prev;
        return [...shortcutDefaults.defaultTagIds];
      });
    }
  }, [
    handleLoadCategories,
    handleLoadTags,
    product?.id,
    shortcutDefaults.conditionCheck,
    shortcutDefaults.defaultCategoryIds,
    shortcutDefaults.defaultTagIds,
    shortcutDefaults.enabled,
    shortcutDefaults.packagingStyle,
    shortcutDefaults.returnPolicy,
    shortcutDefaultsLoaded,
  ]);

  const handleCreateTag = useCallback(
    async (tagName) => {
      const clean = String(tagName || '').trim();
      if (!clean) return null;
      setIsCreatingTag(true);
      setCreateTagError('');
      try {
        const created = await createProductTag({ name: clean });
        if (!created?.id) {
          throw new Error('Unable to create tag.');
        }
        setAvailableTags((prev) => {
          const next = Array.isArray(prev) ? [...prev] : [];
          if (!next.some((item) => String(item?.id) === String(created.id))) {
            next.unshift(created);
          }
          return next;
        });
        setSelectedTags((prev) => {
          const ids = Array.isArray(prev) ? prev.map((id) => String(id)) : [];
          if (ids.includes(String(created.id))) return prev;
          return [...(Array.isArray(prev) ? prev : []), created.id];
        });
        pushAlert({
          type: 'success',
          title: 'Product editor',
          message: `Tag "${created.name || clean}" created.`,
        });
        return created;
      } catch (err) {
        const message = err?.message || 'Unable to create tag.';
        setCreateTagError(message);
        pushAlert({
          type: 'error',
          title: 'Product editor',
          message,
        });
        return null;
      } finally {
        setIsCreatingTag(false);
      }
    },
    [pushAlert],
  );

  const handleRequestCategory = useCallback(
    async (categoryName) => {
      const clean = String(categoryName || '').trim();
      if (!clean) return null;
      setIsRequestingCategory(true);
      setRequestCategoryError('');
      try {
        const payload = await createCategoryRequest({
          name: clean,
          product_id: savedProduct?.id || product?.id || undefined,
        });
        const item = payload?.item || null;
        const existingCategory = payload?.existing_category || null;
        if (existingCategory?.id) {
          setAvailableCategories((prev) => {
            const next = Array.isArray(prev) ? [...prev] : [];
            if (!next.some((entry) => String(entry?.id) === String(existingCategory.id))) {
              next.push(existingCategory);
            }
            return next;
          });
          setSelectedCategories((prev) => {
            const ids = Array.isArray(prev) ? prev.map((id) => String(id)) : [];
            if (ids.includes(String(existingCategory.id))) return prev;
            return [...(Array.isArray(prev) ? prev : []), existingCategory.id];
          });
          pushAlert({
            type: 'success',
            title: 'Product editor',
            message: `Category "${existingCategory.name}" already exists and was selected.`,
          });
          return existingCategory;
        }
        if (!item?.id) {
          throw new Error('Unable to submit category request.');
        }
        setPendingCategoryRequests((prev) => {
          const next = Array.isArray(prev) ? [...prev] : [];
          if (!next.some((entry) => String(entry?.id) === String(item.id))) {
            next.unshift(item);
          }
          return next;
        });
        setPendingCategoryRequestIds((prev) => {
          const ids = Array.isArray(prev) ? prev.map((id) => String(id)) : [];
          if (ids.includes(String(item.id))) return prev;
          return [...(Array.isArray(prev) ? prev : []), item.id];
        });
        pushAlert({
          type: 'info',
          title: 'Product editor',
          message:
            'Category request submitted. Save this product as draft until admin approves it.',
        });
        return item;
      } catch (err) {
        const message = err?.message || 'Unable to submit category request.';
        setRequestCategoryError(message);
        pushAlert({
          type: 'error',
          title: 'Product editor',
          message,
        });
        return null;
      } finally {
        setIsRequestingCategory(false);
      }
    },
    [product?.id, pushAlert, savedProduct?.id],
  );

  const handleLoadBrands = useCallback(() => {
    if (brandsLoaded || brandsLoading) return;
    setBrandsLoading(true);
    setBrandsError('');
    fetchProductBrands()
      .then((payload) => {
        setAvailableBrands(Array.isArray(payload?.brands) ? payload.brands : []);
        setBrandsLoaded(true);
      })
      .catch((err) => {
        setAvailableBrands([]);
        setBrandsError(err?.message || 'Unable to load brands.');
      })
      .finally(() => {
        setBrandsLoading(false);
      });
  }, [brandsLoaded, brandsLoading]);

  useEffect(() => {
    if (!product?.variations || !Array.isArray(product.variations)) {
      setVariations([]);
      return;
    }
    const mapped = product.variations.map((variation, index) => ({
      id: variation.id || `saved-${index}`,
      attributes: variation.attributes || {},
      use_custom_price: Boolean(variation.regular_price || variation.sale_price),
      regular_price: variation.regular_price ?? '',
      sale_price: variation.sale_price ?? '',
      sku: variation.sku || '',
      stock_quantity:
        variation.stock_quantity !== undefined && variation.stock_quantity !== null
          ? String(variation.stock_quantity)
          : '',
      image_id: variation.image_id || '',
    }));
    setVariations(mapped);
  }, [product]);

  useEffect(() => {
    if (!isOpen) return;
    setAttributesError('');
    setIsAttributesLoading(true);
    let isActive = true;
    fetchProductAttributes()
      .then((payload) => {
        if (!isActive) return;
        const items = Array.isArray(payload?.items) ? payload.items : [];
        const mapped = items.map((attribute) => ({
          id: attribute.id,
          name: attribute.name,
          label: attribute.name,
          taxonomy: attribute.slug,
          type: attribute.type || null,
          terms: Array.isArray(attribute.options) ? attribute.options : [],
        }));
        setAvailableAttributes(mapped);
      })
      .catch((loadError) => {
        if (!isActive) return;
        setAvailableAttributes([]);
        setAttributesError(loadError?.message || 'Unable to load attributes.');
      })
      .finally(() => {
        if (!isActive) return;
        setIsAttributesLoading(false);
      });

    const storedSiteId = readStoredSiteId();
    const token = localStorage.getItem('agentic_auth_token');
    if (storedSiteId && token) {
      setIsSizeGuidesLoading(true);
      fetchSizeGuides({ siteId: storedSiteId, token })
        .then((payload) => {
          if (!isActive) return;
          setSizeGuides(Array.isArray(payload?.size_guides) ? payload.size_guides : []);
        })
        .catch((loadError) => {
          if (!isActive) return;
          setSizeGuides([]);
          setSizeGuidesError(loadError?.message || 'Unable to load size guides.');
        })
        .finally(() => {
          if (!isActive) return;
          setIsSizeGuidesLoading(false);
        });
    } else {
      setSizeGuides([]);
      setIsSizeGuidesLoading(false);
      setSizeGuidesError('');
    }
    handleLoadCategoryRequests();
    return () => {
      isActive = false;
    };
  }, [handleLoadCategoryRequests, isOpen]);

  const isUuid = (value) =>
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  const isNumericId = (value) => Number.isFinite(Number(value));
  const buildNameList = (selected, available) => {
    const byId = new Map(available.map((item) => [String(item.id), item.name]));
    return selected
      .map((id) => byId.get(String(id)) || String(id))
      .filter(Boolean);
  };
  const resolveTaxonomyPayload = (selected, available, idKey, nameKey) => {
    if (!Array.isArray(selected) || selected.length === 0) return {};
    const allIds = selected.every((value) => isNumericId(value) || isUuid(String(value)));
    if (allIds) {
      return { [idKey]: selected };
    }
    const names = buildNameList(selected, available);
    return names.length ? { [nameKey]: names } : {};
  };

  const visibleSizeGuides = useMemo(() => {
    if (useDefaultSizeGuides) return sizeGuides;
    return sizeGuides.filter((guide) => !guide.is_default);
  }, [sizeGuides, useDefaultSizeGuides]);

  useEffect(() => {
    if (!sizeGuideEnabled) return;
    if (!selectedSizeGuideId) return;
    const selected = sizeGuides.find((guide) => String(guide.id) === String(selectedSizeGuideId));
    if (!selected) return;
    if (!useDefaultSizeGuides && selected.is_default) {
      setSelectedSizeGuideId('');
    }
  }, [sizeGuides, selectedSizeGuideId, sizeGuideEnabled, useDefaultSizeGuides]);

  useEffect(() => {
    if (!product?.variations || !Array.isArray(product.variations)) {
      if (!product?.attributes || !Array.isArray(product.attributes)) {
        setSelectedAttributes([]);
        setExpandedAttributes({});
      }
      return;
    }
    if (!availableAttributes.length) return;
    if (selectedAttributes.length) return;

    const selectedByAttribute = new Map();
    product.variations.forEach((variation) => {
      const attrs = variation.attributes || {};
      Object.entries(attrs).forEach(([key, value]) => {
        if (!key || !value) return;
        const list = selectedByAttribute.get(key) || new Set();
        list.add(String(value));
        selectedByAttribute.set(key, list);
      });
    });

    const normalizeOptionKey = (term) => {
      if (!term) return '';
      return term.slug || toSlug(term.name || '');
    };

    const next = availableAttributes
      .map((attribute) => {
        const attributeKey = attribute.taxonomy || attribute.name;
        const selectedValues = selectedByAttribute.get(attributeKey);
        if (!selectedValues || selectedValues.size === 0) return null;
        const terms = Array.isArray(attribute.terms) ? attribute.terms : [];
        const selectedOptionIds = terms
          .filter((term) => {
            const normalized = normalizeOptionKey(term);
            return normalized && selectedValues.has(normalized);
          })
          .map((term) => term.id || term.name);
        return {
          ...attribute,
          selectedOptionIds,
        };
      })
      .filter(Boolean);

    setSelectedAttributes(next);
    const expanded = {};
    next.forEach((attribute) => {
      expanded[attribute.taxonomy || attribute.name] = false;
    });
    setExpandedAttributes(expanded);
  }, [availableAttributes, product]);

  useEffect(() => {
    const nextForm = buildInitialForm(product);
    hasAppliedShortcutDefaultsRef.current = false;
    setForm(nextForm);
    setCurrentStepIndex(0);
    setAutoSaveState('idle');
    hasInitializedExistingDraftRef.current = false;
    setSlug(product?.slug || toSlug(product?.name || ''));
    setError('');
    setStatusMessage('');
    setSavedProduct(null);
    setPreviewUrl(buildProductUrl(product, nextForm.name, { preview: true }));
    setDraftReady(false);
    if (Array.isArray(product?.images) && product.images.length) {
      const nextGallery = product.images
        .map((image) => ({
          id: image?.id ? String(image.id) : '',
          url: image?.url || image?.src || '',
          title: image?.alt || product.name || 'Product image',
        }))
        .filter((image) => image.id || image.url);
      setGalleryImages(nextGallery);
      setSelectedImage(nextGallery[0] || null);
    } else {
      setSelectedImage(null);
      setGalleryImages([]);
    }
  }, [product]);

  useEffect(
    () => () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!isOpen) return;
    setShowMobileMainHeader(true);
    if (contentScrollRef.current) {
      contentScrollRef.current.scrollTop = 0;
    }
  }, [isOpen, currentStepIndex]);

  useEffect(() => {
    if (!isOpen || !isFullPage) return;
    const handleWindowScroll = () => {
      const top = window.scrollY || 0;
      const nextVisible = top < 20;
      setShowMobileMainHeader((prev) => (prev === nextVisible ? prev : nextVisible));
    };
    handleWindowScroll();
    window.addEventListener('scroll', handleWindowScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleWindowScroll);
  }, [isFullPage, isOpen]);

  const previewSlug = useMemo(() => slug || toSlug(form.name), [form.name, slug]);
  const previewImage = selectedImage?.url || product?.images?.[0]?.url || product?.images?.[0]?.src || '';
  const previewCandidateUrl = useMemo(
    () => buildProductUrl(savedProduct || { slug: previewSlug }, previewSlug, { preview: true }),
    [previewSlug, savedProduct],
  );
  const previewEmbedUrl = useMemo(
    () => withEmbedPreviewParam(previewUrl || previewCandidateUrl),
    [previewCandidateUrl, previewUrl],
  );
  const previewFrameSrc = useMemo(() => {
    if (previewEmbedUrl) return previewEmbedUrl;
    if (!previewSlug) return '';
    return `/product/${encodeURIComponent(previewSlug)}?preview=1&embed_preview=1`;
  }, [previewEmbedUrl, previewSlug]);
  const showPreviewBlockedModal = useCallback((href = '') => {
    setBlockedPreviewHref(String(href || ''));
    setIsPreviewNavigationBlockedOpen(true);
  }, []);
  const isAllowedPreviewLocation = useCallback(
    (href) => {
      if (!href || !previewFrameSrc || typeof window === 'undefined') return true;
      try {
        const current = new URL(href, window.location.origin);
        const expected = new URL(previewFrameSrc, window.location.origin);
        return (
          current.origin === expected.origin &&
          current.pathname === expected.pathname &&
          current.searchParams.get('preview') === '1' &&
          current.searchParams.get('embed_preview') === '1'
        );
      } catch (_error) {
        return false;
      }
    },
    [previewFrameSrc],
  );
  const installPreviewNavigationGuard = useCallback(() => {
    const iframe = previewIframeRef.current;
    if (!iframe) return;
    if (previewGuardCleanupRef.current) {
      previewGuardCleanupRef.current();
      previewGuardCleanupRef.current = null;
    }
    try {
      const frameWindow = iframe.contentWindow;
      const frameDocument = iframe.contentDocument || frameWindow?.document;
      if (!frameWindow || !frameDocument) return;
      const handleClickCapture = (event) => {
        const target = event.target;
        const anchor =
          target && typeof target.closest === 'function' ? target.closest('a[href]') : null;
        if (!anchor) return;
        const href = anchor.getAttribute('href') || anchor.href || '';
        if (!href || href.startsWith('#')) return;
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') {
          event.stopImmediatePropagation();
        }
        showPreviewBlockedModal(anchor.href || href);
      };
      const handleSubmitCapture = (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') {
          event.stopImmediatePropagation();
        }
        showPreviewBlockedModal('');
      };
      const originalOpen = frameWindow.open;
      frameWindow.open = (...args) => {
        showPreviewBlockedModal(String(args?.[0] || ''));
        return null;
      };
      frameDocument.addEventListener('click', handleClickCapture, true);
      frameDocument.addEventListener('submit', handleSubmitCapture, true);
      previewGuardCleanupRef.current = () => {
        frameDocument.removeEventListener('click', handleClickCapture, true);
        frameDocument.removeEventListener('submit', handleSubmitCapture, true);
        try {
          frameWindow.open = originalOpen;
        } catch (_error) {
          // ignore
        }
      };
    } catch (_error) {
      // ignore cross-document access errors
    }
  }, [showPreviewBlockedModal]);
  const isEditing = Boolean(product?.id);
  const currentStep = PRODUCT_EDITOR_STEPS[currentStepIndex] || PRODUCT_EDITOR_STEPS[0];
  const currentStepId = currentStep.id;
  const canProceedCurrentStep = isStepValid({
    stepId: currentStepId,
    form,
    selectedCategories,
    pendingCategoryRequestIds,
    selectedTags,
    variationEnabled,
    variations,
  });
  const furthestAccessibleStepIndex = getFurthestAccessibleStepIndex({
    form,
    selectedCategories,
    pendingCategoryRequestIds,
    selectedTags,
    variationEnabled,
    variations,
  });
  const canShowGoLiveMenuOption = furthestAccessibleStepIndex >= PRODUCT_EDITOR_STEPS.length - 1;
  const isIdentityStep = currentStepId === 'identity';
  const isCommercialStep = currentStepId === 'commercial';
  const isConfigurationStep = currentStepId === 'configuration';
  const isMetadataStep = currentStepId === 'metadata';
  const isReviewStep = currentStepId === 'review';
  const getMissingRequiredFieldsForStep = useCallback(
    (stepId) => {
      const hasValue = (value) => String(value ?? '').trim().length > 0;
      const missing = [];

      if (stepId === 'identity') {
        if (!hasValue(form.name)) missing.push('Product name');
        if (!hasValue(form.short_description)) missing.push('Short description');
        if (!hasValue(form.image_id)) missing.push('Main image');
      } else if (stepId === 'commercial') {
        if (!hasValue(form.regular_price || form.price)) missing.push('Base price');
        if (!selectedCategories.length && !pendingCategoryRequestIds.length) missing.push('Category');
        if (!selectedTags.length) missing.push('Tag');
      } else if (stepId === 'configuration') {
        if (variationEnabled && !variations.length) missing.push('At least one variation');
      } else if (stepId === 'metadata') {
        if (!hasValue(form.condition_check)) missing.push('Condition check');
      }

      return missing;
    },
    [form.condition_check, form.image_id, form.name, form.price, form.regular_price, form.short_description, pendingCategoryRequestIds.length, selectedCategories.length, selectedTags.length, variationEnabled, variations.length],
  );
  const mobileStepIndex = Math.min(currentStepIndex, MOBILE_STEP_META.length - 1);
  const canDraftSave = Boolean(
    form.name.trim() &&
      (form.regular_price || form.price) &&
      form.image_id &&
      (selectedCategories.length || pendingCategoryRequestIds.length) &&
      form.condition_check,
  );
  useEffect(() => {
    if (!isOpen || !isReviewStep || !canDraftSave || !previewFrameSrc) {
      setIsPreviewFrameLoading(false);
      setPreviewLoadProgress(0);
      return;
    }
    setIsPreviewFrameLoading(true);
    setPreviewLoadProgress(8);
    let cancelled = false;
    const timer = window.setInterval(() => {
      if (cancelled) return;
      setPreviewLoadProgress((prev) => {
        if (prev >= 92) return prev;
        const step = prev < 40 ? 6 : prev < 70 ? 4 : 2;
        return Math.min(92, prev + step);
      });
    }, 150);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [canDraftSave, isOpen, isReviewStep, previewFrameSrc]);
  useEffect(
    () => () => {
      if (previewGuardCleanupRef.current) {
        previewGuardCleanupRef.current();
        previewGuardCleanupRef.current = null;
      }
    },
    [],
  );

  const selectedAttributesWithOptions = useMemo(() => {
    return selectedAttributes
      .map((attribute) => {
        const selectedOptions = attribute.terms.filter((term) =>
          attribute.selectedOptionIds.includes(term.id || term.name)
        );
        return { ...attribute, selectedOptions };
      })
      .filter((attribute) => attribute.selectedOptions.length > 0);
  }, [selectedAttributes]);
  const activeAttributeEditor = useMemo(
    () =>
      selectedAttributes.find(
        (attribute) => (attribute.taxonomy || attribute.name) === activeAttributeEditorKey,
      ) || null,
    [activeAttributeEditorKey, selectedAttributes],
  );
  const activeVariationEditor = useMemo(
    () => variations.find((variation) => variation.id === activeVariationEditorId) || null,
    [activeVariationEditorId, variations],
  );
  const defaultVariationStockQuantity = useMemo(() => {
    const raw = String(form.stock_quantity ?? '').trim();
    if (!raw) return '';
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return '';
    return String(Math.max(0, Math.floor(parsed)));
  }, [form.stock_quantity]);
  const draftSyncFingerprint = useMemo(() => {
    if (!canDraftSave) return '';
    return JSON.stringify({
      form: {
        name: form.name || '',
        status: form.status || '',
        sku: form.sku || '',
        price: form.price || '',
        regular_price: form.regular_price || '',
        sale_price: form.sale_price || '',
        stock_quantity: form.stock_quantity || '',
        description: form.description || '',
        short_description: form.short_description || '',
        condition_check: form.condition_check || '',
        packaging_style: form.packaging_style || '',
        return_policy: form.return_policy || '',
        image_id: form.image_id || '',
      },
      selectedCategories: [...selectedCategories].map((item) => String(item)).sort(),
      pendingCategoryRequestIds: [...pendingCategoryRequestIds].map((item) => String(item)).sort(),
      selectedTags: [...selectedTags].map((item) => String(item)).sort(),
      selectedBrands: [...selectedBrands].map((item) => String(item)).sort(),
      variationEnabled,
      variations: variations || [],
      attributes: selectedAttributesWithOptions || [],
      sizeGuideEnabled,
      selectedSizeGuideId: selectedSizeGuideId || '',
    });
  }, [
    canDraftSave,
    form,
    selectedAttributesWithOptions,
    pendingCategoryRequestIds,
    selectedBrands,
    selectedCategories,
    selectedSizeGuideId,
    selectedTags,
    sizeGuideEnabled,
    variationEnabled,
    variations,
  ]);
  const hasUnsyncedDraft =
    Boolean(draftSyncFingerprint) &&
    draftSyncFingerprint !== lastSavedDraftFingerprintRef.current;
  useEffect(() => {
    if (!product?.id) return;
    if (!canDraftSave) return;
    if (!draftSyncFingerprint) return;
    if (hasInitializedExistingDraftRef.current) return;
    lastSavedDraftFingerprintRef.current = draftSyncFingerprint;
    hasInitializedExistingDraftRef.current = true;
  }, [canDraftSave, draftSyncFingerprint, product?.id]);

  const colorAttribute = useMemo(
    () =>
      selectedAttributesWithOptions.find((attribute) => {
        const key = String(attribute.taxonomy || attribute.name || '').toLowerCase();
        return key === 'color' || key === 'colour' || key.includes('color') || key.includes('colour');
      }) || null,
    [selectedAttributesWithOptions],
  );

  const colorAttributeKey = colorAttribute
    ? String(colorAttribute.taxonomy || colorAttribute.name || '')
    : '';

  const colorOptionsForMapping = useMemo(() => {
    if (!colorAttribute) return [];
    return (Array.isArray(colorAttribute.selectedOptions) ? colorAttribute.selectedOptions : [])
      .map((option) => {
        const value = String(option?.slug || toSlug(option?.name || '')).trim();
        const label = String(option?.name || option?.slug || '').trim();
        if (!value || !label) return null;
        return { value, label };
      })
      .filter(Boolean);
  }, [colorAttribute]);

  const selectableAttributes = useMemo(() => {
    return availableAttributes.filter(
      (attribute) =>
        !selectedAttributes.some((selected) => selected.taxonomy === attribute.taxonomy),
    );
  }, [availableAttributes, selectedAttributes]);

  const variationCombinations = useMemo(() => {
    if (!selectedAttributesWithOptions.length) return [];
    return selectedAttributesWithOptions.reduce(
      (acc, attribute) => {
        const next = [];
        acc.forEach((combo) => {
          attribute.selectedOptions.forEach((option) => {
            next.push({
              attributes: {
                ...combo.attributes,
                [attribute.taxonomy || attribute.name]: option.slug || toSlug(option.name || ''),
              },
              label: `${combo.label}${combo.label ? ' / ' : ''}${option.name}`,
            });
          });
        });
        return next;
      },
      [{ attributes: {}, label: '' }],
    );
  }, [selectedAttributesWithOptions]);

  const handleAddAttribute = (attribute) => {
    if (!attribute) return;
    const exists = selectedAttributes.some((item) => item.taxonomy === attribute.taxonomy);
    if (exists) return;
    setSelectedAttributes((prev) => [
      ...prev,
      {
        id: attribute.id,
        name: attribute.name,
        label: attribute.label || attribute.name,
        taxonomy: attribute.taxonomy,
        terms: Array.isArray(attribute.terms) ? attribute.terms : [],
        selectedOptionIds: [],
        type: attribute.type || null,
      },
    ]);
    setExpandedAttributes((prev) => ({ ...prev, [attribute.taxonomy]: false }));
    setActiveAttributeEditorKey(attribute.taxonomy || attribute.name || '');
  };

  const handleToggleOption = (attributeKey, option) => {
    setSelectedAttributes((prev) =>
      prev.map((attribute) => {
        const key = attribute.taxonomy || attribute.name;
        if (key !== attributeKey) return attribute;
        const optionId = option.id || option.name;
        const exists = attribute.selectedOptionIds.includes(optionId);
        return {
          ...attribute,
          selectedOptionIds: exists
            ? attribute.selectedOptionIds.filter((id) => id !== optionId)
            : [...attribute.selectedOptionIds, optionId],
        };
      }),
    );
  };

  const handleRemoveAttribute = (attributeKey) => {
    setSelectedAttributes((prev) =>
      prev.filter((attribute) => (attribute.taxonomy || attribute.name) !== attributeKey),
    );
    setActiveAttributeEditorKey((prev) => (prev === attributeKey ? '' : prev));
    setExpandedAttributes((prev) => {
      const next = { ...prev };
      delete next[attributeKey];
      return next;
    });
  };

  const handleAutoGenerateVariations = () => {
    if (!variationEnabled) return;
    if (!variationCombinations.length) {
      pushAlert({
        type: 'warning',
        title: 'No options selected',
        message: 'Select attribute options before generating variants.',
      });
      return;
    }
    const colorCounters = {};
    const defaultStockQuantity = defaultVariationStockQuantity;
    const next = variationCombinations.map((combo, index) => {
      const colorValue = colorAttributeKey ? String(combo?.attributes?.[colorAttributeKey] || '').trim() : '';
      const offset = Number(colorCounters[colorValue] || 0);
      const mappedImageIds = colorValue && Array.isArray(colorImageMap[colorValue])
        ? colorImageMap[colorValue].map((id) => String(id || '')).filter(Boolean)
        : [];
      const mappedImageId = mappedImageIds.length ? mappedImageIds[offset % mappedImageIds.length] : '';
      if (colorValue && mappedImageId) {
        colorCounters[colorValue] = offset + 1;
      }
      return {
        id: `auto-${Date.now()}-${index}`,
        attributes: combo.attributes,
        use_custom_price: false,
        regular_price: '',
        sale_price: '',
        sku: '',
        stock_quantity: defaultStockQuantity,
        image_id: mappedImageId,
      };
    });
    setVariations(next);
  };

  const seedColorImageMapFromVariations = useCallback(() => {
    if (!colorAttributeKey) return {};
    const seeded = {};
    variations.forEach((variation) => {
      const colorValue = String(variation?.attributes?.[colorAttributeKey] || '').trim();
      const imageId = variation?.image_id ? String(variation.image_id) : '';
      if (!colorValue || !imageId) return;
      const current = Array.isArray(seeded[colorValue]) ? seeded[colorValue] : [];
      if (!current.includes(imageId)) {
        seeded[colorValue] = [...current, imageId];
      }
    });
    return seeded;
  }, [colorAttributeKey, variations]);

  const getMappedColorsForImage = useCallback(
    (imageId) => {
      const imageKey = String(imageId || '');
      if (!imageKey) return [];
      return Object.entries(colorImageMap)
        .filter(([, mappedImageIds]) =>
          (Array.isArray(mappedImageIds) ? mappedImageIds : [mappedImageIds])
            .map((id) => String(id || ''))
            .includes(imageKey),
        )
        .map(([colorValue]) => colorValue);
    },
    [colorImageMap],
  );

  const getMappedColorForImage = useCallback(
    (imageId) => getMappedColorsForImage(imageId)[0] || '',
    [getMappedColorsForImage],
  );

  const handleAssignColorToImage = useCallback((imageId, colorValue) => {
    const imageKey = String(imageId || '');
    const colorKey = String(colorValue || '').trim();
    if (!imageKey) return;
    setColorImageMap((prev) => {
      const next = { ...prev };
      Object.entries(next).forEach(([key, ids]) => {
        const currentIds = (Array.isArray(ids) ? ids : [ids]).map((id) => String(id || '')).filter(Boolean);
        const filtered = currentIds.filter((id) => id !== imageKey);
        if (filtered.length > 0) {
          next[key] = filtered;
        } else {
          delete next[key];
        }
      });
      if (colorKey) {
        const current = Array.isArray(next[colorKey]) ? next[colorKey].map((id) => String(id || '')) : [];
        if (!current.includes(imageKey)) {
          next[colorKey] = [...current, imageKey];
        }
      }
      return next;
    });
  }, []);

  const pickMappedImageForColor = useCallback(
    (colorValue, offset = 0) => {
      const colorKey = String(colorValue || '').trim();
      if (!colorKey) return '';
      const mappedImageIds = Array.isArray(colorImageMap[colorKey])
        ? colorImageMap[colorKey].map((id) => String(id || '')).filter(Boolean)
        : [];
      if (!mappedImageIds.length) return '';
      return mappedImageIds[offset % mappedImageIds.length] || '';
    },
    [colorImageMap],
  );

  const handleOpenColorImageMap = () => {
    const seededMap = seedColorImageMapFromVariations();
    setColorImageMap((prev) => {
      const next = { ...seededMap };
      Object.entries(prev || {}).forEach(([colorValue, imageIds]) => {
        const existing = Array.isArray(next[colorValue]) ? next[colorValue].map((id) => String(id || '')) : [];
        const incoming = (Array.isArray(imageIds) ? imageIds : [imageIds])
          .map((id) => String(id || ''))
          .filter(Boolean);
        const merged = [...existing];
        incoming.forEach((id) => {
          if (!merged.includes(id)) merged.push(id);
        });
        if (merged.length) next[colorValue] = merged;
      });
      return next;
    });
    setIsColorImageMapOpen(true);
  };

  const handleApplyColorImageMap = () => {
    if (!colorAttributeKey) {
      setIsColorImageMapOpen(false);
      return;
    }
    let updatedCount = 0;
    const colorCounters = {};
    setVariations((prev) =>
      prev.map((variation) => {
        const colorValue = String(variation?.attributes?.[colorAttributeKey] || '').trim();
        const mappedImageId = pickMappedImageForColor(colorValue, Number(colorCounters[colorValue] || 0));
        if (!colorValue || !mappedImageId) return variation;
        colorCounters[colorValue] = Number(colorCounters[colorValue] || 0) + 1;
        if (String(variation.image_id || '') === mappedImageId) return variation;
        updatedCount += 1;
        return { ...variation, image_id: mappedImageId };
      }),
    );
    if (updatedCount > 0) {
      setStatusMessage(`Assigned images to ${updatedCount} variation${updatedCount === 1 ? '' : 's'}.`);
    }
    setIsColorImageMapOpen(false);
  };

  const handleAddManualVariation = () => {
    if (!variationEnabled) return;
    const attributes = {};
    selectedAttributesWithOptions.forEach((attribute) => {
      attributes[attribute.taxonomy || attribute.name] = '';
    });
    const nextVariationId = `manual-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setVariations((prev) => [
      ...prev,
      {
        id: nextVariationId,
        attributes,
        use_custom_price: false,
        regular_price: '',
        sale_price: '',
        sku: '',
        stock_quantity: defaultVariationStockQuantity,
        image_id: '',
      },
    ]);
    setActiveVariationEditorId(nextVariationId);
  };

  const handleClearAllVariations = async () => {
    if (!variations.length) return;
    const confirmed = await confirmAlert({
      type: 'warning',
      title: 'Clear all variations?',
      message: `Clear all ${variations.length} variation${variations.length === 1 ? '' : 's'}?`,
      confirmLabel: 'Allow',
      cancelLabel: 'Deny',
    });
    if (!confirmed) return;
    setVariations([]);
    setVariationImagePickerId('');
    setActiveVariationEditorId('');
    setStatusMessage('All variations cleared.');
  };

  const updateVariation = (variationId, updates) => {
    setVariations((prev) =>
      prev.map((variation) =>
        variation.id === variationId ? { ...variation, ...updates } : variation,
      ),
    );
  };

  const updateVariationAttribute = (variationId, attributeKey, value) => {
    setVariations((prev) =>
      prev.map((variation) => {
        if (variation.id !== variationId) return variation;
        const nextAttributes = {
          ...variation.attributes,
          [attributeKey]: value,
        };
        let nextImageId = variation.image_id;
        if (
          colorAttributeKey &&
          attributeKey === colorAttributeKey &&
          (!nextImageId || !String(nextImageId).trim())
        ) {
          const mappedImageId = pickMappedImageForColor(value, 0);
          if (mappedImageId) {
            nextImageId = mappedImageId;
          }
        }
        return {
          ...variation,
          attributes: nextAttributes,
          image_id: nextImageId,
        };
      }),
    );
  };

  const removeVariation = (variationId) => {
    setVariations((prev) => prev.filter((variation) => variation.id !== variationId));
    if (variationImagePickerId === variationId) {
      setVariationImagePickerId('');
    }
    if (activeVariationEditorId === variationId) {
      setActiveVariationEditorId('');
    }
  };

  const buildVariationLabel = (variation) => {
    const parts = [];
    Object.entries(variation.attributes || {}).forEach(([attributeKey, optionSlug]) => {
      const attribute = selectedAttributesWithOptions.find(
        (item) => (item.taxonomy || item.name) === attributeKey,
      );
      if (!attribute) return;
      const option = attribute.selectedOptions.find(
        (opt) => (opt.slug || toSlug(opt.name || '')) === optionSlug,
      );
      if (option?.name) {
        parts.push(option.name);
      }
    });
    return parts.join(' / ');
  };

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };
  const handleBasePriceChange = (event) => {
    const nextValue = event.target.value;
    setForm((prev) => ({
      ...prev,
      regular_price: nextValue,
      price: nextValue,
    }));
  };

  const buildAttributePayload = useCallback(() => {
    if (!variationEnabled) return [];
    return selectedAttributesWithOptions.map((attribute) => ({
      name: attribute.name || attribute.label,
      label: attribute.label || attribute.name,
      taxonomy: attribute.taxonomy || '',
      options: attribute.selectedOptions.map((option) => option.name),
    }));
  }, [selectedAttributesWithOptions, variationEnabled]);

  const buildVariationPayload = useCallback(() => {
    if (!variationEnabled || !variations.length) return [];
    return variations.map((variation) => ({
      attributes: variation.attributes,
      regular_price: variation.regular_price ?? '',
      sale_price: variation.sale_price ?? '',
      sku: variation.sku,
      stock_quantity:
        variation.stock_quantity !== '' && variation.stock_quantity !== undefined
          ? String(variation.stock_quantity)
          : '',
      image_id: variation.image_id,
    }));
  }, [variationEnabled, variations]);

  const handleSave = async ({ statusOverride } = {}) => {
    if (!form.name.trim()) {
      setError('Product name is required.');
      return;
    }
    const basePrice = form.regular_price || form.price;
    if (!basePrice) {
      setError('Base price is required.');
      return;
    }
    if (!form.image_id) {
      setError('Main image is required.');
      return;
    }
    if (!selectedCategories.length && !pendingCategoryRequestIds.length) {
      setError('Select at least one category or request a new category.');
      return;
    }
    if (!selectedTags.length) {
      setError('Select at least one tag.');
      return;
    }
    if (!form.condition_check) {
      setError('Select a condition check before saving.');
      return;
    }
    setIsSaving(true);
    setError('');
    setStatusMessage('');
    try {
      // Prepare form data with selected categories
      const formData = {
        ...form,
        sku: isSkuAutoGenerated ? '' : form.sku,
        ...resolveTaxonomyPayload(selectedCategories, availableCategories, 'category_ids', 'category_names'),
        pending_category_request_ids: pendingCategoryRequestIds,
        ...resolveTaxonomyPayload(selectedTags, availableTags, 'tag_ids', 'tag_names'),
        ...resolveTaxonomyPayload(selectedBrands, availableBrands, 'brand_ids', 'brand_names'),
        product_type: variationEnabled ? 'variable' : 'simple',
        attributes: buildAttributePayload(),
        variations: buildVariationPayload(),
        size_guide_id: sizeGuideEnabled ? selectedSizeGuideId : '',
      };

      const nextForm = statusOverride ? { ...formData, status: statusOverride } : formData;
      if (statusOverride && statusOverride !== form.status) {
        setForm(nextForm);
      }
      const existingId = savedProduct?.id || product?.id;
      const payload = buildProductPayload(nextForm, {
        mode: existingId ? 'update' : 'create',
      });
      const saved = existingId
        ? await updateProduct({ id: existingId, updates: payload })
        : await createProduct({ form: nextForm });
      const savedStatus = String(saved?.status || '').trim().toLowerCase();
      const isPublished = savedStatus === 'publish';
      const publishMeta = saved?.__publishMeta && typeof saved.__publishMeta === 'object'
        ? saved.__publishMeta
        : null;
      const reviewBrandName = String(publishMeta?.review_brand_name || '').trim();
      setStatusMessage(
        statusOverride === 'publish' && !isPublished
          ? reviewBrandName
            ? `Publish request submitted. ${reviewBrandName} requires admin review before product can go live.`
            : 'Publish request submitted. Product remains in draft pending admin review.'
          : isEditing
            ? 'Product updated.'
            : 'Product saved.',
      );
      lastSavedDraftFingerprintRef.current = draftSyncFingerprint || '';
      setSavedProduct(saved);
      setForm((prev) => ({
        ...prev,
        sku: saved?.sku || prev.sku,
        status: savedStatus || prev.status,
      }));
      setIsSkuAutoGenerated(Boolean(saved?.sku_auto_generated));
      const nextUrl = buildProductUrl(saved, previewSlug, { preview: !isPublished });
      setPreviewUrl(nextUrl);
      if (onSaved) {
        onSaved(saved);
      }
      if (statusOverride === 'publish' && isPublished && nextUrl) {
        const resolvedUrl = new URL(nextUrl, window.location.origin);
        const destination = `${resolvedUrl.pathname}${resolvedUrl.search}${resolvedUrl.hash}`;
        window.open(destination, '_blank', 'noopener,noreferrer');
        if (mode === 'modal') {
          onClose?.();
        } else {
          router.push(destination);
        }
      }
    } catch (saveError) {
      setError(saveError?.message || 'Unable to save product.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDraftSave = useCallback(async ({ background = false } = {}) => {
    if (!canDraftSave) return '';
    if (background && !hasUnsyncedDraft) return '';
    const basePrice = form.regular_price || form.price;
    if (!basePrice || !form.image_id || (!selectedCategories.length && !pendingCategoryRequestIds.length) || !form.condition_check) return '';
    if (!background) {
      setIsDraftSaving(true);
    } else {
      setAutoSaveState('saving');
    }
    setDraftReady(false);
    try {
      const draftForm = {
        ...form,
        sku: isSkuAutoGenerated ? '' : form.sku,
        status: 'draft',
        ...resolveTaxonomyPayload(selectedCategories, availableCategories, 'category_ids', 'category_names'),
        pending_category_request_ids: pendingCategoryRequestIds,
        ...resolveTaxonomyPayload(selectedTags, availableTags, 'tag_ids', 'tag_names'),
        ...resolveTaxonomyPayload(selectedBrands, availableBrands, 'brand_ids', 'brand_names'),
        product_type: variationEnabled ? 'variable' : 'simple',
        attributes: buildAttributePayload(),
        variations: buildVariationPayload(),
        size_guide_id: sizeGuideEnabled ? selectedSizeGuideId : '',
      };
      const existingId = savedProduct?.id || product?.id;
      const payload = buildProductPayload(draftForm, {
        mode: existingId ? 'update' : 'create',
      });
      const saved = existingId
        ? await updateProduct({ id: existingId, updates: payload })
        : await createProduct({ form: draftForm });
      lastSavedDraftFingerprintRef.current = draftSyncFingerprint || '';
      setSavedProduct(saved);
      setForm((prev) => ({ ...prev, sku: saved?.sku || prev.sku }));
      setIsSkuAutoGenerated(Boolean(saved?.sku_auto_generated));
      const nextUrl = buildProductUrl(saved, previewSlug, { preview: true });
      setPreviewUrl(nextUrl);
      setDraftReady(true);
      if (!background) {
        setStatusMessage('Draft saved.');
      } else {
        setAutoSaveState('saved');
      }
      return nextUrl;
    } catch (_error) {
      setDraftReady(false);
      if (background) {
        setAutoSaveState('error');
      }
      return '';
    } finally {
      if (!background) {
        setIsDraftSaving(false);
      }
    }
  }, [
    availableBrands,
    availableCategories,
    availableTags,
    buildAttributePayload,
    buildVariationPayload,
    canDraftSave,
    draftSyncFingerprint,
    form,
    hasUnsyncedDraft,
    isSkuAutoGenerated,
    previewSlug,
    product,
    savedProduct,
    selectedBrands,
    selectedCategories,
    selectedSizeGuideId,
    selectedTags,
    sizeGuideEnabled,
    variationEnabled,
  ]);

  const queueBackgroundDraftSave = useCallback(() => {
    if (!canDraftSave || !hasUnsyncedDraft || isDraftSaving || isSaving) return;
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(async () => {
      if (autoSaveInFlightRef.current) {
        autoSaveQueuedRef.current = true;
        return;
      }
      autoSaveInFlightRef.current = true;
      const saved = await handleDraftSave({ background: true });
      autoSaveInFlightRef.current = false;
      if (!saved) {
        setAutoSaveState('error');
      }
      if (autoSaveQueuedRef.current) {
        autoSaveQueuedRef.current = false;
        queueBackgroundDraftSave();
      }
    }, 450);
  }, [canDraftSave, handleDraftSave, hasUnsyncedDraft, isDraftSaving, isSaving]);

  const handlePreview = async () => {
    if (isDraftSaving) return;
    if (!canDraftSave) {
      setError('Add a name, price, image, category, and condition check to preview.');
      return;
    }
    const nextUrl = draftReady && previewUrl ? previewUrl : await handleDraftSave();
    if (nextUrl) {
      window.open(nextUrl, '_blank');
    }
  };

  useEffect(() => {
    if (!isOpen || !isReviewStep || !canDraftSave) return;
    if (!hasUnsyncedDraft && previewUrl) return;
    handleDraftSave({ background: true });
  }, [canDraftSave, handleDraftSave, hasUnsyncedDraft, isOpen, isReviewStep, previewUrl]);

  const handleNavigateToStep = (nextIndex) => {
    if (nextIndex < 0 || nextIndex >= PRODUCT_EDITOR_STEPS.length) return;
    if (nextIndex > furthestAccessibleStepIndex) return;
    setCurrentStepIndex(nextIndex);
    queueBackgroundDraftSave();
    setError('');
  };

  const handleNextStep = () => {
    if (!canProceedCurrentStep) {
      const missing = getMissingRequiredFieldsForStep(currentStepId);
      const message = missing.length
        ? `Complete required fields: ${missing.join(', ')}.`
        : `Complete ${currentStep.label} before continuing.`;
      pushAlert({
        type: 'warning',
        title: 'Required fields missing',
        message,
      });
      return;
    }
    queueBackgroundDraftSave();
    setCurrentStepIndex((prev) => Math.min(prev + 1, PRODUCT_EDITOR_STEPS.length - 1));
    setError('');
  };

  const handleBackStep = () => {
    queueBackgroundDraftSave();
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
    setError('');
  };

  const useFixedMobileStepHeader = isFullPage;
  const isCompactDrawerMode = !isFullPage;
  const cardClass =
    'rounded-3xl bg-white/95 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] ring-1 ring-slate-100/70';
  const sectionClass =
    'rounded-3xl bg-white/95 p-5 shadow-[0_12px_34px_rgba(15,23,42,0.07)] ring-1 ring-slate-100/70';
  const bodyCardClass =
    'rounded-none bg-transparent p-0 shadow-none ring-0 sm:rounded-3xl sm:bg-white/95 sm:p-4 sm:shadow-[0_10px_30px_rgba(15,23,42,0.06)] sm:ring-1 sm:ring-slate-100/70';
  const bodySectionClass =
    'rounded-none bg-transparent p-0 shadow-none ring-0 sm:rounded-3xl sm:bg-white/95 sm:p-5 sm:shadow-[0_12px_34px_rgba(15,23,42,0.07)] sm:ring-1 sm:ring-slate-100/70';
  const detailsContentClass = isCommercialStep ? bodySectionClass : sectionClass;
  const detailsCardClass = (isCommercialStep || isConfigurationStep || isMetadataStep)
    ? bodyCardClass
    : cardClass;
  const variationSectionClass = isConfigurationStep ? bodySectionClass : sectionClass;
  const autoSaveLabel =
    autoSaveState === 'saving'
      ? 'Autosaving...'
      : autoSaveState === 'saved'
        ? 'Draft synced'
        : autoSaveState === 'error'
          ? 'Autosave failed'
          : 'Draft idle';
  const autoSaveTone =
    autoSaveState === 'error'
      ? 'text-rose-500'
      : autoSaveState === 'saved'
        ? 'text-emerald-600'
        : 'text-slate-500';
  const mobileSaveStatus = useMemo(() => {
    if (isDraftSaving || autoSaveState === 'saving') {
      return {
        key: 'saving',
        title: 'Saving draft...',
        message: 'Your product changes are syncing in the background.',
        alertType: 'info',
      };
    }
    if (autoSaveState === 'error') {
      return {
        key: 'error',
        title: 'Draft sync failed',
        message: 'Unable to sync draft. Check network connection and try again.',
        alertType: 'error',
      };
    }
    if (autoSaveState === 'saved') {
      return {
        key: 'saved',
        title: 'Draft saved',
        message: 'Your product draft is up to date.',
        alertType: 'success',
      };
    }
    return {
      key: 'idle',
      title: hasUnsyncedDraft ? 'Unsaved changes' : 'Draft idle',
      message: hasUnsyncedDraft
        ? 'Changes are pending and will auto-save shortly.'
        : 'No pending draft changes right now.',
      alertType: hasUnsyncedDraft ? 'warning' : 'info',
    };
  }, [autoSaveState, hasUnsyncedDraft, isDraftSaving]);

  const closeEditor = useCallback(() => {
    if (isFullPage) {
      if (window.history.length > 1) {
        router.back();
        return;
      }
      router.push('/backend/admin/products');
      return;
    }
    onClose();
  }, [isFullPage, onClose, router]);

  const handleShowSaveStatus = useCallback(() => {
    setIsMobileActionsOpen(false);
    pushAlert({
      type: mobileSaveStatus.alertType,
      title: mobileSaveStatus.title,
      message: mobileSaveStatus.message,
    });
  }, [mobileSaveStatus, pushAlert]);

  const handleDraftAndClose = useCallback(async () => {
    setIsMobileActionsOpen(false);
    const hasExistingProduct = Boolean(savedProduct?.id || product?.id);
    if (hasUnsyncedDraft || !hasExistingProduct) {
      const nextUrl = await handleDraftSave();
      if (!nextUrl && !hasExistingProduct) {
        pushAlert({
          type: 'warning',
          title: 'Draft not saved',
          message: 'Complete required fields before saving as draft.',
        });
        return;
      }
    }
    pushAlert({
      type: 'success',
      title: 'Draft ready',
      message: 'Product draft saved. Closing editor.',
    });
    closeEditor();
  }, [closeEditor, handleDraftSave, hasUnsyncedDraft, product?.id, pushAlert, savedProduct?.id]);

  const handleDeleteCurrentProduct = useCallback(async () => {
    setIsMobileActionsOpen(false);
    const targetId = savedProduct?.id || product?.id;
    if (!targetId) {
      pushAlert({
        type: 'warning',
        title: 'Nothing to delete',
        message: 'This product is not saved yet.',
      });
      return;
    }
    const confirmed = await confirmAlert({
      type: 'warning',
      title: 'Delete product permanently?',
      message: 'This action cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteProduct({ id: targetId });
      pushAlert({
        type: 'success',
        title: 'Product deleted',
        message: 'The product was permanently removed.',
      });
      closeEditor();
    } catch (deleteError) {
      pushAlert({
        type: 'error',
        title: 'Delete failed',
        message: deleteError?.message || 'Unable to delete product right now.',
      });
    }
  }, [closeEditor, confirmAlert, product?.id, pushAlert, savedProduct?.id]);

  const renderActionsTriggerIcon = () => (
    <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-full">
      {(mobileSaveStatus.key === 'saving' || isSaving) && (
        <span className="absolute inset-0 rounded-full border-2 border-slate-300 border-t-slate-700 animate-spin" />
      )}
      {mobileSaveStatus.key === 'saved' && !isSaving && (
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m5 12 4 4 10-10" />
        </svg>
      )}
      {mobileSaveStatus.key === 'error' && !isSaving && (
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-rose-600" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 8v5" />
          <circle cx="12" cy="16.5" r="0.7" fill="currentColor" />
          <path d="M10.3 3.6 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z" />
        </svg>
      )}
      {(mobileSaveStatus.key === 'idle' || isSaving) && (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="6" cy="12" r="1" />
          <circle cx="12" cy="12" r="1" />
          <circle cx="18" cy="12" r="1" />
        </svg>
      )}
    </span>
  );

  if (!isOpen) return null;

  return (
    <div
      className={
        isFullPage
          ? 'min-h-screen bg-slate-50'
          : 'fixed inset-0 z-50 flex items-end justify-center lg:items-stretch lg:justify-end'
      }
    >
      {!isFullPage && (
        <button
          type="button"
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          aria-label="Close product preview"
        />
      )}
      <div
        className={`relative flex w-full flex-col overflow-x-hidden bg-gradient-to-b from-slate-50 to-slate-100 shadow-2xl ${
          isFullPage
            ? 'min-h-screen max-w-none rounded-none'
            : `max-h-[calc(100vh-24px)] max-w-6xl rounded-t-[32px] transition-transform duration-300 ${
                isVisible ? 'translate-y-0 lg:translate-x-0' : 'translate-y-full lg:translate-x-full'
              } lg:h-full lg:max-h-none lg:w-[min(100%,440px)] lg:max-w-none lg:translate-y-0 lg:rounded-none lg:rounded-l-[28px]`
        }`}
      >
        <div
          className={`z-30 shrink-0 border-b border-slate-200 bg-white/95 backdrop-blur-md ${
            isCompactDrawerMode ? '' : 'sm:hidden'
          } ${
            useFixedMobileStepHeader ? 'fixed inset-x-0 top-0 z-50' : 'sticky top-0'
          }`}
        >
          <div
            className={`flex items-center justify-between overflow-hidden px-3 transition-all duration-200 ${
              showMobileMainHeader ? 'max-h-12 py-2 opacity-100' : 'max-h-0 py-0 opacity-0'
            }`}
          >
            <button
              type="button"
              onClick={closeEditor}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100"
              aria-label="Go back"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <h2 className="truncate px-2 text-base font-semibold text-slate-900">
              {isEditing ? 'Edit Product' : 'Create Product'}
            </h2>
            <button
              type="button"
              onClick={() => setIsMobileActionsOpen((prev) => !prev)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100"
              aria-label="More actions"
            >
              {renderActionsTriggerIcon()}
            </button>
          </div>
          <div className="no-scrollbar overflow-x-auto px-3 pb-3">
            <div className="flex min-w-max items-center gap-1 rounded-full bg-slate-100 p-1">
              {MOBILE_STEP_META.map((step, index) => {
                const isActive = index === mobileStepIndex;
                const isComplete = index < mobileStepIndex;
                return (
                  <button
                    key={`mobile-step-${step.label}`}
                    type="button"
                    onClick={() => handleNavigateToStep(step.stepIndex)}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : isComplete
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'text-slate-600'
                    }`}
                  >
                    <span>{index + 1}</span>
                    <span>{step.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        {isMobileActionsOpen && (
          <div className="fixed inset-0 z-[58]">
            <button
              type="button"
              onClick={() => setIsMobileActionsOpen(false)}
              className="absolute inset-0 bg-slate-900/25"
              aria-label="Close actions menu"
            />
            <div className="absolute right-3 top-14 z-[59] w-[min(92vw,20rem)] rounded-2xl border border-slate-200 bg-white p-2 shadow-xl sm:right-6 sm:top-[5.25rem] sm:w-80">
              <button
                type="button"
                onClick={handleShowSaveStatus}
                className="flex w-full items-start gap-2 rounded-xl px-3 py-2 text-left hover:bg-slate-50"
              >
                <span
                  className={`mt-1 h-2.5 w-2.5 rounded-full ${
                    mobileSaveStatus.key === 'saved'
                      ? 'bg-emerald-500'
                      : mobileSaveStatus.key === 'error'
                        ? 'bg-rose-500'
                        : mobileSaveStatus.key === 'saving'
                          ? 'bg-blue-500'
                          : 'bg-slate-400'
                  }`}
                />
                <span>
                  <span className="block text-xs font-semibold text-slate-800">{mobileSaveStatus.title}</span>
                  <span className="block text-[11px] text-slate-500">{mobileSaveStatus.message}</span>
                </span>
              </button>
              <button
                type="button"
                onClick={handleDraftAndClose}
                disabled={isDraftSaving || isSaving}
                className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 6h16v12H4z" />
                  <path d="M8 10h8M8 14h5" />
                </svg>
                Draft & close
              </button>
              {canShowGoLiveMenuOption && (
                <LoadingButton
                  type="button"
                  onClick={async () => {
                    setIsMobileActionsOpen(false);
                    await handleSave({ statusOverride: 'publish' });
                  }}
                  disabled={isDraftSaving}
                  isLoading={isSaving}
                  className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="inline-flex items-center gap-2 whitespace-nowrap">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M7 17 17 7" />
                      <path d="M10 7h7v7" />
                    </svg>
                    <span>Go Live</span>
                  </span>
                </LoadingButton>
              )}
              <button
                type="button"
                onClick={handleDeleteCurrentProduct}
                disabled={isDraftSaving || isSaving}
                className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18" />
                  <path d="M8 6V4h8v2" />
                  <path d="M6 6l1 14h10l1-14" />
                </svg>
                Delete current product
              </button>
            </div>
          </div>
        )}

        <div
          className={`sticky top-0 z-20 hidden flex-col gap-3 bg-white/80 px-4 py-4 backdrop-blur-md ${
            isCompactDrawerMode ? '' : 'sm:flex sm:flex-row sm:items-center sm:justify-between sm:px-6'
          }`}
        >
          <div>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm ring-1 ring-slate-200/70 hover:bg-slate-50"
                aria-label="Back to products"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
              <h2 className="text-xl font-semibold text-slate-900">
              {isEditing ? 'Edit Product' : 'Add New Product'}
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Step {currentStepIndex + 1} of {PRODUCT_EDITOR_STEPS.length}: {currentStep.label}
            </p>
            <p className={`mt-2 text-[11px] font-medium ${autoSaveTone}`}>{autoSaveLabel}</p>
          </div>
          <div className="flex w-full items-center justify-end sm:w-auto">
            <button
              type="button"
              onClick={() => setIsMobileActionsOpen((prev) => !prev)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-slate-200/70 hover:bg-slate-50"
              aria-label="More actions"
            >
              {renderActionsTriggerIcon()}
            </button>
          </div>
        </div>

        <div className={isCompactDrawerMode ? 'hidden' : 'hidden px-4 py-3 sm:block sm:px-6'}>
          <div className="no-scrollbar flex flex-nowrap items-center gap-2 overflow-x-auto pb-1">
            {PRODUCT_EDITOR_STEPS.map((step, index) => {
              const isActive = index === currentStepIndex;
              const isLocked = index > furthestAccessibleStepIndex;
              const isComplete = index < currentStepIndex && index <= furthestAccessibleStepIndex;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => handleNavigateToStep(index)}
                  disabled={isLocked}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : isComplete
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-white text-slate-500 ring-1 ring-slate-200/60'
                  } ${isLocked ? 'cursor-not-allowed opacity-50' : 'hover:opacity-90'}`}
                >
                  {index + 1}. {step.label}
                </button>
              );
            })}
          </div>
        </div>

        <div
          ref={contentScrollRef}
          onScroll={(event) => {
            const top = event.currentTarget.scrollTop || 0;
            const nextVisible = top < 20;
            setShowMobileMainHeader((prev) => (prev === nextVisible ? prev : nextVisible));
          }}
          className={`min-h-0 flex-1 ${isReviewStep ? 'overflow-hidden px-0 py-0 pb-0 sm:px-0 sm:py-0 sm:pb-0' : isCompactDrawerMode ? 'overflow-y-auto px-4 py-4 pb-24' : 'overflow-y-auto px-4 py-4 pb-24 sm:px-6 sm:py-6 sm:pb-6'} ${
            useFixedMobileStepHeader ? (isCompactDrawerMode ? 'pt-[4.25rem]' : 'pt-[4.25rem] sm:pt-6') : ''
          }`}
        >
          {isReviewStep ? (
            <div className="relative h-full min-h-[calc(100dvh-9rem)] bg-white sm:min-h-[calc(100dvh-12rem)]">
              {canDraftSave && previewFrameSrc ? (
                <>
                  <iframe
                    ref={previewIframeRef}
                    title="Draft product preview"
                    src={previewFrameSrc}
                    className="h-[calc(100dvh-9rem)] w-full border-0 bg-white sm:h-[calc(100dvh-12rem)]"
                    onLoad={() => {
                      try {
                        const currentHref = previewIframeRef.current?.contentWindow?.location?.href || '';
                        if (currentHref && !isAllowedPreviewLocation(currentHref)) {
                          showPreviewBlockedModal(currentHref);
                          if (previewIframeRef.current && previewFrameSrc) {
                            previewIframeRef.current.src = previewFrameSrc;
                          }
                          return;
                        }
                      } catch (_error) {
                        // ignore cross-origin guard checks
                      }
                      installPreviewNavigationGuard();
                      setPreviewLoadProgress(100);
                      setTimeout(() => {
                        setIsPreviewFrameLoading(false);
                      }, 180);
                    }}
                  />
                  {isPreviewFrameLoading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
                      <div className="w-full max-w-xs px-6 text-center">
                        <p className="text-sm font-semibold text-slate-900">
                          Preparing a preview for your product
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Hold on while we render your latest draft.
                        </p>
                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-slate-900 transition-all duration-200"
                            style={{ width: `${Math.min(100, Math.max(0, previewLoadProgress))}%` }}
                          />
                        </div>
                        <p className="mt-2 text-[11px] font-semibold text-slate-600">
                          {Math.round(Math.min(100, Math.max(0, previewLoadProgress)))}%
                        </p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="px-4 py-8 text-center text-xs text-slate-500">
                  {canDraftSave
                    ? 'Preparing preview URL... please wait.'
                    : 'Complete required fields to render preview.'}
                </div>
              )}
              <div className="fixed bottom-[max(0.9rem,env(safe-area-inset-bottom))] right-4 z-[78] flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleBackStep}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm"
                >
                  Go Back
                </button>
                <LoadingButton
                  type="button"
                  onClick={() => handleSave({ statusOverride: 'publish' })}
                  isLoading={isSaving}
                  className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm"
                >
                  Go Live
                </LoadingButton>
              </div>
            </div>
          ) : (
          <div
            className={
              isCompactDrawerMode
                ? 'grid gap-4'
                : isMetadataStep
                  ? 'grid gap-6 lg:grid-cols-1'
                  : 'grid gap-6 lg:grid-cols-[minmax(0,_1fr)_minmax(0,_2fr)]'
            }
          >
          <aside
            className={`min-w-0 space-y-4 ${
              isMetadataStep
                ? 'lg:mx-auto lg:w-full lg:max-w-4xl'
                : isCommercialStep
                  ? (isCompactDrawerMode ? 'order-3' : 'order-3 lg:order-1')
                  : ''
            }`}
          >
            {(isIdentityStep || isReviewStep) && (
            <div className={isIdentityStep ? bodyCardClass : cardClass}>
              <p className="text-xs font-semibold text-slate-500">Upload image</p>
              <button
                type="button"
                onClick={() => {
                  setImageLibraryPurpose('product');
                  setIsImageModalOpen(true);
                }}
                className="mt-4 flex w-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-100 px-3 py-2 text-left"
              >
                <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-slate-100">
                  {previewImage ? (
                    <LazyImage src={previewImage} alt={form.name || 'Product'} />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-slate-400">
                      Select images
                    </div>
                  )}
                </div>
              </button>
              {galleryImages.length > 1 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {galleryImages.map((image) => {
                    const isPrimary = selectedImage?.id && image.id === selectedImage.id;
                    return (
                      <div
                        key={`${image.id}-${image.url}`}
                        className={`relative h-16 w-16 overflow-hidden rounded-2xl border ${
                          isPrimary ? 'border-blue-500 ring-1 ring-blue-200' : 'border-slate-200'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedImage?.id === image.id) {
                              return;
                            }
                            const nextGallery = normalizeGallery([
                              image,
                              ...galleryImages.filter((item) => item.id !== image.id),
                            ]);
                            setSelectedImage(image);
                            setGalleryImages(nextGallery);
                            setForm((prev) => ({
                              ...prev,
                              image_id: image?.id ? String(image.id) : '',
                              image_ids: nextGallery.map((item) => item.id).filter(Boolean),
                            }));
                          }}
                          className="group relative flex h-full w-full items-center justify-center"
                        >
                        {image.url ? (
                          <LazyImage src={image.url} alt={image.title || 'Product'} />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
                            Image
                          </span>
                        )}
                        <span
                          className={`absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
                            isPrimary
                              ? 'border-amber-400 bg-amber-100 text-amber-600'
                              : 'border-white/80 bg-white/90 text-slate-400'
                          }`}
                        >
                          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
                            <path d="M12 3.5 14.8 9l6 .9-4.4 4.3 1 6-5.4-2.9-5.4 2.9 1-6L3.2 9l6-.9L12 3.5Z" />
                          </svg>
                        </span>
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            const nextGallery = galleryImages.filter((item) => item.id !== image.id);
                            const normalized = normalizeGallery(nextGallery);
                            const nextPrimary = normalized[0] || null;
                            setGalleryImages(normalized);
                            setSelectedImage(nextPrimary);
                            setForm((prev) => ({
                              ...prev,
                              image_id: nextPrimary?.id ? String(nextPrimary.id) : '',
                              image_ids: normalized.map((item) => item.id).filter(Boolean),
                            }));
                          }}
                          className="absolute bottom-1 left-1 flex h-5 w-5 items-center justify-center rounded-full border border-white/80 bg-white/90 text-slate-400 opacity-0 transition group-hover:opacity-100"
                          aria-label="Remove image"
                        >
                          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18" />
                            <path d="M8 6V4h8v2" />
                            <path d="M6 6l1 14h10l1-14" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="mt-3 text-[11px] text-slate-400">
                Thumbnail previews will reflect the product gallery.
              </p>
            </div>
            )}

            {(isCommercialStep || isConfigurationStep || isMetadataStep || isReviewStep) && (
              <div className={detailsCardClass}>
                <p className="text-xs font-semibold text-slate-600">Product Details</p>
                {(isCommercialStep || isReviewStep) && (
                  <>
                    <label className="mt-4 block text-[11px] text-slate-400">
                      Categories <span className="text-rose-500">*</span>
                    </label>
                    <ProductCategorySelector
                      selectedCategories={selectedCategories}
                      onSelectCategories={setSelectedCategories}
                      categories={availableCategories}
                      pendingCategoryRequestIds={pendingCategoryRequestIds}
                      isLoading={categoriesLoading}
                      errorMessage={categoriesError}
                      onOpen={() => {
                        handleLoadCategories();
                        handleLoadCategoryRequests();
                      }}
                      onRequestCategory={handleRequestCategory}
                      isRequestingCategory={isRequestingCategory}
                      requestCategoryError={requestCategoryError}
                      pendingCategoryRequests={pendingCategoryRequests}
                      className="mt-2 w-full"
                    />
                    <label className="mt-4 block text-[11px] text-slate-400">Tags</label>
                    <ProductTagSelector
                      selectedTags={selectedTags}
                      onSelectTags={setSelectedTags}
                      tags={availableTags}
                      maxSelected={12}
                      isLoading={tagsLoading}
                      isLoadingMore={tagsLoadingMore}
                      hasMore={tagsPage < tagsTotalPages}
                      errorMessage={tagsError}
                      onOpen={handleLoadTags}
                      onLoadMore={handleLoadMoreTags}
                      onCreateTag={handleCreateTag}
                      isCreatingTag={isCreatingTag}
                      createTagError={createTagError}
                      className="mt-2 w-full"
                    />
                    <label className="mt-4 block text-[11px] text-slate-400">Brands</label>
                    <ProductBrandSelector
                      selectedBrands={selectedBrands}
                      onSelectBrands={setSelectedBrands}
                      brands={availableBrands}
                      isLoading={brandsLoading}
                      errorMessage={brandsError}
                      onOpen={handleLoadBrands}
                      className="mt-2 w-full"
                    />
                  </>
                )}
                {(isConfigurationStep || isReviewStep) && (
                  <>
                    <label className="mt-4 block text-[11px] text-slate-400">SKU</label>
                    <input
                      value={form.sku}
                      onChange={handleChange('sku')}
                      disabled={isSkuAutoGenerated}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs"
                      placeholder="Automatically Generated"
                    />
                    {isSkuAutoGenerated && (
                      <p className="mt-1 text-[11px] text-slate-400">
                        SKU was automatically generated and cannot be edited.
                      </p>
                    )}
                    <label className="mt-4 block text-[11px] text-slate-400">Quantity</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.stock_quantity}
                      onChange={handleChange('stock_quantity')}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs"
                      placeholder="0"
                    />
                  </>
                )}
                {(isMetadataStep || isReviewStep) && (
                  <>
                    <div className="mt-4 rounded-2xl border border-white/70 bg-white/70 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur-md">
                      <label className="block text-[11px] text-slate-500">
                        Condition Check <span className="text-rose-500">*</span>
                      </label>
                      <ProductConditionSelector
                        value={form.condition_check}
                        onChange={(nextValue) =>
                          setForm((prev) => ({
                            ...prev,
                            condition_check: nextValue,
                          }))
                        }
                        className="mt-2 w-full"
                      />
                    </div>
                    <div className="mt-3 rounded-2xl border border-white/70 bg-white/70 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur-md">
                      <label className="block text-[11px] text-slate-500">Packaging Style</label>
                      <ProductPackagingSelector
                        value={form.packaging_style || 'in_wrap_nylon'}
                        onChange={(nextValue) =>
                          setForm((prev) => ({
                            ...prev,
                            packaging_style: nextValue,
                          }))
                        }
                        className="mt-2 w-full"
                      />
                    </div>
                    <div className="mt-3 rounded-2xl border border-white/70 bg-white/70 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur-md">
                      <label className="block text-[11px] text-slate-500">Return Policy</label>
                      <ProductReturnPolicySelector
                        value={form.return_policy || 'not_returnable'}
                        onChange={(nextValue) =>
                          setForm((prev) => ({
                            ...prev,
                            return_policy: nextValue,
                          }))
                        }
                        className="mt-2 w-full"
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </aside>

          <section
            key={currentStepId}
            className={`min-w-0 space-y-4 transition-all duration-200 ease-out ${isCommercialStep ? (isCompactDrawerMode ? 'order-1' : 'order-1 lg:order-2') : ''}`}
          >
            {(isIdentityStep || isReviewStep) && (
            <div className={detailsContentClass}>
              <p className="text-sm font-semibold text-slate-900">Pricing</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] text-slate-400">Base Price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.regular_price}
                    onChange={handleBasePriceChange}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400">Discount Price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.sale_price}
                    onChange={handleChange('sale_price')}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs"
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>
            )}

            {(isIdentityStep || isCommercialStep || isReviewStep) && (
              <div className={isIdentityStep || isCommercialStep ? bodySectionClass : sectionClass}>
                <p className="text-sm font-semibold text-slate-900">
                  {isIdentityStep ? 'Product Identity' : 'About Product'}
                </p>
                {(isIdentityStep || isReviewStep) && (
                  <>
                    <label className="mt-4 block text-[11px] text-slate-400">
                      Product Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      value={form.name}
                      onChange={handleChange('name')}
                      onBlur={() => setSlug(toSlug(form.name))}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                      placeholder="New product name"
                    />
                    <p className="mt-2 text-[11px] text-slate-400">
                      Slug preview: <span className="font-semibold text-slate-600">{previewSlug || '--'}</span>
                    </p>
                    {previewUrl && (
                      <p className="mt-2 text-[11px] text-slate-400">
                        Live URL:{' '}
                        <button
                          type="button"
                          onClick={() => previewUrl && window.open(previewUrl, '_blank')}
                          className="font-semibold text-blue-600 hover:underline"
                        >
                          {previewUrl}
                        </button>
                      </p>
                    )}
                    <label className="mt-4 block text-[11px] text-slate-400">
                      Short Description <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      value={form.short_description}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          short_description: event.target.value.slice(0, SHORT_DESCRIPTION_MAX),
                        }))
                      }
                      maxLength={SHORT_DESCRIPTION_MAX}
                      rows={3}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs text-slate-600"
                      placeholder="Short description for cards and previews"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">
                      {(form.short_description || '').length}/{SHORT_DESCRIPTION_MAX}
                    </p>
                  </>
                )}
                {(isCommercialStep || isReviewStep) && (
                  <>
                    <label className="mt-4 block text-[11px] text-slate-400">Description</label>
                    <RichTextEditor
                      ref={mainDescriptionEditorRef}
                      value={form.description}
                      onChange={(nextValue) =>
                        setForm((prev) => ({
                          ...prev,
                          description: nextValue,
                        }))
                      }
                      onRequestImage={() => {
                        setImageLibraryPurpose('description-inline');
                        setIsImageModalOpen(true);
                      }}
                      placeholder="Full product description"
                      minHeight={180}
                      onExpand={() => setIsDescriptionExpanded(true)}
                      expandLabel="Expand"
                    />
                  </>
                )}
              </div>
            )}

            {(isConfigurationStep || isReviewStep) && (
            <div className={variationSectionClass}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Variations</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Does your product have options (e.g., color, size)?
                  </p>
                </div>
                <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setVariationEnabled(false)}
                    className={`rounded-full px-3 py-1 transition ${
                      !variationEnabled ? 'bg-slate-900 text-white' : 'text-slate-600'
                    }`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => setVariationEnabled(true)}
                    className={`rounded-full px-3 py-1 transition ${
                      variationEnabled ? 'bg-slate-900 text-white' : 'text-slate-600'
                    }`}
                  >
                    Yes
                  </button>
                </div>
              </div>

              {variationEnabled ? (
                <>
                  <div className="mt-4 space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-3">
                      <div className="flex items-start gap-3">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                          1
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-800">Choose option types</p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            Add attributes like size or color, then pick the option values.
                          </p>
                        </div>
                      </div>

                      {isAttributesLoading && (
                        <p className="mt-3 text-xs text-slate-400">Loading attributes...</p>
                      )}
                      {!isAttributesLoading && attributesError && (
                        <p className="mt-3 text-xs text-rose-500">{attributesError}</p>
                      )}
                      {!isAttributesLoading && !attributesError && availableAttributes.length === 0 && (
                        <p className="mt-3 text-xs text-slate-400">
                          No global attributes found yet.
                        </p>
                      )}

                      <div className="mt-3">
                        <CustomSelect
                          onChange={(event) => {
                            const selected = selectableAttributes.find(
                              (attribute) => String(attribute.id) === event.target.value,
                            );
                            handleAddAttribute(selected);
                            event.target.value = '';
                          }}
                          className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-xs text-slate-600"
                          defaultValue=""
                        >
                          <option value="" disabled>
                            Add attribute...
                          </option>
                          {selectableAttributes.map((attribute) => (
                            <option key={attribute.id} value={attribute.id}>
                              {attribute.label || attribute.name}
                            </option>
                          ))}
                        </CustomSelect>
                      </div>

                      {selectedAttributes.length > 0 && (
                        <div className="mt-4 space-y-3">
                          {selectedAttributes.map((attribute) => {
                            const attributeKey = attribute.taxonomy || attribute.name;
                            return (
                            <div
                              key={attributeKey}
                              className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <p className="text-xs font-semibold text-slate-700">
                                    {attribute.label || attribute.name}
                                  </p>
                              <p className="mt-1 text-[11px] text-slate-500">
                                {attribute.selectedOptionIds.length} option
                                {attribute.selectedOptionIds.length === 1 ? '' : 's'} selected
                              </p>
                              <p className="mt-1 text-[11px] text-slate-500">
                                {getAttributeGuidance(attribute)}
                              </p>
                            </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setActiveAttributeEditorKey(attributeKey)}
                                    className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveAttribute(attributeKey)}
                                    className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-500"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-3">
                      <div className="flex items-start gap-3">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                          2
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-800">Build your variants</p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            Generate combinations automatically or add one variant manually.
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                        <p className="font-semibold text-slate-700">Variants</p>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                          {variations.length} total
                        </span>
                      </div>
                      {colorAttributeKey && colorOptionsForMapping.length > 0 && (
                        <div className="mt-3">
                          <p className="mb-2 text-[11px] text-slate-500">
                            Tell us which color each image belongs to.
                          </p>
                          <button
                            type="button"
                            onClick={handleOpenColorImageMap}
                            disabled={galleryImages.length === 0}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Map image by color
                          </button>
                        </div>
                      )}
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={handleAutoGenerateVariations}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
                        >
                          Auto-generate
                        </button>
                        <button
                          type="button"
                          onClick={handleAddManualVariation}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
                        >
                          Add manual
                        </button>
                        {variations.length > 0 && (
                          <button
                            type="button"
                            onClick={handleClearAllVariations}
                            className="col-span-2 rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600"
                          >
                            Clear all variants
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-3">
                      <div className="flex items-start gap-3">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                          3
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-800">Edit each variant</p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            Set price, stock, image, and attribute values for each variant.
                          </p>
                        </div>
                      </div>

                      {variations.length === 0 && (
                        <div className="mt-3 rounded-xl border border-dashed border-slate-200 px-3 py-3 text-[11px] text-slate-500">
                          No variants yet. Use Auto-generate or Add manual in Step 2.
                        </div>
                      )}
                      {variations.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {variations.map((variation, index) => {
                            const variationName = buildVariationLabel(variation) || `Variant ${index + 1}`;
                            const variationQty =
                              variation.stock_quantity !== undefined && variation.stock_quantity !== ''
                                ? variation.stock_quantity
                                : '0';
                            const variationPrice = variation.regular_price || form.regular_price || form.price || '--';
                            return (
                              <button
                                key={variation.id}
                                type="button"
                                onClick={() => setActiveVariationEditorId(variation.id)}
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-3 text-left"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="truncate text-xs font-semibold text-slate-800">{variationName}</p>
                                    <p className="mt-1 truncate text-[11px] text-slate-500">
                                      SKU: {variation.sku || 'Auto-generated'} | Qty: {variationQty} | Price: {variationPrice}
                                    </p>
                                  </div>
                                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500">
                                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="m9 6 6 6-6 6" />
                                    </svg>
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <p className="mt-3 text-xs text-slate-500">
                  Keep this product as a single option product. Turn on <span className="font-semibold">Yes</span> to configure variations.
                </p>
              )}
            </div>
            )}

            {(isConfigurationStep || isReviewStep) && (
            <div className={variationSectionClass}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900">Size Guide</p>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <input
                    type="checkbox"
                    checked={sizeGuideEnabled}
                    onChange={(event) => {
                      const next = event.target.checked;
                      setSizeGuideEnabled(next);
                      if (!next) {
                        setSelectedSizeGuideId('');
                      }
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  This product has a size guide
                </label>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Select the size guide to show shoppers accurate fit details for this product.
              </p>
              {isSizeGuidesLoading && (
                <p className="mt-3 text-xs text-slate-400">Loading size guides...</p>
              )}
              {!isSizeGuidesLoading && sizeGuidesError && (
                <p className="mt-3 text-xs text-rose-500">{sizeGuidesError}</p>
              )}
              {!isSizeGuidesLoading && !sizeGuidesError && sizeGuides.length === 0 && (
                <p className="mt-3 text-xs text-slate-400">No size guides found yet.</p>
              )}
              <div className="mt-4">
                <CustomSelect
                  value={selectedSizeGuideId}
                  onChange={(event) => setSelectedSizeGuideId(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs text-slate-600"
                  disabled={!sizeGuideEnabled || isSizeGuidesLoading}
                >
                  <option value="">Select size guide...</option>
                  {visibleSizeGuides.map((guide) => (
                    <option key={guide.id} value={guide.id}>
                      {guide.title}
                    </option>
                  ))}
                </CustomSelect>
              </div>
            </div>
            )}

          </section>
          </div>
          )}
        </div>

        {!isReviewStep && (
        <div
          className={
            isCompactDrawerMode
              ? 'fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/90 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md'
              : 'fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/90 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:sticky sm:bottom-0 sm:z-20 sm:border-t-0 sm:bg-white/80 sm:px-6 sm:py-4 sm:pb-4'
          }
        >
          <div className="flex w-full items-center gap-2 sm:justify-between">
            <button
              type="button"
              onClick={handleBackStep}
              disabled={currentStepIndex === 0 || isDraftSaving}
              className="min-h-10 flex-1 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200/60 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:flex-none sm:text-xs"
            >
              Back
            </button>
            {!isReviewStep && (
              <button
                type="button"
                onClick={handleNextStep}
                disabled={isDraftSaving}
                className={`min-h-10 flex-1 rounded-2xl px-4 py-2 text-sm font-semibold text-white transition sm:w-auto sm:flex-none sm:text-xs ${
                  canProceedCurrentStep
                    ? 'bg-slate-900'
                    : 'bg-slate-900/70 ring-1 ring-slate-300/40'
                } disabled:cursor-not-allowed disabled:bg-slate-300`}
              >
                Next
              </button>
            )}
          </div>
        </div>
        )}

        {(statusMessage || error) && (
          <div className="px-4 py-3 sm:px-6">
            {statusMessage && <p className="text-xs font-semibold text-emerald-600">{statusMessage}</p>}
            {error && <p className="text-xs text-rose-500">{error}</p>}
          </div>
        )}
      </div>
      {activeAttributeEditor && (
        <div className="fixed inset-0 z-[74] bg-slate-950/45 backdrop-blur-sm">
          <div className="flex h-full flex-col bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Attribute Options
                </p>
                <p className="truncate text-sm font-semibold text-slate-900">
                  {activeAttributeEditor.label || activeAttributeEditor.name}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {getAttributeGuidance(activeAttributeEditor)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveAttributeEditorKey('')}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
                aria-label="Close attribute editor"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m6 6 12 12" />
                  <path d="m18 6-12 12" />
                </svg>
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-24">
              {activeAttributeEditor.terms.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-500">
                  No options available for this attribute yet.
                </div>
              )}
              {activeAttributeEditor.terms.length > 0 && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {activeAttributeEditor.terms.map((term) => {
                    const termId = term.id || term.name;
                    const isSelected = activeAttributeEditor.selectedOptionIds.includes(termId);
                    const showColor = isColorLikeAttribute(activeAttributeEditor);
                    const colorHex = getTermColorHex(term);
                    return (
                      <button
                        key={`full-attr-${activeAttributeEditorKey}-${termId}`}
                        type="button"
                        onClick={() =>
                          handleToggleOption(
                            activeAttributeEditor.taxonomy || activeAttributeEditor.name,
                            term,
                          )
                        }
                        className={`rounded-2xl border px-3 py-2 text-left text-xs font-medium transition ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          {showColor && (
                            <span
                              className="h-4 w-4 rounded-full border border-slate-300"
                              style={colorHex ? { backgroundColor: colorHex } : undefined}
                            />
                          )}
                          <span className="truncate">{term.name}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setActiveAttributeEditorKey('')}
              className="fixed bottom-[max(0.9rem,env(safe-area-inset-bottom))] right-4 z-[75] rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-lg"
            >
              Done
            </button>
          </div>
        </div>
      )}
      {activeVariationEditor && (
        <div className="fixed inset-0 z-[76] bg-slate-950/45 backdrop-blur-sm">
          <div className="flex h-full flex-col bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Variation
                </p>
                <p className="truncate text-sm font-semibold text-slate-900">
                  {buildVariationLabel(activeVariationEditor) || `Variant ${variations.findIndex((v) => v.id === activeVariationEditor.id) + 1}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveVariationEditorId('')}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
                aria-label="Close variation editor"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m6 6 12 12" />
                  <path d="m18 6-12 12" />
                </svg>
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-24">
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] text-slate-400">Price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={activeVariationEditor.regular_price || form.regular_price || form.price || ''}
                    onChange={(event) =>
                      updateVariation(activeVariationEditor.id, { regular_price: event.target.value })
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400">Sale Price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={activeVariationEditor.sale_price || form.sale_price || ''}
                    onChange={(event) =>
                      updateVariation(activeVariationEditor.id, { sale_price: event.target.value })
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400">SKU</label>
                  <input
                    value={activeVariationEditor.sku}
                    onChange={(event) =>
                      updateVariation(activeVariationEditor.id, { sku: event.target.value })
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs"
                    placeholder="Will be auto-generated"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Will be auto-generated if not added.
                  </p>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400">Quantity</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={activeVariationEditor.stock_quantity}
                    onChange={(event) =>
                      updateVariation(activeVariationEditor.id, { stock_quantity: event.target.value })
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400">Image</label>
                  <button
                    type="button"
                    onClick={() => setVariationImagePickerId(activeVariationEditor.id)}
                    className="mt-2 flex h-10 w-full items-center justify-center rounded-2xl border border-dashed border-slate-300 text-xs font-semibold text-slate-500 hover:border-slate-400"
                  >
                    {activeVariationEditor.image_id ? (
                      <span className="flex items-center gap-2 text-slate-600">
                        <span className="h-6 w-6 overflow-hidden rounded-md border border-slate-200 bg-white">
                          <LazyImage
                            src={
                              galleryImages.find((img) => String(img.id) === String(activeVariationEditor.image_id))
                                ?.url || ''
                            }
                            alt="Variation"
                          />
                        </span>
                        Change
                      </span>
                    ) : (
                      <span className="text-lg leading-none">+</span>
                    )}
                  </button>
                </div>
              </div>

              {selectedAttributesWithOptions.length > 0 && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {selectedAttributesWithOptions.map((attribute) => {
                    const attributeKey = attribute.taxonomy || attribute.name;
                    return (
                      <div key={`${activeVariationEditor.id}-${attributeKey}`}>
                        <label className="block text-[11px] text-slate-400">
                          {attribute.label || attribute.name}
                        </label>
                        <CustomSelect
                          value={activeVariationEditor.attributes?.[attributeKey] || ''}
                          onChange={(event) =>
                            updateVariationAttribute(
                              activeVariationEditor.id,
                              attributeKey,
                              event.target.value,
                            )
                          }
                          className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs"
                        >
                          <option value="">Select</option>
                          {attribute.selectedOptions.map((option) => (
                            <option
                              key={option.slug || option.name}
                              value={option.slug || toSlug(option.name || '')}
                            >
                              {option.name}
                            </option>
                          ))}
                        </CustomSelect>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => removeVariation(activeVariationEditor.id)}
                  className="w-full rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600"
                >
                  Remove variation
                </button>
              </div>
            </div>

            <div className="fixed bottom-[max(0.9rem,env(safe-area-inset-bottom))] right-4 z-[77] flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddManualVariation}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-900 shadow-lg ring-1 ring-slate-200"
                aria-label="Add new variation"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setActiveVariationEditorId('')}
                className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-lg"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      <ProductImageLibraryModal
        isOpen={isImageModalOpen}
        onClose={() => {
          setIsImageModalOpen(false);
          setImageLibraryPurpose('product');
        }}
        zIndexClass="z-[95]"
        zIndex={3000}
        selectedId={selectedImage?.id}
        selectedIds={
          imageLibraryPurpose === 'product'
            ? galleryImages.map((image) => image.id).filter(Boolean)
            : []
        }
        maxSelection={imageLibraryPurpose === 'product' ? 7 : 1}
        onApply={({ gallery }) => {
          if (imageLibraryPurpose !== 'product') {
            const selected = Array.isArray(gallery) ? gallery[0] : null;
            const imageUrl = selected?.url || '';
            if (imageUrl) {
              if (imageLibraryPurpose === 'description-expanded') {
                expandedDescriptionEditorRef.current?.insertImageFromUrl?.(imageUrl);
              } else {
                mainDescriptionEditorRef.current?.insertImageFromUrl?.(imageUrl);
              }
            }
            return;
          }
          const normalized = normalizeGallery(gallery);
          const primary = normalized[0] || null;
          setSelectedImage(primary);
          setGalleryImages(normalized);
          setForm((prev) => ({
            ...prev,
            image_id: primary?.id ? String(primary.id) : '',
            image_ids: normalized.map((image) => image.id).filter(Boolean),
          }));
        }}
      />
      {variationImagePickerId &&
        (typeof document !== 'undefined'
          ? createPortal(
        <div className="fixed inset-0 z-[3200] flex items-end justify-center px-0 py-0">
          <button
            type="button"
            onClick={() => setVariationImagePickerId('')}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            aria-label="Close variation image picker"
          />
          <div className="relative z-10 flex h-[70vh] w-full flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="mx-auto mt-2 h-1.5 w-14 rounded-full bg-slate-200" />
            <div className="flex items-center justify-between border-b border-slate-200/70 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                  Variation Image
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  Choose from product gallery
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVariationImagePickerId('')}
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
              >
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              {galleryImages.length === 0 && (
                <p className="text-xs text-slate-500">
                  Upload product images to select a variation image.
                </p>
              )}
              {galleryImages.length > 0 && (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {galleryImages.map((image) => (
                    <button
                      key={`variation-picker-${variationImagePickerId}-${image.id}`}
                      type="button"
                      onClick={() => {
                        updateVariation(variationImagePickerId, { image_id: image.id });
                        setVariationImagePickerId('');
                      }}
                      className={`group relative h-24 overflow-hidden rounded-2xl border ${
                        variations.find((item) => item.id === variationImagePickerId)?.image_id === image.id
                          ? 'border-emerald-400 ring-2 ring-emerald-200'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {image.url ? (
                        <LazyImage src={image.url} alt={image.title || 'Product image'} />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
                          Image
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>,
            document.body,
          )
          : null)}
      {isDescriptionExpanded && (
        <div className="fixed inset-0 z-[73] bg-slate-950/50 backdrop-blur-sm">
          <div className="flex h-full flex-col bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                  Description Editor
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  Full screen writing mode
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => expandedDescriptionEditorRef.current?.undo?.()}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
                  aria-label="Undo"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 7H4v5" />
                    <path d="M4 12a8 8 0 1 0 2.3-5.7L4 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => expandedDescriptionEditorRef.current?.redo?.()}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
                  aria-label="Redo"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 7h5v5" />
                    <path d="M20 12a8 8 0 1 1-2.3-5.7L20 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => expandedDescriptionEditorRef.current?.insertImage?.()}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
                  aria-label="Insert image"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <circle cx="9" cy="10" r="1.5" />
                    <path d="M21 15l-4.5-4.5L8 19" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setIsDescriptionExpanded(false)}
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Finish
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-0 sm:px-5 sm:py-5">
              <RichTextEditor
                ref={expandedDescriptionEditorRef}
                value={form.description}
                onChange={(nextValue) =>
                  setForm((prev) => ({
                    ...prev,
                    description: nextValue,
                  }))
                }
                onRequestImage={() => {
                  setImageLibraryPurpose('description-expanded');
                  setIsImageModalOpen(true);
                }}
                placeholder="Full product description"
                minHeight={560}
                showToolbar
                showTopActionButtons={false}
                showPinnedFormatMenu
                showFloatingFormatMenu={false}
                mobileEdgeToEdge
              />
            </div>
          </div>
        </div>
      )}
      {isColorImageMapOpen && (
        <div className="fixed inset-0 z-[72] bg-slate-900/40 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setIsColorImageMapOpen(false)}
            className="absolute inset-0"
            aria-label="Close color image mapper"
          />
          <div className="relative z-10 flex h-full flex-col bg-white">
            <div className="flex items-center justify-between border-b border-slate-200/70 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                  Color Image Mapping
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  Assign colors to image(s)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsColorImageMapOpen(false)}
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
              >
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 pb-24">
              {galleryImages.length === 0 && (
                <p className="text-xs text-slate-500">Upload product images first.</p>
              )}
              {galleryImages.length > 0 && (
                <div className="space-y-3">
                  {galleryImages.map((image) => (
                    <div
                      key={`color-map-${image.id}`}
                      className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-3 sm:grid-cols-[84px_1fr]"
                    >
                      <div className="relative h-[84px] w-[84px] overflow-hidden rounded-xl border border-slate-200 bg-white">
                        {image.url ? (
                          <LazyImage src={image.url} alt={image.title || 'Product image'} />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[10px] text-slate-400">
                            Image
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <label className="block text-[11px] text-slate-500">Color for this image</label>
                        <CustomSelect
                          value={getMappedColorForImage(image.id)}
                          onChange={(event) => handleAssignColorToImage(image.id, event.target.value)}
                          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                        >
                          <option value="">Unassigned</option>
                          {colorOptionsForMapping.map((option) => (
                            <option key={`color-option-${option.value}`} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </CustomSelect>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="fixed bottom-[max(0.9rem,env(safe-area-inset-bottom))] right-4 z-[73] flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsColorImageMapOpen(false)}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyColorImageMap}
                className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      {isPreviewNavigationBlockedOpen && (
        <div className="fixed inset-0 z-[85] flex items-end justify-center bg-slate-900/45 p-3 sm:items-center">
          <button
            type="button"
            onClick={() => setIsPreviewNavigationBlockedOpen(false)}
            className="absolute inset-0"
            aria-label="Close preview notice"
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
            <p className="text-sm font-semibold text-slate-900">Preview mode only</p>
            <p className="mt-2 text-xs text-slate-600">
              This is a draft preview. External navigation is blocked until the product goes live.
            </p>
            {blockedPreviewHref ? (
              <p className="mt-2 truncate text-[11px] text-slate-500">Blocked link: {blockedPreviewHref}</p>
            ) : null}
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsPreviewNavigationBlockedOpen(false)}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700"
              >
                Stay in preview
              </button>
              <LoadingButton
                type="button"
                onClick={() => {
                  setIsPreviewNavigationBlockedOpen(false);
                  handleSave({ statusOverride: 'publish' });
                }}
                isLoading={isSaving}
                className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
              >
                Go Live
              </LoadingButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductPreviewModal;
