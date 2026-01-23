import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { readStoredSiteId } from '../../../../utils/connector';
import LazyImage from '../components/LazyImage';
import ProductImageLibraryModal from './ProductImageLibraryModal';
import ProductCategorySelector from './ProductCategorySelector';
import ProductTagSelector from './ProductTagSelector';
import ProductBrandSelector from './ProductBrandSelector';
import { buildProductPayload, createProduct, updateProduct } from './functions/products';
import { fetchProductCategories } from './functions/categories';
import { fetchProductTags } from './functions/tags';
import { fetchProductBrands } from './functions/brands';
import { fetchProductAttributes } from './functions/attributes';
import { fetchSizeGuides } from './functions/sizeGuides';
import LoadingButton from '../../../../components/LoadingButton';

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
    categories: Array.isArray(product.categories)
      ? product.categories.map((item) => item.name).join(', ')
      : '',
    image_id: product?.images?.[0]?.id ? String(product.images[0].id) : '',
  };
};

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
  const [isVisible, setIsVisible] = useState(false);
  const [form, setForm] = useState(() => buildInitialForm(product));
  const [slug, setSlug] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [savedProduct, setSavedProduct] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [galleryImages, setGalleryImages] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
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
  const [sizeGuides, setSizeGuides] = useState([]);
  const [isSizeGuidesLoading, setIsSizeGuidesLoading] = useState(false);
  const [sizeGuidesError, setSizeGuidesError] = useState('');
  const [sizeGuideEnabled, setSizeGuideEnabled] = useState(false);
  const [selectedSizeGuideId, setSelectedSizeGuideId] = useState('');
  const [useDefaultSizeGuides, setUseDefaultSizeGuides] = useState(true);

  useEffect(() => {
    if (!isOpen) {
      setIsVisible(false);
      return;
    }
    const timer = setTimeout(() => setIsVisible(true), 20);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // Initialize selected categories when product changes
  useEffect(() => {
    if (product?.categories) {
      const categoryIds = Array.isArray(product.categories)
        ? product.categories.map(cat => cat.id || cat.name)
        : [];
      setSelectedCategories(categoryIds);
    } else {
      setSelectedCategories([]);
    }
  }, [product]);

  useEffect(() => {
    if (product?.tags) {
      const tagIds = Array.isArray(product.tags)
        ? product.tags.map(tag => tag.id || tag.name)
        : [];
      setSelectedTags(tagIds);
    } else {
      setSelectedTags([]);
    }
  }, [product]);

  useEffect(() => {
    if (product?.brands) {
      const brandIds = Array.isArray(product.brands)
        ? product.brands.map(brand => brand.id || brand.name)
        : [];
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

  const handleLoadTags = useCallback(() => {
    if (tagsLoaded || tagsLoading) return;
    setTagsLoading(true);
    setTagsError('');
    fetchProductTags()
      .then((payload) => {
        setAvailableTags(Array.isArray(payload?.tags) ? payload.tags : []);
        setTagsLoaded(true);
      })
      .catch((err) => {
        setAvailableTags([]);
        setTagsError(err?.message || 'Unable to load tags.');
      })
      .finally(() => {
        setTagsLoading(false);
      });
  }, [tagsLoaded, tagsLoading]);

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
    return () => {
      isActive = false;
    };
  }, [isOpen]);

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
    setForm(nextForm);
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
          url: image?.src || '',
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

  const previewSlug = useMemo(() => slug || toSlug(form.name), [form.name, slug]);
  const previewImage = selectedImage?.url || product?.images?.[0]?.src || '';
  const previewCandidateUrl = useMemo(
    () => buildProductUrl(savedProduct || { slug: previewSlug }, previewSlug, { preview: true }),
    [previewSlug, savedProduct],
  );
  const isEditing = Boolean(product?.id);
  const canDraftSave = Boolean(
    form.name.trim() &&
      (form.regular_price || form.price) &&
      form.image_id &&
      selectedCategories.length,
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
    setExpandedAttributes((prev) => ({ ...prev, [attribute.taxonomy]: true }));
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
    setExpandedAttributes((prev) => {
      const next = { ...prev };
      delete next[attributeKey];
      return next;
    });
  };

  const handleToggleAttributePanel = (attributeKey) => {
    setExpandedAttributes((prev) => ({ ...prev, [attributeKey]: !prev[attributeKey] }));
  };

  const handleAutoGenerateVariations = () => {
    if (!variationEnabled) return;
    if (!variationCombinations.length) {
      window.alert('Select attribute options before generating variants.');
      return;
    }
    const next = variationCombinations.map((combo, index) => ({
      id: `auto-${Date.now()}-${index}`,
      attributes: combo.attributes,
      use_custom_price: false,
      regular_price: '',
      sale_price: '',
      sku: '',
      stock_quantity: '',
      image_id: '',
    }));
    setVariations(next);
  };

  const handleAddManualVariation = () => {
    if (!variationEnabled) return;
    const attributes = {};
    selectedAttributesWithOptions.forEach((attribute) => {
      attributes[attribute.taxonomy || attribute.name] = '';
    });
    setVariations((prev) => [
      ...prev,
      {
        id: `manual-${Date.now()}-${prev.length}`,
        attributes,
        use_custom_price: false,
        regular_price: '',
        sale_price: '',
        sku: '',
        stock_quantity: '',
        image_id: '',
      },
    ]);
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
        return {
          ...variation,
          attributes: {
            ...variation.attributes,
            [attributeKey]: value,
          },
        };
      }),
    );
  };

  const removeVariation = (variationId) => {
    setVariations((prev) => prev.filter((variation) => variation.id !== variationId));
    if (variationImagePickerId === variationId) {
      setVariationImagePickerId('');
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

  const buildAttributePayload = () => {
    if (!variationEnabled) return [];
    return selectedAttributesWithOptions.map((attribute) => ({
      name: attribute.name || attribute.label,
      label: attribute.label || attribute.name,
      taxonomy: attribute.taxonomy || '',
      options: attribute.selectedOptions.map((option) => option.name),
    }));
  };

  const buildVariationPayload = () => {
    if (!variationEnabled || !variations.length) return [];
    return variations.map((variation) => ({
      attributes: variation.attributes,
      regular_price: variation.use_custom_price ? variation.regular_price : '',
      sale_price: variation.use_custom_price ? variation.sale_price : '',
      sku: variation.sku,
      stock_quantity:
        variation.stock_quantity !== '' && variation.stock_quantity !== undefined
          ? String(variation.stock_quantity)
          : '',
      image_id: variation.image_id,
    }));
  };

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
    if (!selectedCategories.length) {
      setError('Select at least one category.');
      return;
    }
    setIsSaving(true);
    setError('');
    setStatusMessage('');
    try {
      // Prepare form data with selected categories
      const formData = {
        ...form,
        ...resolveTaxonomyPayload(selectedCategories, availableCategories, 'category_ids', 'category_names'),
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
      const payload = buildProductPayload(nextForm);
      const saved = existingId
        ? await updateProduct({ id: existingId, updates: payload })
        : await createProduct({ form: nextForm });
      setStatusMessage(isEditing ? 'Product updated.' : 'Product saved.');
      setSavedProduct(saved);
      const nextUrl = buildProductUrl(saved, previewSlug);
      setPreviewUrl(nextUrl);
      if (onSaved) {
        onSaved(saved);
      }
      if (statusOverride === 'publish' && nextUrl) {
        const resolvedUrl = new URL(nextUrl, window.location.origin);
        router.push(`${resolvedUrl.pathname}${resolvedUrl.search}${resolvedUrl.hash}`);
      }
    } catch (saveError) {
      setError(saveError?.message || 'Unable to save product.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDraftSave = async () => {
    if (!canDraftSave) return '';
    const basePrice = form.regular_price || form.price;
    if (!basePrice || !form.image_id || !selectedCategories.length) return '';
    setIsDraftSaving(true);
    setDraftReady(false);
    try {
      const draftForm = {
        ...form,
        status: 'draft',
        ...resolveTaxonomyPayload(selectedCategories, availableCategories, 'category_ids', 'category_names'),
        ...resolveTaxonomyPayload(selectedTags, availableTags, 'tag_ids', 'tag_names'),
        ...resolveTaxonomyPayload(selectedBrands, availableBrands, 'brand_ids', 'brand_names'),
        product_type: variationEnabled ? 'variable' : 'simple',
        attributes: buildAttributePayload(),
        variations: buildVariationPayload(),
        size_guide_id: sizeGuideEnabled ? selectedSizeGuideId : '',
      };
      const existingId = savedProduct?.id || product?.id;
      const payload = buildProductPayload(draftForm);
      const saved = existingId
        ? await updateProduct({ id: existingId, updates: payload })
        : await createProduct({ form: draftForm });
      setSavedProduct(saved);
      const nextUrl = buildProductUrl(saved, previewSlug, { preview: true });
      setPreviewUrl(nextUrl);
      setDraftReady(true);
      setStatusMessage('Draft saved.');
      return nextUrl;
    } catch (_error) {
      setDraftReady(false);
      return '';
    } finally {
      setIsDraftSaving(false);
    }
  };

  const handlePreview = async () => {
    if (isDraftSaving) return;
    if (!canDraftSave) {
      setError('Add a name, price, image, and category to preview.');
      return;
    }
    const nextUrl = draftReady && previewUrl ? previewUrl : await handleDraftSave();
    if (nextUrl) {
      window.open(nextUrl, '_blank');
    }
  };

  if (!isOpen) return null;

  const isFullPage = mode === 'page';

  return (
    <div className={isFullPage ? 'min-h-screen bg-slate-50' : 'fixed inset-0 z-50 flex items-end justify-center'}>
      {!isFullPage && (
        <button
          type="button"
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          aria-label="Close product preview"
        />
      )}
      <div
        className={`relative flex w-full flex-col overflow-hidden border border-slate-200 bg-white shadow-2xl ${
          isFullPage
            ? 'min-h-screen max-w-none rounded-none'
            : `max-w-6xl rounded-t-[32px] transition-transform duration-300 ${
                isVisible ? 'translate-y-0' : 'translate-y-full'
              }`
        }`}
        style={isFullPage ? undefined : { maxHeight: 'calc(100vh - 24px)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Product Preview
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">
              {isEditing ? 'Edit Product' : 'Add New Product'}
            </h2>
            <p className="mt-1 text-xs text-slate-500">Preview, save, and publish your product.</p>
          </div>
          <div className="flex items-center gap-2">
            {!isFullPage && (
              <button
                type="button"
                onClick={onExpand}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500"
                aria-label="Open full page"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 17h10V7" />
                  <path d="M7 7h10v10" />
                </svg>
              </button>
            )}
            <LoadingButton
              type="button"
              onClick={handlePreview}
              disabled={!canDraftSave}
              isLoading={isDraftSaving}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 disabled:cursor-not-allowed disabled:text-slate-300"
            >
              Preview
            </LoadingButton>
            <LoadingButton
              type="button"
              onClick={handleDraftSave}
              disabled={!canDraftSave}
              isLoading={isDraftSaving}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 disabled:cursor-not-allowed disabled:text-slate-300"
            >
              Save draft
            </LoadingButton>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500"
            >
              Cancel
            </button>
            <LoadingButton
              type="button"
              onClick={() => handleSave({ statusOverride: 'publish' })}
              isLoading={isSaving}
              className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              Live
            </LoadingButton>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,_1fr)_minmax(0,_2fr)]">
          <aside className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">Thumbnail</p>
              <button
                type="button"
                onClick={() => setIsImageModalOpen(true)}
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
                        className={`relative h-14 w-14 overflow-hidden rounded-2xl border ${
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

            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-600">Status</p>
                <span className={`h-2 w-2 rounded-full ${form.status === 'publish' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
              </div>
              <select
                value={form.status}
                onChange={handleChange('status')}
                className="mt-3 w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs text-slate-600"
              >
                <option value="publish">Published</option>
                <option value="draft">Draft (Hidden)</option>
              </select>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-600">Product Details</p>
              <label className="mt-3 block text-[11px] text-slate-400">SKU</label>
              <input
                value={form.sku}
                onChange={handleChange('sku')}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs"
                placeholder="Optional SKU"
              />
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
              <label className="mt-4 block text-[11px] text-slate-400">Categories</label>
              <ProductCategorySelector
                selectedCategories={selectedCategories}
                onSelectCategories={setSelectedCategories}
                categories={availableCategories}
                frequentlyUsedCategories={frequentlyUsedCategories}
                isLoading={categoriesLoading}
                errorMessage={categoriesError}
                onOpen={handleLoadCategories}
                maxTopCategories={10}
                className="mt-2 w-full"
              />
              <label className="mt-4 block text-[11px] text-slate-400">Tags</label>
              <ProductTagSelector
                selectedTags={selectedTags}
                onSelectTags={setSelectedTags}
                tags={availableTags}
                isLoading={tagsLoading}
                errorMessage={tagsError}
                onOpen={handleLoadTags}
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
            </div>
          </aside>

          <section className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">General</p>
              <label className="mt-4 block text-[11px] text-slate-400">Product Name</label>
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
              <label className="mt-4 block text-[11px] text-slate-400">Short Description</label>
              <textarea
                value={form.short_description}
                onChange={handleChange('short_description')}
                rows={3}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs text-slate-600"
                placeholder="Short description for cards and previews"
              />
              <label className="mt-4 block text-[11px] text-slate-400">Description</label>
              <textarea
                value={form.description}
                onChange={handleChange('description')}
                rows={6}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs text-slate-600"
                placeholder="Full product description"
              />
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">Pricing</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] text-slate-400">Base Price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.regular_price || form.price}
                    onChange={handleChange('regular_price')}
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

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900">Variations</p>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <input
                    type="checkbox"
                    checked={variationEnabled}
                    onChange={(event) => setVariationEnabled(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  Enable variations
                </label>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Choose global attributes, then select the options that should generate variants.
              </p>
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

              <div className="mt-4 flex flex-wrap gap-3">
                <select
                  onChange={(event) => {
                    const selected = selectableAttributes.find(
                      (attribute) => String(attribute.id) === event.target.value,
                    );
                    handleAddAttribute(selected);
                    event.target.value = '';
                  }}
                  className="min-w-[200px] rounded-2xl border border-slate-200 px-3 py-2 text-xs text-slate-600"
                  defaultValue=""
                  disabled={!variationEnabled}
                >
                  <option value="" disabled>
                    Add attribute...
                  </option>
                  {selectableAttributes.map((attribute) => (
                    <option key={attribute.id} value={attribute.id}>
                      {attribute.label || attribute.name}
                    </option>
                  ))}
                </select>

              </div>

              {selectedAttributes.length > 0 && (
                <div className="mt-5 space-y-4">
                  {selectedAttributes.map((attribute) => {
                    const attributeKey = attribute.taxonomy || attribute.name;
                    const isExpanded = expandedAttributes[attributeKey] !== false;
                    return (
                    <div
                      key={attributeKey}
                      className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold text-slate-700">
                            {attribute.label || attribute.name}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            {attribute.selectedOptionIds.length} option
                            {attribute.selectedOptionIds.length === 1 ? '' : 's'} selected
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleToggleAttributePanel(attributeKey)}
                            className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                          >
                            {isExpanded ? 'Done' : 'Edit'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttribute(attributeKey)}
                            className="text-xs font-semibold text-slate-400 hover:text-slate-600"
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {attribute.terms.map((term) => {
                              const termId = term.id || term.name;
                              const isSelected = attribute.selectedOptionIds.includes(termId);
                              return (
                                <button
                                  key={termId}
                                  type="button"
                                  onClick={() => handleToggleOption(attributeKey, term)}
                                  className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
                                    isSelected
                                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                  }`}
                                  disabled={!variationEnabled}
                                >
                                  <span className="h-2 w-2 rounded-full bg-slate-300" />
                                  {term.name}
                                </button>
                              );
                            })}
                            {attribute.terms.length === 0 && (
                              <span className="text-[11px] text-slate-400">No options yet.</span>
                            )}
                          </div>

                        </>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}

              {variationEnabled && (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-600">Variants</p>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-500">
                        {variations.length} variant{variations.length === 1 ? '' : 's'}
                      </span>
                      <button
                        type="button"
                        onClick={handleAutoGenerateVariations}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Auto-generate
                      </button>
                      <button
                        type="button"
                        onClick={handleAddManualVariation}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Add manual
                      </button>
                    </div>
                  </div>
                  {variations.length === 0 && (
                    <div className="mt-3 text-[11px] text-slate-400">
                      Auto-generate or add manual variants to configure pricing and images.
                    </div>
                  )}
                  {variations.length > 0 && (
                    <div className="mt-4 space-y-3">
                      {variations.map((variation) => (
                        <div
                          key={variation.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-semibold text-slate-700">
                                {buildVariationLabel(variation) || 'New variation'}
                              </p>
                              <p className="mt-1 text-[11px] text-slate-500">
                                Customize pricing, image, and attributes.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeVariation(variation.id)}
                              className="text-xs font-semibold text-slate-400 hover:text-slate-600"
                            >
                              Remove
                            </button>
                          </div>

                          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                              <label className="block text-[11px] text-slate-400">Price</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={
                                  variation.use_custom_price
                                    ? variation.regular_price
                                    : form.regular_price || form.price || ''
                                }
                                onChange={(event) =>
                                  updateVariation(variation.id, { regular_price: event.target.value })
                                }
                                className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs"
                                placeholder="0.00"
                                disabled={!variation.use_custom_price}
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] text-slate-400">Sale Price</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={
                                  variation.use_custom_price
                                    ? variation.sale_price
                                    : form.sale_price || ''
                                }
                                onChange={(event) =>
                                  updateVariation(variation.id, { sale_price: event.target.value })
                                }
                                className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs"
                                placeholder="Optional"
                                disabled={!variation.use_custom_price}
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] text-slate-400">SKU</label>
                              <input
                                value={variation.sku}
                                onChange={(event) =>
                                  updateVariation(variation.id, { sku: event.target.value })
                                }
                                className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs"
                                placeholder="Optional SKU"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] text-slate-400">Quantity</label>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={variation.stock_quantity}
                                onChange={(event) =>
                                  updateVariation(variation.id, { stock_quantity: event.target.value })
                                }
                                className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] text-slate-400">Image</label>
                              <button
                                type="button"
                                onClick={() => setVariationImagePickerId(variation.id)}
                                className="mt-2 flex h-10 w-full items-center justify-center rounded-2xl border border-dashed border-slate-300 text-xs font-semibold text-slate-500 hover:border-slate-400"
                              >
                                {variation.image_id ? (
                                  <span className="flex items-center gap-2 text-slate-600">
                                    <span className="h-6 w-6 overflow-hidden rounded-md border border-slate-200 bg-white">
                                      <LazyImage
                                        src={
                                          galleryImages.find((img) => String(img.id) === String(variation.image_id))
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

                          <label className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                            <input
                              type="checkbox"
                              checked={variation.use_custom_price}
                              onChange={(event) =>
                                updateVariation(variation.id, { use_custom_price: event.target.checked })
                              }
                              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            Use different price for this variation
                          </label>

                          {selectedAttributesWithOptions.length > 0 && (
                            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                              {selectedAttributesWithOptions.map((attribute) => {
                                const attributeKey = attribute.taxonomy || attribute.name;
                                return (
                                  <div key={`${variation.id}-${attributeKey}`}>
                                    <label className="block text-[11px] text-slate-400">
                                      {attribute.label || attribute.name}
                                    </label>
                                    <select
                                      value={variation.attributes?.[attributeKey] || ''}
                                      onChange={(event) =>
                                        updateVariationAttribute(
                                          variation.id,
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
                                    </select>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
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
                Pick a size guide created in WooCommerce for this product.
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
                <select
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
                </select>
              </div>
            </div>
          </section>
          </div>
        </div>

        {(statusMessage || error) && (
          <div className="border-t border-slate-200/70 px-6 py-3">
            {statusMessage && <p className="text-xs font-semibold text-emerald-600">{statusMessage}</p>}
            {error && <p className="text-xs text-rose-500">{error}</p>}
          </div>
        )}
      </div>
      <ProductImageLibraryModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        selectedId={selectedImage?.id}
        selectedIds={galleryImages.map((image) => image.id).filter(Boolean)}
        onApply={({ gallery }) => {
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
      {variationImagePickerId && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 py-6">
          <button
            type="button"
            onClick={() => setVariationImagePickerId('')}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            aria-label="Close variation image picker"
          />
          <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
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
            <div className="max-h-[60vh] overflow-y-auto px-5 py-5">
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
        </div>
      )}
    </div>
  );
}

export default ProductPreviewModal;
