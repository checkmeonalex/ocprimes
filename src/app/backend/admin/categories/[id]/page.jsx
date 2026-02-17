'use client';
import { useEffect, useState, useRef, use } from 'react';
import Link from 'next/link';
import AdminSidebar from '@/components/AdminSidebar';
import AdminDesktopHeader from '@/components/admin/AdminDesktopHeader';
import ProductImageLibraryModal from '../../products/ProductImageLibraryModal.jsx';
import ProductPickerModal from '../../components/ProductPickerModal.jsx';
import ColorPicker from '../../components/ColorPicker.jsx';
import {
  CATEGORY_LAYOUT_KEYS,
  CATEGORY_LAYOUT_LABELS,
  normalizeCategoryLayoutOrder,
} from '@/lib/layouts/category-layout';

const createDraftLayout = (order = 0) => ({
  id: `temp-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  image_url: '',
  image_key: '',
  image_alt: '',
  sort_order: order,
  hotspots: [],
});

const emptyLogoGrid = {
  id: '',
  title: '',
  title_bg_color: '#fed7aa',
  title_text_color: '#111827',
  items: [],
};

const emptyBrowseCards = {
  all: [],
  men: [],
  women: [],
};

function CategoryDetailPage({ params }) {
  const resolvedParams = use(params);
  const categoryId = resolvedParams?.id || '';
  const [item, setItem] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    is_active: true,
    banner_title: '',
    banner_subtitle: '',
    banner_cta_text: '',
    banner_cta_link: '',
    featured_strip_tag_id: '',
    featured_strip_category_id: '',
    hotspot_title_main: '',
    featured_strip_title_main: '',
    browse_categories_title: '',
    home_catalog_title: '',
    home_catalog_description: '',
    home_catalog_filter_mode: 'none',
    home_catalog_category_id: '',
    home_catalog_tag_id: '',
    home_catalog_limit: 12,
  });
  const [layoutOrder, setLayoutOrder] = useState(CATEGORY_LAYOUT_KEYS);
  const [draggingLayoutKey, setDraggingLayoutKey] = useState('');
  const [layoutDragOverKey, setLayoutDragOverKey] = useState('');
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const fileInputRef = useRef(null);
  const [bannerSliderDesktop, setBannerSliderDesktop] = useState([]);
  const [bannerSliderMobile, setBannerSliderMobile] = useState([]);
  const [activeSliderDevice, setActiveSliderDevice] = useState('desktop');
  const [bannerSliderLinks, setBannerSliderLinks] = useState([]);
  const [savingSliderLinks, setSavingSliderLinks] = useState(false);
  const [children, setChildren] = useState([]);
  const [childrenLoading, setChildrenLoading] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [tags, setTags] = useState([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [availableCategoryIds, setAvailableCategoryIds] = useState(null);
  const [availableTagIds, setAvailableTagIds] = useState(null);
  const [featureFilterType, setFeatureFilterType] = useState('none');
  const [uploadingSlot, setUploadingSlot] = useState('');
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryContext, setLibraryContext] = useState({
    type: 'slider',
    index: 0,
    device: 'desktop',
  });
  const [hotspotLayouts, setHotspotLayouts] = useState([]);
  const [activeLayoutId, setActiveLayoutId] = useState('');
  const [hotspotLoading, setHotspotLoading] = useState(false);
  const [hotspotSaving, setHotspotSaving] = useState(false);
  const [hotspotError, setHotspotError] = useState('');
  const [activeHotspotId, setActiveHotspotId] = useState('');
  const [pendingHotspotId, setPendingHotspotId] = useState('');
  const [showHotspotPicker, setShowHotspotPicker] = useState(false);
  const hotspotImageRef = useRef(null);
  const [logoGrid, setLogoGrid] = useState(emptyLogoGrid);
  const [logoGridLoading, setLogoGridLoading] = useState(false);
  const [logoGridSaving, setLogoGridSaving] = useState(false);
  const [logoGridError, setLogoGridError] = useState('');
  const [browseCards, setBrowseCards] = useState(emptyBrowseCards);
  const [browseCardsLoading, setBrowseCardsLoading] = useState(false);
  const [browseCardsSaving, setBrowseCardsSaving] = useState(false);
  const [browseCardsError, setBrowseCardsError] = useState('');
  const [activeBrowseSegment, setActiveBrowseSegment] = useState('all');
  const activeLayout =
    hotspotLayouts.find((layout) => layout.id === activeLayoutId) ||
    hotspotLayouts[0] ||
    null;

  useEffect(() => {
    if (!categoryId) return;
    const load = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/admin/categories/${categoryId}`, {
          credentials: 'include',
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error || 'Unable to load category.');
        }
        const next = payload?.item || null;
        setItem(next);
        if (next) {
          setForm({
            name: next.name || '',
            slug: next.slug || '',
            description: next.description || '',
            is_active: !!next.is_active,
            banner_title: next.banner_title || '',
            banner_subtitle: next.banner_subtitle || '',
            banner_cta_text: next.banner_cta_text || '',
            banner_cta_link: next.banner_cta_link || '',
            featured_strip_tag_id: next.featured_strip_tag_id || '',
            featured_strip_category_id: next.featured_strip_category_id || '',
            hotspot_title_main: next.hotspot_title_main || '',
            featured_strip_title_main: next.featured_strip_title_main || '',
            browse_categories_title: next.browse_categories_title || '',
            home_catalog_title: next.home_catalog_title || '',
            home_catalog_description: next.home_catalog_description || '',
            home_catalog_filter_mode: next.home_catalog_filter_mode || 'none',
            home_catalog_category_id: next.home_catalog_category_id || '',
            home_catalog_tag_id: next.home_catalog_tag_id || '',
            home_catalog_limit: Number(next.home_catalog_limit) > 0 ? Number(next.home_catalog_limit) : 12,
          });
          setLayoutOrder(normalizeCategoryLayoutOrder(next.layout_order));
          const nextTagId = next.featured_strip_tag_id || '';
          const nextCategoryId = next.featured_strip_category_id || '';
          setFeatureFilterType(nextTagId ? 'tag' : nextCategoryId ? 'category' : 'none');
          setBannerSliderDesktop(Array.isArray(next.banner_slider_urls) ? next.banner_slider_urls : []);
          setBannerSliderMobile(
            Array.isArray(next.banner_slider_mobile_urls) ? next.banner_slider_mobile_urls : [],
          );
          setBannerSliderLinks(Array.isArray(next.banner_slider_links) ? next.banner_slider_links : []);
        }
        // load subcategories + filterable ids
        setChildrenLoading(true);
        try {
          const [treeResp, filterResp] = await Promise.all([
            fetch('/api/admin/categories/tree?limit=500', {
              credentials: 'include',
            }),
            fetch('/api/admin/product-filters?status=publish', {
              credentials: 'include',
            }),
          ]);
          const treePayload = await treeResp.json().catch(() => null);
          const filterPayload = await filterResp.json().catch(() => null);
          const categoryIds = Array.isArray(filterPayload?.category_ids)
            ? filterPayload.category_ids
            : [];
          const tagIds = Array.isArray(filterPayload?.tag_ids)
            ? filterPayload.tag_ids
            : [];
          setAvailableCategoryIds(categoryIds.length ? new Set(categoryIds) : null);
          setAvailableTagIds(tagIds.length ? new Set(tagIds) : null);
          if (treeResp.ok && Array.isArray(treePayload?.items)) {
            const filtered = categoryIds.length
              ? treePayload.items.filter((c) => categoryIds.includes(c.id))
              : treePayload.items;
            setCategoryOptions(filtered);
            const subs = filtered.filter((c) => c.parent_id === next?.id);
            setChildren(subs);
          } else {
            setCategoryOptions([]);
            setChildren([]);
          }
        } catch (_err) {
          setChildren([]);
        } finally {
          setChildrenLoading(false);
        }

        setHotspotLoading(true);
        setHotspotError('');
        try {
          const hotspotResp = await fetch(`/api/admin/categories/${categoryId}/hotspot`, {
            credentials: 'include',
          });
          const hotspotPayload = await hotspotResp.json().catch(() => null);
          if (!hotspotResp.ok) {
            throw new Error(hotspotPayload?.error || 'Unable to load hotspot layout.');
          }
          const items = Array.isArray(hotspotPayload?.items) ? hotspotPayload.items : [];
          setHotspotLayouts(items);
          setActiveLayoutId((prev) => {
            if (items.find((layout) => layout.id === prev)) return prev;
            return items[0]?.id || '';
          });
        } catch (hotspotErr) {
          setHotspotLayouts([]);
          setActiveLayoutId('');
          setHotspotError(hotspotErr?.message || 'Unable to load hotspot layout.');
        } finally {
          setHotspotLoading(false);
        }

        setLogoGridLoading(true);
        setLogoGridError('');
        try {
          const logoResp = await fetch(`/api/admin/categories/${categoryId}/logo-grid`, {
            credentials: 'include',
          });
          const logoPayload = await logoResp.json().catch(() => null);
          if (!logoResp.ok) {
            throw new Error(logoPayload?.error || 'Unable to load logo grid.');
          }
          const raw = logoPayload?.item || emptyLogoGrid;
          setLogoGrid({
            ...raw,
            title_bg_color: raw.title_bg_color || '#fed7aa',
            title_text_color: raw.title_text_color || '#111827',
            items: Array.isArray(raw.items) ? raw.items : [],
          });
        } catch (logoErr) {
          setLogoGrid(emptyLogoGrid);
          setLogoGridError(logoErr?.message || 'Unable to load logo grid.');
        } finally {
          setLogoGridLoading(false);
        }

        setBrowseCardsLoading(true);
        setBrowseCardsError('');
        try {
          const browseResp = await fetch(`/api/admin/categories/${categoryId}/browse-cards`, {
            credentials: 'include',
          });
          const browsePayload = await browseResp.json().catch(() => null);
          if (!browseResp.ok) {
            throw new Error(browsePayload?.error || 'Unable to load browse cards.');
          }
          const items = Array.isArray(browsePayload?.items) ? browsePayload.items : [];
          const grouped = { all: [], men: [], women: [] };
          items.forEach((entry) => {
            const segment = String(entry?.segment || '').toLowerCase();
            if (!grouped[segment]) return;
            grouped[segment].push({
              id: entry.id || `${segment}-${entry.image_url || Math.random()}`,
              name: entry.name || '',
              link: entry.link || '',
              image_url: entry.image_url || '',
              image_key: entry.image_key || null,
              image_alt: entry.image_alt || '',
            });
          });
          setBrowseCards(grouped);
        } catch (browseErr) {
          setBrowseCards(emptyBrowseCards);
          setBrowseCardsError(browseErr?.message || 'Unable to load browse cards.');
        } finally {
          setBrowseCardsLoading(false);
        }
      } catch (err) {
        setError(err?.message || 'Unable to load category.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [categoryId]);

  useEffect(() => {
    let isMounted = true;
    const loadTags = async () => {
      setTagsLoading(true);
      try {
        const response = await fetch('/api/admin/tags?per_page=50', {
          credentials: 'include',
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error || 'Unable to load tags.');
        }
        if (isMounted) {
          const nextTags = Array.isArray(payload?.items) ? payload.items : [];
          if (availableTagIds && availableTagIds.size) {
            setTags(nextTags.filter((tag) => availableTagIds.has(tag.id)));
          } else {
            setTags(nextTags);
          }
        }
      } catch (err) {
        if (isMounted) {
          setTags([]);
        }
        console.error(err);
      } finally {
        if (isMounted) setTagsLoading(false);
      }
    };
    loadTags();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!availableTagIds || !availableTagIds.size) return;
    setTags((prev) => prev.filter((tag) => availableTagIds.has(tag.id)));
  }, [availableTagIds]);

  useEffect(() => {
    if (!draggingLayoutKey) return;
    const handlePointerUp = () => {
      setDraggingLayoutKey('');
      setLayoutDragOverKey('');
    };
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [draggingLayoutKey]);

  const handleSave = async () => {
    if (!item?.id) return;
    setSaving(true);
    setSaveMsg('');
    setError('');
    const nextFeaturedTagId =
      featureFilterType === 'tag' ? form.featured_strip_tag_id || null : null;
    const nextFeaturedCategoryId =
      featureFilterType === 'category' ? form.featured_strip_category_id || null : null;
    try {
      const response = await fetch('/api/admin/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: item.id,
          name: form.name.trim(),
          slug: form.slug.trim(),
          description: form.description.trim(),
          is_active: form.is_active,
          layout_order: layoutOrder,
          banner_title: form.banner_title?.trim() || null,
          banner_subtitle: form.banner_subtitle?.trim() || null,
          banner_cta_text: form.banner_cta_text?.trim() || null,
          banner_cta_link: form.banner_cta_link?.trim() || null,
          hotspot_title_main: form.hotspot_title_main?.trim() || null,
          featured_strip_title_main: form.featured_strip_title_main?.trim() || null,
          browse_categories_title: form.browse_categories_title?.trim() || null,
          home_catalog_title: form.home_catalog_title?.trim() || null,
          home_catalog_description: form.home_catalog_description?.trim() || null,
          home_catalog_filter_mode: form.home_catalog_filter_mode || 'none',
          home_catalog_category_id:
            form.home_catalog_filter_mode === 'category'
              ? form.home_catalog_category_id || null
              : null,
          home_catalog_tag_id:
            form.home_catalog_filter_mode === 'tag'
              ? form.home_catalog_tag_id || null
              : null,
          home_catalog_limit: Math.min(30, Math.max(1, Number(form.home_catalog_limit) || 12)),
          featured_strip_tag_id: nextFeaturedTagId,
          featured_strip_category_id: nextFeaturedCategoryId,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to save category.');
      }
      const updated = payload?.item || item;
      setItem(updated);
      if (updated?.layout_order) {
        setLayoutOrder(normalizeCategoryLayoutOrder(updated.layout_order));
      }
      setSaveMsg('Saved.');
    } catch (err) {
      setError(err?.message || 'Unable to save category.');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(''), 2000);
    }
  };

  const reorderLayout = (fromIndex, toIndex) => {
    setLayoutOrder((prev) => {
      if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const handleLayoutHover = (targetKey) => {
    if (!draggingLayoutKey || draggingLayoutKey === targetKey) return;
    const fromIndex = layoutOrder.indexOf(draggingLayoutKey);
    const toIndex = layoutOrder.indexOf(targetKey);
    reorderLayout(fromIndex, toIndex);
    setLayoutDragOverKey(targetKey);
  };

  const moveLayoutBy = (key, direction) => {
    const fromIndex = layoutOrder.indexOf(key);
    const toIndex = fromIndex + direction;
    reorderLayout(fromIndex, toIndex);
  };

  const handleUpload = async (file) => {
    if (!file || !item?.id) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category_id', item.id);
      const uploadResp = await fetch('/api/admin/categories/image/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const uploadPayload = await uploadResp.json().catch(() => null);
      if (!uploadResp.ok) {
        throw new Error(uploadPayload?.error || 'Unable to upload image.');
      }
      const { url, key } = uploadPayload;
      const patchResp = await fetch('/api/admin/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: item.id,
          image_url: url,
          image_key: key,
          image_alt: form.name || item.name,
        }),
      });
      const patchPayload = await patchResp.json().catch(() => null);
      if (!patchResp.ok) {
        throw new Error(patchPayload?.error || 'Unable to save image.');
      }
      const updated = patchPayload?.item || { ...item, image_url: url, image_key: key };
      setItem(updated);
    } catch (err) {
      setError(err?.message || 'Unable to upload image.');
    } finally {
      setUploading(false);
    }
  };

  const handleLibraryApply = async ({ gallery }) => {
    const first = Array.isArray(gallery) ? gallery[0] : null;
    if (!first || !item?.id) {
      setShowLibrary(false);
      return;
    }
    const url = first.url;
    const key = first.r2_key || first.key || null;

    if (libraryContext.type === 'logo-grid') {
      const galleryItems = Array.isArray(gallery) ? gallery : [];
      const mapped = galleryItems
        .filter((entry) => entry?.url)
        .map((entry) => ({
          id: entry.id || entry.r2_key || entry.url,
          image_url: entry.url,
          image_key: entry.r2_key || entry.key || null,
          image_alt: entry.alt_text || entry.title || '',
        }));
      setLogoGrid((prev) => {
        const existing = Array.isArray(prev.items) ? prev.items : [];
        const seen = new Set(existing.map((item) => item.image_key || item.image_url));
        const nextItems = [...existing];
        mapped.forEach((item) => {
          const key = item.image_key || item.image_url;
          if (!seen.has(key)) {
            seen.add(key);
            nextItems.push(item);
          }
        });
        return {
          ...prev,
          items: nextItems.slice(0, 60),
        };
      });
      setShowLibrary(false);
      setUploadingSlot('');
      return;
    }

    if (String(libraryContext.type || '').startsWith('browse-')) {
      const segment = String(libraryContext.type).replace('browse-', '');
      if (!['all', 'men', 'women'].includes(segment)) {
        setShowLibrary(false);
        setUploadingSlot('');
        return;
      }
      const galleryItems = Array.isArray(gallery) ? gallery : [];
      const mapped = galleryItems
        .filter((entry) => entry?.url)
        .map((entry) => ({
          id: entry.id || entry.r2_key || entry.url,
          name: entry.alt_text || entry.title || 'Category',
          link: '',
          image_url: entry.url,
          image_key: entry.r2_key || entry.key || null,
          image_alt: entry.alt_text || entry.title || '',
        }));
      setBrowseCards((prev) => {
        const existing = Array.isArray(prev[segment]) ? prev[segment] : [];
        const seen = new Set(existing.map((card) => card.image_key || card.image_url));
        const nextCards = [...existing];
        mapped.forEach((card) => {
          const dedupeKey = card.image_key || card.image_url;
          if (!seen.has(dedupeKey)) {
            seen.add(dedupeKey);
            nextCards.push(card);
          }
        });
        return {
          ...prev,
          [segment]: nextCards.slice(0, 24),
        };
      });
      setShowLibrary(false);
      setUploadingSlot('');
      return;
    }

    if (libraryContext.type === 'hotspot') {
      if (!activeLayout?.id) {
        const draft = createDraftLayout(hotspotLayouts.length);
        setHotspotLayouts((prev) => [
          ...prev,
          {
            ...draft,
            image_url: url,
            image_key: key,
            image_alt: form.name || item.name || 'Hotspot',
          },
        ]);
        setActiveLayoutId(draft.id);
      } else {
        setHotspotLayouts((prev) =>
          prev.map((layout) =>
            layout.id === activeLayout.id
              ? {
                  ...layout,
                  image_url: url,
                  image_key: key,
                  image_alt: form.name || item.name || 'Hotspot',
                }
              : layout,
          ),
        );
      }
      setShowLibrary(false);
      setUploadingSlot('');
      return;
    }

    if (libraryContext.type === 'featured') {
      setUploadingSlot('featured');
      try {
        await fetch('/api/admin/categories', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            id: item.id,
            featured_strip_image_url: url,
            featured_strip_image_key: key,
          }),
        });
        setItem((prev) => ({
          ...(prev || {}),
          featured_strip_image_url: url,
          featured_strip_image_key: key,
        }));
      } catch (err) {
        setError(err?.message || 'Unable to save featured image.');
      }
    } else {
      const sliderIndex = Number.isInteger(libraryContext.index) ? libraryContext.index : 0;
      const sliderDevice = libraryContext.device === 'mobile' ? 'mobile' : 'desktop';
      setUploadingSlot(`slider-${sliderDevice}-${sliderIndex}`);
      const isMobile = sliderDevice === 'mobile';
      const nextDesktopUrls = [...bannerSliderDesktop];
      const nextMobileUrls = [...bannerSliderMobile];
      const nextDesktopKeys = Array.isArray(item.banner_slider_keys) ? [...item.banner_slider_keys] : [];
      const nextMobileKeys = Array.isArray(item.banner_slider_mobile_keys)
        ? [...item.banner_slider_mobile_keys]
        : [];
      if (isMobile) {
        nextMobileUrls[sliderIndex] = url;
        nextMobileKeys[sliderIndex] = key;
      } else {
        nextDesktopUrls[sliderIndex] = url;
        nextDesktopKeys[sliderIndex] = key;
      }
      const nextLinks = Array.isArray(bannerSliderLinks) ? [...bannerSliderLinks] : [];
      try {
        await fetch('/api/admin/categories', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            id: item.id,
            banner_slider_urls: nextDesktopUrls.slice(0, 5),
            banner_slider_keys: nextDesktopKeys.slice(0, 5),
            banner_slider_mobile_urls: nextMobileUrls.slice(0, 5),
            banner_slider_mobile_keys: nextMobileKeys.slice(0, 5),
            banner_slider_links: nextLinks.slice(0, 5),
          }),
        });
        setBannerSliderDesktop(nextDesktopUrls.slice(0, 5));
        setBannerSliderMobile(nextMobileUrls.slice(0, 5));
        setBannerSliderLinks(nextLinks.slice(0, 5));
        setItem((prev) => ({
          ...(prev || {}),
          banner_slider_urls: nextDesktopUrls.slice(0, 5),
          banner_slider_keys: nextDesktopKeys.slice(0, 5),
          banner_slider_mobile_urls: nextMobileUrls.slice(0, 5),
          banner_slider_mobile_keys: nextMobileKeys.slice(0, 5),
          banner_slider_links: nextLinks.slice(0, 5),
        }));
      } catch (err) {
        setError(err?.message || 'Unable to save banner slider image.');
      }
    }

    setShowLibrary(false);
    setUploadingSlot('');
  };

  const handleRemoveImage = async () => {
    if (!item?.id || removing) return;
    setRemoving(true);
    setError('');
    try {
      const resp = await fetch('/api/admin/categories/image/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: item.id }),
      });
      const payload = await resp.json().catch(() => null);
      if (!resp.ok) {
        throw new Error(payload?.error || 'Unable to remove image.');
      }
      setItem((prev) => (prev ? { ...prev, image_url: null, image_key: null, image_alt: null } : prev));
    } catch (err) {
      setError(err?.message || 'Unable to remove image.');
    } finally {
      setRemoving(false);
    }
  };

  const handleRemoveFeaturedStrip = async () => {
    if (!item?.id) return;
    setUploadingSlot('featured');
    setError('');
    try {
      const response = await fetch('/api/admin/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: item.id,
          featured_strip_image_url: null,
          featured_strip_image_key: null,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to remove featured image.');
      }
      setItem((prev) => ({
        ...(prev || {}),
        featured_strip_image_url: null,
        featured_strip_image_key: null,
      }));
    } catch (err) {
      setError(err?.message || 'Unable to remove featured image.');
    } finally {
      setUploadingSlot('');
    }
  };

  const handleSaveSliderLinks = async () => {
    if (!item?.id) return;
    setSavingSliderLinks(true);
    setError('');
    const nextLinks = (Array.isArray(bannerSliderLinks) ? bannerSliderLinks : [])
      .slice(0, 5)
      .map((value) => (typeof value === 'string' ? value.trim() : ''));
    try {
      const response = await fetch('/api/admin/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: item.id,
          banner_slider_links: nextLinks,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to save slider links.');
      }
      setBannerSliderLinks(nextLinks);
      setItem((prev) => ({
        ...(prev || {}),
        banner_slider_links: nextLinks,
      }));
    } catch (err) {
      setError(err?.message || 'Unable to save slider links.');
    } finally {
      setSavingSliderLinks(false);
    }
  };

  const handleRemoveSliderImage = async (indexToRemove, device = 'desktop') => {
    if (!item?.id) return;
    const isMobile = device === 'mobile';
    setUploadingSlot(`slider-remove-${device}-${indexToRemove}`);
    setError('');
    const nextDesktopUrls = [...(Array.isArray(bannerSliderDesktop) ? bannerSliderDesktop : [])];
    const nextMobileUrls = [...(Array.isArray(bannerSliderMobile) ? bannerSliderMobile : [])];
    const nextDesktopKeys = Array.isArray(item.banner_slider_keys) ? [...item.banner_slider_keys] : [];
    const nextMobileKeys = Array.isArray(item.banner_slider_mobile_keys)
      ? [...item.banner_slider_mobile_keys]
      : [];
    if (isMobile) {
      nextMobileUrls[indexToRemove] = '';
      nextMobileKeys[indexToRemove] = '';
    } else {
      nextDesktopUrls[indexToRemove] = '';
      nextDesktopKeys[indexToRemove] = '';
    }
    const nextLinks = Array.isArray(bannerSliderLinks) ? [...bannerSliderLinks] : [];
    try {
      const response = await fetch('/api/admin/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: item.id,
          banner_slider_urls: nextDesktopUrls.slice(0, 5),
          banner_slider_keys: nextDesktopKeys.slice(0, 5),
          banner_slider_mobile_urls: nextMobileUrls.slice(0, 5),
          banner_slider_mobile_keys: nextMobileKeys.slice(0, 5),
          banner_slider_links: nextLinks.slice(0, 5),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to remove slider image.');
      }
      setBannerSliderDesktop(nextDesktopUrls.slice(0, 5));
      setBannerSliderMobile(nextMobileUrls.slice(0, 5));
      setBannerSliderLinks(nextLinks.slice(0, 5));
      setItem((prev) => ({
        ...(prev || {}),
        banner_slider_urls: nextDesktopUrls.slice(0, 5),
        banner_slider_keys: nextDesktopKeys.slice(0, 5),
        banner_slider_mobile_urls: nextMobileUrls.slice(0, 5),
        banner_slider_mobile_keys: nextMobileKeys.slice(0, 5),
        banner_slider_links: nextLinks.slice(0, 5),
      }));
    } catch (err) {
      setError(err?.message || 'Unable to remove slider image.');
    } finally {
      setUploadingSlot('');
    }
  };

  const handleHotspotImageClick = (event) => {
    if (!activeLayout?.id) {
      setHotspotError('Add a slide first.');
      return;
    }
    if (!activeLayout?.image_url) {
      setHotspotError('Select an image first.');
      return;
    }
    if (activeLayout.hotspots.length >= 10) {
      setHotspotError('Maximum of 10 hotspots.');
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const rawX = ((event.clientX - rect.left) / rect.width) * 100;
    const rawY = ((event.clientY - rect.top) / rect.height) * 100;
    const x = Math.min(100, Math.max(0, rawX));
    const y = Math.min(100, Math.max(0, rawY));
    const nextId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setHotspotLayouts((prev) =>
      prev.map((layout) =>
        layout.id === activeLayout.id
          ? {
              ...layout,
              hotspots: [
                ...layout.hotspots,
                {
                  id: nextId,
                  x,
                  y,
                  product_id: '',
                  product: null,
                },
              ],
            }
          : layout,
      ),
    );
    setHotspotError('');
    setActiveHotspotId(nextId);
    setPendingHotspotId(nextId);
    setShowHotspotPicker(true);
  };

  const handleAddHotspotSlide = () => {
    const draft = createDraftLayout(hotspotLayouts.length);
    setHotspotLayouts((prev) => [...prev, draft]);
    setActiveLayoutId(draft.id);
    setHotspotError('');
  };

  const handleSelectHotspotSlide = (layoutId) => {
    setActiveLayoutId(layoutId);
    setActiveHotspotId('');
    setPendingHotspotId('');
    setHotspotError('');
  };

  const handleHotspotEdit = (hotspotId) => {
    setActiveHotspotId(hotspotId);
    setPendingHotspotId('');
    setShowHotspotPicker(true);
  };

  const handleHotspotRemove = (hotspotId) => {
    if (!activeLayout?.id) return;
    setHotspotLayouts((prev) =>
      prev.map((layout) =>
        layout.id === activeLayout.id
          ? { ...layout, hotspots: layout.hotspots.filter((hotspot) => hotspot.id !== hotspotId) }
          : layout,
      ),
    );
    if (activeHotspotId === hotspotId) setActiveHotspotId('');
    if (pendingHotspotId === hotspotId) setPendingHotspotId('');
  };

  const handleHotspotProductSelect = (product) => {
    if (!product || !activeHotspotId || !activeLayout?.id) {
      setShowHotspotPicker(false);
      return;
    }
    setHotspotLayouts((prev) =>
      prev.map((layout) =>
        layout.id === activeLayout.id
          ? {
              ...layout,
              hotspots: layout.hotspots.map((hotspot) =>
                hotspot.id === activeHotspotId
                  ? {
                      ...hotspot,
                      product_id: product.id,
                      product: {
                        id: product.id,
                        name: product.name,
                        slug: product.slug,
                        price: product.price,
                        discount_price: product.discount_price,
                        image_url: product.image_url,
                      },
                    }
                  : hotspot,
              ),
            }
          : layout,
      ),
    );
    setShowHotspotPicker(false);
    setPendingHotspotId('');
    setActiveHotspotId('');
  };

  const handleHotspotPickerClose = () => {
    setShowHotspotPicker(false);
    if (pendingHotspotId) {
      setHotspotLayouts((prev) =>
        prev.map((layout) =>
          layout.id === activeLayout?.id
            ? {
                ...layout,
                hotspots: layout.hotspots.filter(
                  (hotspot) => hotspot.id !== pendingHotspotId || hotspot.product_id,
                ),
              }
            : layout,
        ),
      );
    }
    setPendingHotspotId('');
    setActiveHotspotId('');
  };

  const handleSaveHotspotLayout = async () => {
    if (!item?.id) return;
    if (!activeLayout?.id) {
      setHotspotError('Add a slide first.');
      return;
    }
    if (!activeLayout?.image_url) {
      setHotspotError('Select an image first.');
      return;
    }
    setHotspotSaving(true);
    setHotspotError('');
    try {
      const sanitizedHotspots = activeLayout.hotspots
        .filter((hotspot) => hotspot.product_id)
        .slice(0, 10)
        .map((hotspot) => ({
          id: hotspot.id,
          x: Number(hotspot.x),
          y: Number(hotspot.y),
          product_id: hotspot.product_id,
        }));
      const isDraft = String(activeLayout.id).startsWith('temp-');
      const response = await fetch(`/api/admin/categories/${item.id}/hotspot`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          layout_id: isDraft ? undefined : activeLayout.id,
          sort_order: activeLayout.sort_order,
          image_url: activeLayout.image_url,
          image_key: activeLayout.image_key || null,
          image_alt: activeLayout.image_alt || form.name || item.name,
          hotspots: sanitizedHotspots,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to save hotspot layout.');
      }
      const saved = payload?.item || null;
      if (saved?.id) {
        setHotspotLayouts((prev) =>
          prev.map((layout) => (layout.id === activeLayout.id ? saved : layout)),
        );
        setActiveLayoutId(saved.id);
      }
    } catch (err) {
      setHotspotError(err?.message || 'Unable to save hotspot layout.');
    } finally {
      setHotspotSaving(false);
    }
  };

  const handleRemoveHotspotLayout = async () => {
    if (!item?.id) return;
    setHotspotSaving(true);
    setHotspotError('');
    try {
      const layoutId = activeLayout?.id;
      if (!layoutId) {
        setHotspotSaving(false);
        return;
      }
      if (String(layoutId).startsWith('temp-')) {
        const remaining = hotspotLayouts.filter((layout) => layout.id !== layoutId);
        setHotspotLayouts(remaining);
        setActiveLayoutId((prev) => {
          if (prev !== layoutId) return prev;
          return remaining[0]?.id || '';
        });
        setHotspotSaving(false);
        return;
      }
      const response = await fetch(
        `/api/admin/categories/${item.id}/hotspot?layout_id=${layoutId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to remove hotspot layout.');
      }
      const remaining = hotspotLayouts.filter((layout) => layout.id !== layoutId);
      setHotspotLayouts(remaining);
      setActiveLayoutId((prev) => {
        if (prev !== layoutId) return prev;
        return remaining[0]?.id || '';
      });
    } catch (err) {
      setHotspotError(err?.message || 'Unable to remove hotspot layout.');
    } finally {
      setHotspotSaving(false);
    }
  };

  const handleSaveLogoGrid = async () => {
    if (!item?.id) return;
    setLogoGridSaving(true);
    setLogoGridError('');
    try {
      const payloadItems = (Array.isArray(logoGrid.items) ? logoGrid.items : []).map((item) => ({
        image_url: item.image_url,
        image_key: item.image_key || null,
        image_alt: item.image_alt || null,
      }));
      const response = await fetch(`/api/admin/categories/${item.id}/logo-grid`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: logoGrid.title || null,
          title_bg_color: logoGrid.title_bg_color || null,
          title_text_color: logoGrid.title_text_color || null,
          items: payloadItems,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to save logo grid.');
      }
      setLogoGrid(payload?.item || emptyLogoGrid);
    } catch (err) {
      setLogoGridError(err?.message || 'Unable to save logo grid.');
    } finally {
      setLogoGridSaving(false);
    }
  };

  const handleRemoveLogoItem = (id) => {
    setLogoGrid((prev) => ({
      ...prev,
      items: (Array.isArray(prev.items) ? prev.items : []).filter((item) => item.id !== id),
    }));
  };

  const handleClearLogoGrid = async () => {
    if (!item?.id) return;
    setLogoGridSaving(true);
    setLogoGridError('');
    try {
      const response = await fetch(`/api/admin/categories/${item.id}/logo-grid`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to remove logo grid.');
      }
      setLogoGrid(emptyLogoGrid);
    } catch (err) {
      setLogoGridError(err?.message || 'Unable to remove logo grid.');
    } finally {
      setLogoGridSaving(false);
    }
  };

  const handleBrowseCardChange = (segment, id, field, value) => {
    setBrowseCards((prev) => ({
      ...prev,
      [segment]: (Array.isArray(prev[segment]) ? prev[segment] : []).map((card) =>
        card.id === id ? { ...card, [field]: value } : card,
      ),
    }));
  };

  const handleRemoveBrowseCard = (segment, id) => {
    setBrowseCards((prev) => ({
      ...prev,
      [segment]: (Array.isArray(prev[segment]) ? prev[segment] : []).filter((card) => card.id !== id),
    }));
  };

  const handleSaveBrowseCards = async () => {
    if (!item?.id) return;
    setBrowseCardsSaving(true);
    setBrowseCardsError('');
    try {
      const patchResponse = await fetch('/api/admin/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: item.id,
          browse_categories_title: form.browse_categories_title?.trim() || null,
        }),
      });
      const patchPayload = await patchResponse.json().catch(() => null);
      if (!patchResponse.ok) {
        throw new Error(patchPayload?.error || 'Unable to save browse section title.');
      }
      if (patchPayload?.item) {
        setItem(patchPayload.item);
      }

      const payloadItems = ['all', 'men', 'women'].flatMap((segment) =>
        (Array.isArray(browseCards[segment]) ? browseCards[segment] : [])
          .filter((card) => card.image_url && String(card.name || '').trim())
          .map((card) => ({
            segment,
            name: String(card.name || '').trim(),
            link: String(card.link || '').trim() || null,
            image_url: card.image_url,
            image_key: card.image_key || null,
            image_alt: String(card.image_alt || card.name || '').trim() || null,
          })),
      );

      const response = await fetch(`/api/admin/categories/${item.id}/browse-cards`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ items: payloadItems }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to save browse cards.');
      }

      const savedItems = Array.isArray(payload?.items) ? payload.items : [];
      const grouped = { all: [], men: [], women: [] };
      savedItems.forEach((entry) => {
        const segment = String(entry?.segment || '').toLowerCase();
        if (!grouped[segment]) return;
        grouped[segment].push({
          id: entry.id,
          name: entry.name || '',
          link: entry.link || '',
          image_url: entry.image_url || '',
          image_key: entry.image_key || null,
          image_alt: entry.image_alt || '',
        });
      });
      setBrowseCards(grouped);
    } catch (err) {
      setBrowseCardsError(err?.message || 'Unable to save browse cards.');
    } finally {
      setBrowseCardsSaving(false);
    }
  };

  const handleClearBrowseCards = async () => {
    if (!item?.id) return;
    setBrowseCardsSaving(true);
    setBrowseCardsError('');
    try {
      const response = await fetch(`/api/admin/categories/${item.id}/browse-cards`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to clear browse cards.');
      }
      setBrowseCards(emptyBrowseCards);
    } catch (err) {
      setBrowseCardsError(err?.message || 'Unable to clear browse cards.');
    } finally {
      setBrowseCardsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <div className="sticky top-0 self-start h-screen">
          <AdminSidebar />
        </div>

        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10 space-y-6">
                  <AdminDesktopHeader />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Category
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-900">
                {item?.name || 'Loading...'}
              </h1>
              <p className="text-sm text-slate-500">{item?.slug}</p>
            </div>
            <Link
              href="/backend/admin/categories"
              className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Back to categories
            </Link>
          </div>

          {isLoading && (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
              Loading category...
            </div>
          )}
          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </div>
          )}

          {item && !isLoading && (
            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex items-start gap-4">
                  <div className="relative h-24 w-24 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.image_alt || item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[11px] text-slate-400">
                        No image
                      </div>
                    )}
                    {(uploading || removing) && (
                      <div className="absolute inset-0 flex items-center justify-center gap-2 bg-slate-900/70 text-white text-[11px] font-semibold">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                        {uploading ? 'Uploading...' : 'Removing...'}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                        disabled={uploading || removing}
                      >
                        Upload image
                      </button>
                      {item.image_url && (
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                          disabled={uploading || removing}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(file);
                      }}
                    />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                      Name
                    </label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                      Slug
                    </label>
                    <input
                      value={form.slug}
                      onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                      placeholder="auto-generated if empty"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                    rows={3}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                    Visibility
                  </label>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, is_active: !prev.is_active }))}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
                      form.is_active
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-slate-50 text-slate-500'
                    }`}
                  >
                    {form.is_active ? 'Visible' : 'Hidden'}
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    {saving ? 'Saving...' : 'Save changes'}
                  </button>
                  {saveMsg && <span className="text-xs text-emerald-600">{saveMsg}</span>}
                </div>
             </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Layout order</p>
                    <p className="text-xs text-slate-500">
                      Drag sections to control the front-end order.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    {saving ? 'Saving...' : 'Save layout order'}
                  </button>
                </div>
                <div className="space-y-2">
                  {layoutOrder.map((key, index) => {
                    const meta = CATEGORY_LAYOUT_LABELS[key];
                    return (
                      <div
                        key={key}
                        onPointerDown={(event) => {
                          event.preventDefault();
                          setDraggingLayoutKey(key);
                          setLayoutDragOverKey(key);
                        }}
                        onPointerEnter={() => handleLayoutHover(key)}
                        className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm transition select-none ${
                          draggingLayoutKey === key ? 'cursor-grabbing' : 'cursor-grab'
                        } ${
                          layoutDragOverKey === key
                            ? 'border-slate-400 bg-slate-50'
                            : 'border-slate-200 bg-white'
                        } ${draggingLayoutKey === key ? 'opacity-70' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50"
                            title="Drag to reorder"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              className="h-4 w-4 text-slate-400"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <circle cx="10" cy="6" r="1" />
                              <circle cx="14" cy="6" r="1" />
                              <circle cx="10" cy="12" r="1" />
                              <circle cx="14" cy="12" r="1" />
                              <circle cx="10" cy="18" r="1" />
                              <circle cx="14" cy="18" r="1" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              {meta?.label || key}
                            </p>
                            <p className="text-xs text-slate-500">
                              {meta?.description || 'Section'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={() => moveLayoutBy(key, -1)}
                            disabled={index === 0}
                            className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 disabled:opacity-40"
                          >
                            Up
                          </button>
                          <button
                            type="button"
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={() => moveLayoutBy(key, 1)}
                            disabled={index === layoutOrder.length - 1}
                            className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 disabled:opacity-40"
                          >
                            Down
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {children.length ? 'Subcategories' : 'No subcategories'}
                    </p>
                    <p className="text-xs text-slate-500">
                      Direct children of this category.
                    </p>
                  </div>
                  {childrenLoading && (
                    <span className="text-xs text-slate-500">Loading...</span>
                  )}
                </div>
                {children.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    {children.map((child) => (
                      <Link
                        key={child.id}
                        href={`/backend/admin/categories/${child.id}`}
                        className="flex flex-col items-center gap-2 rounded-xl border border-slate-100 p-3 hover:border-slate-200 hover:shadow-sm transition"
                      >
                        <div className="h-20 w-20 overflow-hidden rounded-full border border-slate-200 bg-slate-50">
                          {child.image_url ? (
                            <img
                              src={child.image_url}
                              alt={child.image_alt || child.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[11px] text-slate-400">
                              Image
                            </div>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-slate-800 text-center">
                          {child.name}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Banner</p>
                    <p className="text-xs text-slate-500">Wide slider (max 5).</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                      Wide slider (16:9) — max 5 per device
                    </p>
                    <div className="inline-flex rounded-full border border-slate-200 p-1">
                      <button
                        type="button"
                        onClick={() => setActiveSliderDevice('desktop')}
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          activeSliderDevice === 'desktop'
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Desktop
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveSliderDevice('mobile')}
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          activeSliderDevice === 'mobile'
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Mobile
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      {Array.from({ length: 5 }).map((_, idx) => {
                        const isMobile = activeSliderDevice === 'mobile';
                        const sliderImages = isMobile ? bannerSliderMobile : bannerSliderDesktop;
                        const url = sliderImages[idx] || '';
                        const isUploading = uploadingSlot === `slider-${activeSliderDevice}-${idx}`;
                        const isRemoving = uploadingSlot === `slider-remove-${activeSliderDevice}-${idx}`;
                        return (
                          <div
                            key={idx}
                            className="group relative block overflow-hidden rounded-xl border border-slate-200 bg-slate-50 aspect-[16/9]"
                          >
                            <button
                              type="button"
                              className="h-full w-full"
                              onClick={() => {
                                setLibraryContext({
                                  type: 'slider',
                                  index: idx,
                                  device: activeSliderDevice,
                                });
                                setShowLibrary(true);
                              }}
                            >
                              {url ? (
                                <img
                                  src={url}
                                  alt={`Slider ${idx + 1}`}
                                  className="h-full w-full object-cover transition group-hover:opacity-90"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[11px] text-slate-400">
                                  Slot {idx + 1}
                                </div>
                              )}
                            </button>
                            {!!url && (
                              <button
                                type="button"
                                onClick={() => handleRemoveSliderImage(idx, activeSliderDevice)}
                                disabled={isRemoving}
                                className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                                aria-label={`Remove slider image ${idx + 1}`}
                                title="Remove image"
                              >
                                {isRemoving ? (
                                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
                                ) : (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="h-3.5 w-3.5"
                                    aria-hidden="true"
                                  >
                                    <path d="M18 6 6 18" />
                                    <path d="m6 6 12 12" />
                                  </svg>
                                )}
                              </button>
                            )}
                            {isUploading && (
                              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-white/70 text-xs text-slate-700">
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
                                Uploading...
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <div key={`slider-link-${idx}`}>
                          <label className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                            Link {idx + 1}
                          </label>
                          <input
                            value={bannerSliderLinks[idx] || ''}
                            onChange={(event) =>
                              setBannerSliderLinks((prev) => {
                                const next = Array.isArray(prev) ? [...prev] : [];
                                next[idx] = event.target.value;
                                return next;
                              })
                            }
                            placeholder="/products/new-arrivals"
                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleSaveSliderLinks}
                        disabled={savingSliderLinks}
                        className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        {savingSliderLinks ? 'Saving links...' : 'Save slider links'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Featured strip</p>
                    <p className="text-xs text-slate-500">
                      Image + products filtered by tag or category.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    {saving ? 'Saving...' : 'Save featured strip'}
                  </button>
                </div>
                <div className="grid gap-3 md:grid-cols-1">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                      Title
                    </label>
                    <input
                      value={form.featured_strip_title_main}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          featured_strip_title_main: e.target.value,
                        }))
                      }
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                      placeholder="Just For You"
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
                  <div className="space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                      Featured image
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setLibraryContext({ type: 'featured', index: 0 });
                        setShowLibrary(true);
                      }}
                      className="group relative block w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 aspect-[16/9]"
                    >
                      {item?.featured_strip_image_url ? (
                        <img
                          src={item.featured_strip_image_url}
                          alt={item.banner_title || item.name || 'Featured'}
                          className="h-full w-full object-cover transition group-hover:opacity-90"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                          Click to upload image
                        </div>
                      )}
                      {uploadingSlot === 'featured' && (
                        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-white/70 text-xs text-slate-700">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
                          Uploading...
                        </div>
                      )}
                    </button>
                    {item?.featured_strip_image_url && (
                      <button
                        type="button"
                        onClick={handleRemoveFeaturedStrip}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-500"
                      >
                        Remove image
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                        Filter by
                      </label>
                      <select
                        value={featureFilterType}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFeatureFilterType(value);
                          setForm((prev) => ({
                            ...prev,
                            featured_strip_tag_id: value === 'tag' ? prev.featured_strip_tag_id : '',
                            featured_strip_category_id:
                              value === 'category' ? prev.featured_strip_category_id : '',
                          }));
                        }}
                        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                      >
                        <option value="none">None</option>
                        <option value="category">Category</option>
                        <option value="tag">Tag</option>
                      </select>
                    </div>

                    {featureFilterType === 'category' && (
                      <div>
                        <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                          Category
                        </label>
                        <select
                          value={form.featured_strip_category_id}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              featured_strip_category_id: e.target.value,
                            }))
                          }
                          className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                        >
                          <option value="">Select category</option>
                          {categoryOptions.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {featureFilterType === 'tag' && (
                      <div>
                        <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                          Tag
                        </label>
                        <select
                          value={form.featured_strip_tag_id}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              featured_strip_tag_id: e.target.value,
                            }))
                          }
                          className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                          disabled={tagsLoading}
                        >
                          <option value="">
                            {tagsLoading ? 'Loading tags...' : 'Select tag'}
                          </option>
                          {tags.map((tag) => (
                            <option key={tag.id} value={tag.id}>
                              {tag.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Hotspot products</p>
                    <p className="text-xs text-slate-500">
                      Click the image to add a dot (max 10), then assign a product.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddHotspotSlide}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Add slide
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!activeLayout?.id) {
                          setHotspotError('Add a slide first.');
                          return;
                        }
                        setLibraryContext({ type: 'hotspot', index: 0 });
                        setShowLibrary(true);
                      }}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      disabled={!activeLayout?.id}
                    >
                      {activeLayout?.image_url ? 'Change image' : 'Select image'}
                    </button>
                    {activeLayout?.id && (
                      <button
                        type="button"
                        onClick={handleRemoveHotspotLayout}
                        disabled={hotspotSaving}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                      >
                        Remove slide
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-1">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                      Title
                    </label>
                    <input
                      value={form.hotspot_title_main}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, hotspot_title_main: e.target.value }))
                      }
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                      placeholder="Just For You"
                    />
                  </div>
                </div>

                {hotspotLoading ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                    Loading hotspot layout...
                  </div>
                ) : (
                  <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
                    <div className="space-y-3">
                      {hotspotLayouts.length > 0 ? (
                        <div className="featured-scroll flex gap-3 overflow-x-auto pb-2 pr-1">
                          {hotspotLayouts.map((layout, index) => (
                            <button
                              key={layout.id}
                              type="button"
                              onClick={() => handleSelectHotspotSlide(layout.id)}
                              className="flex flex-col items-start gap-2 text-left"
                            >
                              <div
                                className={`h-16 w-24 overflow-hidden rounded-xl border ${
                                  layout.id === activeLayout?.id
                                    ? 'border-slate-900'
                                    : 'border-slate-200'
                                } bg-slate-50`}
                              >
                                {layout.image_url ? (
                                  <img
                                    src={layout.image_url}
                                    alt={`Slide ${index + 1}`}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
                                    No image
                                  </div>
                                )}
                              </div>
                              <span className="text-[11px] font-semibold text-slate-700">
                                Slide {index + 1}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-4 text-xs text-slate-500">
                          No slides yet. Add a slide to get started.
                        </div>
                      )}
                      <div
                        ref={hotspotImageRef}
                        onClick={(event) => {
                          if (!activeLayout?.image_url) {
                            setLibraryContext({ type: 'hotspot', index: 0 });
                            setShowLibrary(true);
                            return;
                          }
                          handleHotspotImageClick(event);
                        }}
                        className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 aspect-[16/9] ${
                          activeLayout?.image_url ? 'cursor-crosshair' : 'cursor-pointer'
                        }`}
                      >
                        {activeLayout?.image_url ? (
                          <img
                            src={activeLayout.image_url}
                            alt={activeLayout.image_alt || item?.name || 'Hotspot'}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                            Select an image to start
                          </div>
                        )}
                        {activeLayout?.image_url &&
                          activeLayout.hotspots.map((hotspot, index) => (
                            <button
                              key={hotspot.id}
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleHotspotEdit(hotspot.id);
                              }}
                              className={`absolute flex h-7 w-7 items-center justify-center rounded-full border shadow-md transition hover:scale-105 ${
                                hotspot.product_id
                                  ? 'border-white bg-white/90 text-slate-800'
                                  : 'border-amber-400 bg-amber-100 text-amber-700'
                              }`}
                              style={{
                                left: `${hotspot.x}%`,
                                top: `${hotspot.y}%`,
                                transform: 'translate(-50%, -50%)',
                              }}
                              aria-label={`Hotspot ${index + 1}`}
                            >
                              <span className="text-[10px] font-semibold">{index + 1}</span>
                            </button>
                          ))}
                      </div>
                      <p className="text-xs text-slate-500">
                        Tip: click a dot to edit, or click the image to add another.
                      </p>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                          Hotspots ({activeLayout?.hotspots?.length || 0}/10)
                        </p>
                        <button
                          type="button"
                          onClick={handleSaveHotspotLayout}
                          disabled={hotspotSaving || !activeLayout?.image_url}
                          className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                        >
                          {hotspotSaving ? 'Saving...' : 'Save layout'}
                        </button>
                      </div>
                      {hotspotError && (
                        <p className="text-xs text-rose-600">{hotspotError}</p>
                      )}
                      {!activeLayout || activeLayout.hotspots.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-xs text-slate-500">
                          No hotspots yet. Click the image to add one.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {activeLayout.hotspots.map((hotspot) => (
                            <div
                              key={hotspot.id}
                              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 px-3 py-2"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-800 line-clamp-1">
                                  {hotspot.product?.name || 'Select a product'}
                                </p>
                                <p className="text-[11px] text-slate-500">
                                  {Number(hotspot.x).toFixed(1)}%, {Number(hotspot.y).toFixed(1)}%
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleHotspotEdit(hotspot.id)}
                                  className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-800"
                                >
                                  {hotspot.product_id ? 'Change' : 'Assign'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleHotspotRemove(hotspot.id)}
                                  className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div
                id="home-product-catalog"
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Home product catalog</p>
                    <p className="text-xs text-slate-500">
                      Configure title, description, filter, and number of products for the Home catalog.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    {saving ? 'Saving...' : 'Save product catalog'}
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                      Title
                    </label>
                    <input
                      value={form.home_catalog_title}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, home_catalog_title: e.target.value }))
                      }
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                      placeholder="Fashion Collection"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                      Product count
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={form.home_catalog_limit}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          home_catalog_limit: Number(e.target.value) || 12,
                        }))
                      }
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                    Description
                  </label>
                  <textarea
                    value={form.home_catalog_description}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, home_catalog_description: e.target.value }))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                    rows={3}
                    placeholder="Discover our latest trends and bestsellers"
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                      Filter mode
                    </label>
                    <select
                      value={form.home_catalog_filter_mode}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          home_catalog_filter_mode: e.target.value,
                          home_catalog_category_id:
                            e.target.value === 'category' ? prev.home_catalog_category_id : '',
                          home_catalog_tag_id:
                            e.target.value === 'tag' ? prev.home_catalog_tag_id : '',
                        }))
                      }
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                    >
                      <option value="none">None (show no products)</option>
                      <option value="category">Category</option>
                      <option value="tag">Tag</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                      Category
                    </label>
                    <select
                      value={form.home_catalog_category_id}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, home_catalog_category_id: e.target.value }))
                      }
                      disabled={form.home_catalog_filter_mode !== 'category'}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 disabled:bg-slate-50"
                    >
                      <option value="">
                        {childrenLoading ? 'Loading categories...' : 'Select category'}
                      </option>
                      {categoryOptions.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                      Tag
                    </label>
                    <select
                      value={form.home_catalog_tag_id}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, home_catalog_tag_id: e.target.value }))
                      }
                      disabled={form.home_catalog_filter_mode !== 'tag'}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 disabled:bg-slate-50"
                    >
                      <option value="">
                        {tagsLoading ? 'Loading tags...' : 'Select tag'}
                      </option>
                      {tags.map((tag) => (
                        <option key={tag.id} value={tag.id}>
                          {tag.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div
                id="browse-categories-cards"
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Browse categories cards</p>
                    <p className="text-xs text-slate-500">
                      Manage Home Browse cards with image, name, and link for All, Men, Women.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setLibraryContext({ type: `browse-${activeBrowseSegment}`, index: 0 });
                        setShowLibrary(true);
                      }}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Add images
                    </button>
                    {(browseCards.all.length || browseCards.men.length || browseCards.women.length) ? (
                      <button
                        type="button"
                        onClick={handleClearBrowseCards}
                        disabled={browseCardsSaving}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                      >
                        Clear cards
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {['all', 'men', 'women'].map((segment) => (
                    <button
                      key={segment}
                      type="button"
                      onClick={() => setActiveBrowseSegment(segment)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        activeBrowseSegment === segment
                          ? 'bg-slate-900 text-white'
                          : 'border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {segment.toUpperCase()}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                    Section title
                  </label>
                  <input
                    value={form.browse_categories_title || ''}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, browse_categories_title: e.target.value }))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                    placeholder="Browse by categories"
                  />
                </div>

                {browseCardsLoading ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                    Loading browse cards...
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(browseCards[activeBrowseSegment] || []).length ? (
                      (browseCards[activeBrowseSegment] || []).map((card) => (
                        <div
                          key={card.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                        >
                          <div className="flex flex-col gap-3 md:flex-row">
                            <div className="h-20 w-20 overflow-hidden rounded-xl border border-slate-200 bg-white">
                              {card.image_url ? (
                                <img
                                  src={card.image_url}
                                  alt={card.image_alt || card.name || 'Browse card'}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
                                  No image
                                </div>
                              )}
                            </div>
                            <div className="flex-1 space-y-2">
                              <input
                                value={card.name || ''}
                                onChange={(e) =>
                                  handleBrowseCardChange(activeBrowseSegment, card.id, 'name', e.target.value)
                                }
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                                placeholder="Card name"
                              />
                              <input
                                value={card.link || ''}
                                onChange={(e) =>
                                  handleBrowseCardChange(activeBrowseSegment, card.id, 'link', e.target.value)
                                }
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                                placeholder="/products/men or https://..."
                              />
                            </div>
                            <div>
                              <button
                                type="button"
                                onClick={() => handleRemoveBrowseCard(activeBrowseSegment, card.id)}
                                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-xs text-slate-500">
                        No cards in this segment yet. Click “Add images”.
                      </div>
                    )}
                    {browseCardsError ? (
                      <p className="text-xs text-rose-600">{browseCardsError}</p>
                    ) : null}
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleSaveBrowseCards}
                        disabled={browseCardsSaving}
                        className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        {browseCardsSaving ? 'Saving...' : 'Save browse cards'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Logo grid</p>
                    <p className="text-xs text-slate-500">
                      Upload multiple logos and display them in a grid.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setLibraryContext({ type: 'logo-grid', index: 0 });
                        setShowLibrary(true);
                      }}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Add logos
                    </button>
                    {logoGrid.items?.length ? (
                      <button
                        type="button"
                        onClick={handleClearLogoGrid}
                        disabled={logoGridSaving}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                      >
                        Clear grid
                      </button>
                    ) : null}
                  </div>
                </div>

                {logoGridLoading ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                    Loading logo grid...
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                        Title (optional)
                      </label>
                      <input
                        value={logoGrid.title || ''}
                        onChange={(e) =>
                          setLogoGrid((prev) => ({ ...prev, title: e.target.value }))
                        }
                        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                        placeholder="e.g. Trusted by"
                      />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                          Title background color
                        </label>
                        <ColorPicker
                          value={logoGrid.title_bg_color || '#fed7aa'}
                          onChange={(value) =>
                            setLogoGrid((prev) => ({ ...prev, title_bg_color: value }))
                          }
                          inputClassName="mt-2 h-12 w-full rounded-2xl border border-slate-200 p-1"
                          textInputClassName="mt-3 w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs text-slate-700"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                          Title text color
                        </label>
                        <ColorPicker
                          value={logoGrid.title_text_color || '#111827'}
                          onChange={(value) =>
                            setLogoGrid((prev) => ({ ...prev, title_text_color: value }))
                          }
                          inputClassName="mt-2 h-12 w-full rounded-2xl border border-slate-200 p-1"
                          textInputClassName="mt-3 w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs text-slate-700"
                        />
                      </div>
                    </div>
                    {logoGridError && (
                      <p className="text-xs text-rose-600">{logoGridError}</p>
                    )}
                    {logoGrid.items?.length ? (
                      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                        {logoGrid.items.map((logo) => (
                          <div
                            key={logo.id}
                            className="relative flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-3"
                          >
                            <img
                              src={logo.image_url}
                              alt={logo.image_alt || 'Logo'}
                              className="h-10 w-auto max-w-full object-contain"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveLogoItem(logo.id)}
                              className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold text-rose-600 shadow-sm"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-xs text-slate-500">
                        No logos yet. Click “Add logos” to upload.
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleSaveLogoGrid}
                        disabled={logoGridSaving}
                        className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        {logoGridSaving ? 'Saving...' : 'Save logo grid'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
      {showLibrary && (
        <ProductImageLibraryModal
          isOpen={showLibrary}
          onClose={() => setShowLibrary(false)}
          onApply={handleLibraryApply}
          selectedIds={
            libraryContext.type === 'logo-grid'
              ? (logoGrid.items || []).map((item) => item.id)
              : String(libraryContext.type || '').startsWith('browse-')
                ? (browseCards[String(libraryContext.type).replace('browse-', '')] || []).map(
                    (item) => item.id,
                  )
              : []
          }
          maxSelection={
            libraryContext.type === 'logo-grid'
              ? 36
              : String(libraryContext.type || '').startsWith('browse-')
                ? 24
                : 7
          }
          listEndpoint="/api/admin/component-media"
          uploadEndpoint="/api/admin/component-media/upload"
          deleteEndpointBase="/api/admin/component-media"
          title="Component Image Library"
        />
      )}
      {showHotspotPicker && (
        <ProductPickerModal
          isOpen={showHotspotPicker}
          onClose={handleHotspotPickerClose}
          onSelect={handleHotspotProductSelect}
        />
      )}
    </div>
  );
}

export default CategoryDetailPage;
