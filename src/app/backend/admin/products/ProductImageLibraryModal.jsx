import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import LazyImage from '../components/LazyImage';
import LibrarySkeletonCard from '../components/LibrarySkeletonCard';
import BouncingDotsLoader from '../components/BouncingDotsLoader';
import { fetchMediaPage, uploadMediaFile, uploadProductVideoFile } from './functions/media';
import LoadingButton from '../../../../components/LoadingButton';

const MEDIA_PAGE_SIZE = 20;
const MOBILE_MEDIA_PAGE_SIZE = 8;
const MAX_BATCH_UPLOADS = 8;
const LIBRARY_CACHE = new Map();
const EMPTY_SELECTION_IDS = [];
const EMPTY_SELECTION_IMAGES = [];
const IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif|bmp|svg|avif)$/i;
const VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v)$/i;
const MEDIA_FILTERS = ['all', 'images', 'videos'];

const toTimestamp = (value) => {
  const ms = new Date(value || 0).getTime();
  return Number.isFinite(ms) ? ms : 0;
};

const normalizeImageItem = (item, deleteEndpointBase) => ({
  ...item,
  media_type: 'image',
  delete_endpoint_base: deleteEndpointBase,
  created_at: item?.created_at || null,
});

const normalizeVideoItem = (item, videoDeleteEndpointBase) => ({
  ...item,
  media_type: 'video',
  delete_endpoint_base: videoDeleteEndpointBase,
  created_at: item?.created_at || null,
});

const normalizeSelectedImageItem = (item, deleteEndpointBase) => {
  const normalized = normalizeImageItem(item, deleteEndpointBase);
  const id = String(normalized?.id || '').trim();
  const url = String(normalized?.url || '').trim();
  if (!id && !url) return null;
  return {
    ...normalized,
    id,
    url,
    title: String(normalized?.title || 'Image').trim(),
  };
};

const itemValues = (item) => [
  String(item?.media_type || '').toLowerCase(),
  String(item?.mime_type || '').toLowerCase(),
  String(item?.content_type || '').toLowerCase(),
  String(item?.file_type || '').toLowerCase(),
  String(item?.r2_key || '').toLowerCase(),
  String(item?.key || '').toLowerCase(),
  String(item?.url || '').toLowerCase(),
  String(item?.title || '').toLowerCase(),
];

const isVideoMediaItem = (item) => {
  const values = itemValues(item);
  return values.some((value) => value === 'video' || value.startsWith('video/') || VIDEO_EXT_RE.test(value));
};

const isImageMediaItem = (item) => {
  if (isVideoMediaItem(item)) return false;
  const values = itemValues(item);
  return values.some((value) => value === 'image' || value.startsWith('image/') || IMAGE_EXT_RE.test(value));
};

const dedupeMediaItems = (items = []) => {
  const seen = new Set();
  const deduped = [];
  (Array.isArray(items) ? items : []).forEach((item) => {
    const type = String(item?.media_type || 'image').trim().toLowerCase();
    const id = String(item?.id || '').trim();
    const key = String(item?.r2_key || item?.key || '').trim();
    const url = String(item?.url || '').trim();
    const fingerprintSource = url || key || id;
    const fingerprint = `${type}:${String(fingerprintSource).trim().toLowerCase()}`;
    if (!id && !key && !url) return;
    if (seen.has(fingerprint)) return;
    seen.add(fingerprint);
    deduped.push(item);
  });
  return deduped;
};

const EMPTY_UPLOAD_PROGRESS = {
  current: 0,
  total: 0,
  activeFileName: '',
  phase: 'idle',
  filePercent: 0,
};

function ProductImageLibraryModal({
  isOpen,
  onClose,
  onApply,
  productId,
  selectedId,
  selectedIds = EMPTY_SELECTION_IDS,
  selectedImages = EMPTY_SELECTION_IMAGES,
  selectedVideoId = '',
  selectedVideoUrl = '',
  listEndpoint = '/api/admin/media',
  uploadEndpoint = '/api/admin/media/upload',
  deleteEndpointBase = '/api/admin/media',
  videoListEndpoint = '/api/admin/media/video',
  videoUploadEndpoint = '/api/admin/media/video/upload',
  videoDeleteEndpointBase = '/api/admin/media/video',
  title = 'Image Library',
  maxSelection = 8,
  enableVideoTab = false,
  allowUpload = true,
  allowVideoUpload = true,
  allowMultiVideoSelection = false,
  zIndexClass = 'z-[60]',
  zIndex = 999,
}) {
  const allowVideo = Boolean(enableVideoTab);
  const canUpload = Boolean(allowUpload);
  const canMultiSelectVideos = Boolean(allowMultiVideoSelection);
  const allowVideoFilesInUpload = allowVideo && allowVideoUpload;
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(EMPTY_UPLOAD_PROGRESS);
  const [uploadError, setUploadError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [selectedImageMap, setSelectedImageMap] = useState({});
  const [selectedImageOrder, setSelectedImageOrder] = useState([]);
  const [selectedVideoMap, setSelectedVideoMap] = useState({});
  const [selectedVideoOrder, setSelectedVideoOrder] = useState([]);
  const [previewPlayingId, setPreviewPlayingId] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [mediaFilter, setMediaFilter] = useState('all');
  const inputRef = useRef(null);
  const loadMoreRef = useRef(null);
  const isLoadingRef = useRef(false);
  const previewVideoRefs = useRef({});

  const perPage = isMobile ? MOBILE_MEDIA_PAGE_SIZE : MEDIA_PAGE_SIZE;
  const pinnedSelectedImages = useMemo(
    () =>
      (Array.isArray(selectedImages) ? selectedImages : [])
        .map((item) => normalizeSelectedImageItem(item, deleteEndpointBase))
        .filter(Boolean),
    [deleteEndpointBase, selectedImages],
  );
  const cacheKey = useMemo(
    () => `mixed::${allowVideo ? 'with-video' : 'image-only'}::${listEndpoint}::${videoListEndpoint}::${perPage}`,
    [allowVideo, listEndpoint, perPage, videoListEndpoint],
  );

  const selectedUnionMap = useMemo(
    () => ({ ...selectedImageMap, ...selectedVideoMap }),
    [selectedImageMap, selectedVideoMap],
  );
  const selectedCount =
    Object.keys(selectedImageMap).length + Object.keys(selectedVideoMap).length;
  const uploadPercent =
    uploadProgress.total > 0 && uploadProgress.phase === 'uploading'
      ? Math.min(100, Math.round((uploadProgress.current / uploadProgress.total) * 100))
      : 0;
  const uploadStep =
    uploadProgress.total > 0
      ? Math.max(1, Math.min(uploadProgress.total, Math.floor(uploadProgress.current) + 1))
      : 0;
  const mediaCounts = useMemo(() => {
    const allItems = Array.isArray(items) ? items : [];
    const imageCount = allItems.filter((item) => String(item?.media_type || 'image') !== 'video').length;
    const videoCount = allItems.filter((item) => String(item?.media_type || '') === 'video').length;
    return {
      all: allItems.length,
      images: imageCount,
      videos: videoCount,
    };
  }, [items]);
  const visibleItems = useMemo(() => {
    const allItems = Array.isArray(items) ? items : [];
    if (mediaFilter === 'images') {
      return allItems.filter((item) => String(item?.media_type || 'image') !== 'video');
    }
    if (mediaFilter === 'videos') {
      return allItems.filter((item) => String(item?.media_type || '') === 'video');
    }
    return allItems;
  }, [items, mediaFilter]);

  const writeCache = useCallback(
    (nextItems, nextPage, nextHasMore) => {
      LIBRARY_CACHE.set(cacheKey, {
        items: dedupeMediaItems(nextItems),
        page: Number(nextPage) || 1,
        hasMore: Boolean(nextHasMore),
      });
    },
    [cacheKey],
  );

  const loadItems = useCallback(
    async (requestedPage, replace = false) => {
      if (isLoadingRef.current) return;
      isLoadingRef.current = true;
      setIsLoading(true);
      setError('');
      try {
        const imagePromise = fetchMediaPage({
          page: requestedPage,
          perPage,
          endpoint: listEndpoint,
        });
        const videoPromise = allowVideo
          ? fetchMediaPage({
              page: requestedPage,
              perPage,
              endpoint: videoListEndpoint,
            })
          : Promise.resolve({ items: [], pages: requestedPage });

        const [imagePayload, videoPayload] = await Promise.all([imagePromise, videoPromise]);
        const imageItems = (Array.isArray(imagePayload?.items) ? imagePayload.items : [])
          .filter((item) => isImageMediaItem(item))
          .map((item) => normalizeImageItem(item, deleteEndpointBase));
        const videoItems = (Array.isArray(videoPayload?.items) ? videoPayload.items : [])
          .filter((item) => isVideoMediaItem(item))
          .map((item) => normalizeVideoItem(item, videoDeleteEndpointBase));

        const mergedPage = dedupeMediaItems([...imageItems, ...videoItems]).sort(
          (a, b) => toTimestamp(b?.created_at) - toTimestamp(a?.created_at),
        );

        const imageHasMore = requestedPage < Number(imagePayload?.pages || requestedPage);
        const videoHasMore = allowVideo
          ? requestedPage < Number(videoPayload?.pages || requestedPage)
          : false;
        const nextHasMore = imageHasMore || videoHasMore;

        setItems((prev) => {
          const merged = replace
            ? [...pinnedSelectedImages, ...mergedPage]
            : [...pinnedSelectedImages, ...prev, ...mergedPage];
          const deduped = dedupeMediaItems(merged);
          writeCache(deduped, requestedPage, nextHasMore);
          return deduped;
        });
        setPage(requestedPage);
        setHasMore(nextHasMore);
      } catch (err) {
        setError(err?.message || 'Unable to load media.');
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    [allowVideo, deleteEndpointBase, listEndpoint, perPage, pinnedSelectedImages, videoDeleteEndpointBase, videoListEndpoint, writeCache],
  );

  useEffect(() => {
    if (!isOpen) {
      setIsVisible(false);
      return;
    }
    setMediaFilter('all');
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 767px)');
    const sync = () => setIsMobile(mq.matches);
    sync();
    const onChange = () => sync();
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    }
    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const selectedImageItems = (Array.isArray(selectedImages) ? selectedImages : [])
      .map((item) => normalizeSelectedImageItem(item, deleteEndpointBase))
      .filter(Boolean);
    const baseSelectedIds = selectedImageItems.length
      ? selectedImageItems.map((item) => String(item.id || '').trim()).filter(Boolean)
      : selectedIds.map((id) => String(id || '').trim()).filter(Boolean);

    const seededImageMap = {};
    const seededImageOrder = [];
    baseSelectedIds.forEach((id) => {
      const key = String(id || '').trim();
      if (!key) return;
      if (seededImageOrder.length >= maxSelection) return;
      seededImageMap[key] = true;
      seededImageOrder.push(key);
    });
    if (selectedId) {
      const key = String(selectedId).trim();
      if (key) {
        if (!seededImageOrder.includes(key)) {
          if (seededImageOrder.length >= maxSelection) {
            const removed = seededImageOrder.pop();
            if (removed) delete seededImageMap[removed];
          }
          seededImageOrder.unshift(key);
        }
        seededImageMap[key] = true;
      }
    }
    setSelectedImageMap(seededImageMap);
    setSelectedImageOrder(seededImageOrder);

    const seededVideoMap = {};
    const seededVideoOrder = [];
    const videoKey = String(selectedVideoId || '').trim();
    if (videoKey) {
      seededVideoMap[videoKey] = true;
      seededVideoOrder.push(videoKey);
    }
    setSelectedVideoMap(seededVideoMap);
    setSelectedVideoOrder(seededVideoOrder);
  }, [deleteEndpointBase, isOpen, maxSelection, selectedId, selectedIds, selectedImages, selectedVideoId]);

  useEffect(() => {
    if (!isOpen) return;
    const cached = LIBRARY_CACHE.get(cacheKey);
    if (cached) {
      setItems(dedupeMediaItems([...pinnedSelectedImages, ...(Array.isArray(cached.items) ? cached.items : [])]));
      setPage(Number(cached.page) || 1);
      setHasMore(Boolean(cached.hasMore));
      return;
    }
    setItems([]);
    setPage(1);
    setHasMore(true);
    loadItems(1, true);
  }, [cacheKey, isOpen, loadItems, pinnedSelectedImages]);

  useEffect(() => {
    if (!isOpen) return;
    if (!pinnedSelectedImages.length) return;
    setItems((prev) => dedupeMediaItems([...pinnedSelectedImages, ...(Array.isArray(prev) ? prev : [])]));
  }, [isOpen, pinnedSelectedImages]);

  useEffect(() => {
    if (!isOpen || !allowVideo) return;
    const videoUrl = String(selectedVideoUrl || '').trim();
    if (!videoUrl || !items.length) return;
    const matched = items.find(
      (item) => String(item?.media_type || '') === 'video' && String(item?.url || '').trim() === videoUrl,
    );
    if (!matched?.id) return;
    const key = String(matched.id);
    setSelectedVideoMap((prev) => ({ ...prev, [key]: true }));
    setSelectedVideoOrder((prev) => (prev.includes(key) ? prev : [key]));
  }, [allowVideo, isOpen, items, selectedVideoUrl]);

  useEffect(() => {
    if (!isOpen) return;
    const node = loadMoreRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (!hasMore || isLoading) return;
        loadItems(page + 1);
      },
      { rootMargin: '200px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, isLoading, isOpen, loadItems, page]);

  const handleDeleteMedia = useCallback(
    async (mediaItem) => {
      const id = String(mediaItem?.id || '').trim();
      const endpointBase = String(mediaItem?.delete_endpoint_base || '').trim();
      if (!id || !endpointBase || deletingId) return;
      setDeleteError('');
      setDeletingId(id);
      try {
        const response = await fetch(`${endpointBase}/${id}`, { method: 'DELETE' });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error || 'Unable to delete media.');
        }
        setItems((prev) => {
          const next = prev.filter((item) => String(item?.id || '') !== id);
          const deduped = dedupeMediaItems(next);
          writeCache(deduped, page, hasMore);
          return deduped;
        });

        if (String(mediaItem?.media_type || '') === 'video') {
          setSelectedVideoMap((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
          setSelectedVideoOrder((prev) => prev.filter((entry) => entry !== id));
        } else {
          setSelectedImageMap((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
          setSelectedImageOrder((prev) => prev.filter((entry) => entry !== id));
        }
      } catch (err) {
        setDeleteError(err?.message || 'Unable to delete media.');
      } finally {
        setDeletingId('');
      }
    },
    [deletingId, hasMore, page, writeCache],
  );

  const handleUploadFiles = useCallback(
    async (incomingFiles) => {
      const selected = Array.from(incomingFiles || []);
      const capped = selected.slice(0, MAX_BATCH_UPLOADS);
      const files = capped.filter((file) => {
        const mime = String(file?.type || '').toLowerCase();
        const name = String(file?.name || '');
        if (allowVideoFilesInUpload && (mime.startsWith('video/') || VIDEO_EXT_RE.test(name))) return true;
        return mime.startsWith('image/') || IMAGE_EXT_RE.test(name);
      });

      if (!files.length) {
        setUploadError(
          allowVideoFilesInUpload
            ? 'Please select valid image or video files.'
            : 'Please select valid image files.',
        );
        return;
      }

      if (selected.length > MAX_BATCH_UPLOADS) {
        setUploadError(`Only ${MAX_BATCH_UPLOADS} files can be uploaded at once. First ${MAX_BATCH_UPLOADS} selected.`);
      }

      setIsUploading(true);
      setUploadProgress({
        current: 0,
        total: files.length,
        activeFileName: files[0]?.name || '',
        phase: 'uploading',
        filePercent: 0,
      });
      if (selected.length <= MAX_BATCH_UPLOADS) setUploadError('');

      const uploadedItems = [];
      const failed = [];

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const mime = String(file?.type || '').toLowerCase();
        const name = String(file?.name || '');
        const isVideo = allowVideoFilesInUpload && (mime.startsWith('video/') || VIDEO_EXT_RE.test(name));
        setUploadProgress({
          current: index,
          total: files.length,
          activeFileName: file?.name || '',
          phase: 'uploading',
          filePercent: 0,
        });
        try {
          const uploaded = isVideo
            ? await uploadProductVideoFile({
                file,
                productId,
                endpoint: videoUploadEndpoint,
                onProgress: (fraction) =>
                  setUploadProgress({
                    current: index + Math.max(0, Math.min(1, Number(fraction) || 0)),
                    total: files.length,
                    activeFileName: file?.name || '',
                    phase: 'uploading',
                    filePercent: Math.max(0, Math.min(1, Number(fraction) || 0)),
                  }),
                onStageChange: (phase) =>
                  setUploadProgress((prev) => ({
                    current: phase === 'processing' || phase === 'complete' ? index + 1 : index,
                    total: files.length,
                    activeFileName: file?.name || '',
                    phase: phase === 'processing' ? 'processing' : 'uploading',
                    filePercent: phase === 'processing' || phase === 'complete' ? 1 : prev.filePercent || 0,
                  })),
              })
            : await uploadMediaFile({
                file,
                productId,
                endpoint: uploadEndpoint,
                onProgress: (fraction) =>
                  setUploadProgress({
                    current: index + Math.max(0, Math.min(1, Number(fraction) || 0)),
                    total: files.length,
                    activeFileName: file?.name || '',
                    phase: 'uploading',
                    filePercent: Math.max(0, Math.min(1, Number(fraction) || 0)),
                  }),
                onStageChange: (phase) =>
                  setUploadProgress((prev) => ({
                    current: phase === 'processing' || phase === 'complete' ? index + 1 : index,
                    total: files.length,
                    activeFileName: file?.name || '',
                    phase: phase === 'processing' ? 'processing' : 'uploading',
                    filePercent: phase === 'processing' || phase === 'complete' ? 1 : prev.filePercent || 0,
                  })),
              });
          uploadedItems.push(
            isVideo
              ? normalizeVideoItem(uploaded, videoDeleteEndpointBase)
              : normalizeImageItem(uploaded, deleteEndpointBase),
          );
        } catch (uploadErr) {
          failed.push(file?.name || uploadErr?.message || 'Upload failed');
        }
        setUploadProgress({
          current: index + 1,
          total: files.length,
          activeFileName: file?.name || '',
          phase: 'uploading',
          filePercent: 1,
        });
      }

      if (uploadedItems.length) {
        const sortedUploads = uploadedItems.sort(
          (a, b) => toTimestamp(b?.created_at) - toTimestamp(a?.created_at),
        );
        setItems((prev) => {
          const next = [...sortedUploads, ...prev];
          const deduped = dedupeMediaItems(next);
          writeCache(deduped, page, hasMore);
          return deduped;
        });
      }

      if (failed.length) {
        const preview = failed.slice(0, 2).join(', ');
        const suffix = failed.length > 2 ? ` (+${failed.length - 2} more)` : '';
        setUploadError(`Uploaded ${uploadedItems.length}/${files.length}. Failed: ${preview}${suffix}`);
      }

      setIsUploading(false);
      setUploadProgress(EMPTY_UPLOAD_PROGRESS);
    },
    [allowVideoFilesInUpload, deleteEndpointBase, hasMore, page, productId, uploadEndpoint, videoDeleteEndpointBase, videoUploadEndpoint, writeCache],
  );

  const toggleSelection = (mediaItem) => {
    const id = String(mediaItem?.id || '').trim();
    const mediaType = String(mediaItem?.media_type || 'image');
    if (!id) return;

    if (mediaType === 'video') {
      setSelectedVideoMap((prev) => {
        const next = { ...prev };
        if (next[id]) {
          delete next[id];
          setUploadError('');
          setSelectedVideoOrder((order) => order.filter((entry) => entry !== id));
        } else if (canMultiSelectVideos) {
          const combinedCount =
            Object.keys(selectedImageMap).length + Object.keys(selectedVideoMap).length;
          if (combinedCount >= maxSelection) {
            setUploadError(`Maximum ${maxSelection} media items can be selected.`);
            return prev;
          }
          next[id] = true;
          setUploadError('');
          setSelectedVideoOrder((order) => [...order, id]);
        } else {
          Object.keys(next).forEach((key) => delete next[key]);
          next[id] = true;
          setUploadError('');
          setSelectedVideoOrder([id]);
        }
        return next;
      });
      return;
    }

    setSelectedImageMap((prev) => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
        setUploadError('');
        setSelectedImageOrder((order) => order.filter((entry) => entry !== id));
      } else if (Object.keys(next).length + Object.keys(selectedVideoMap).length < maxSelection) {
        next[id] = true;
        setUploadError('');
        setSelectedImageOrder((order) => [...order, id]);
      } else {
        setUploadError(`Maximum ${maxSelection} media items can be selected.`);
      }
      return next;
    });
  };

  const setPreviewVideoRef = useCallback((id, node) => {
    const key = String(id || '').trim();
    if (!key) return;
    if (node) {
      previewVideoRefs.current[key] = node;
      return;
    }
    delete previewVideoRefs.current[key];
  }, []);

  const handleTogglePreviewPlayback = useCallback((id) => {
    const key = String(id || '').trim();
    if (!key) return;
    const videoEl = previewVideoRefs.current[key];
    if (!videoEl) return;
    if (videoEl.paused) {
      videoEl.currentTime = 0;
      videoEl.play().then(() => setPreviewPlayingId(key)).catch(() => setPreviewPlayingId(''));
      return;
    }
    videoEl.pause();
    setPreviewPlayingId('');
  }, []);

  const handleRestartPreview = useCallback((id) => {
    const key = String(id || '').trim();
    if (!key) return;
    const videoEl = previewVideoRefs.current[key];
    if (!videoEl) return;
    videoEl.currentTime = 0;
    videoEl.play().then(() => setPreviewPlayingId(key)).catch(() => setPreviewPlayingId(''));
  }, []);

  const handleApply = () => {
    const selectedById = new Map(
      items.filter((item) => item?.id).map((item) => [String(item.id), item]),
    );

    const selectedImages = selectedImageOrder
      .map((id) => selectedById.get(String(id)))
      .filter((item) => item && String(item?.media_type || 'image') !== 'video')
      .slice(0, maxSelection);

    const selectedVideos = selectedVideoOrder
      .map((id) => selectedById.get(String(id)))
      .filter((item) => item && String(item?.media_type || '') === 'video');

    if (onApply) {
      onApply({
        gallery: selectedImages,
        videos: selectedVideos,
        mediaType: 'mixed',
      });
    }
    onClose();
  };

  const skeletons = useMemo(() => Array.from({ length: 8 }, (_, idx) => idx), []);
  const showInfiniteLoader = isLoading && items.length > 0;

  if (!isOpen) return null;

  const modalContent = (
    <div
      className={`fixed inset-0 ${zIndexClass} flex items-end justify-center px-0 py-0`}
      style={{ zIndex }}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        aria-label="Close media library"
      />
      <div
        className={`relative z-10 flex h-[100dvh] w-full max-w-none flex-col overflow-hidden rounded-none border-0 bg-white shadow-2xl transition-transform duration-200 ease-out ${
          isVisible ? 'translate-y-0' : 'translate-y-2'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 px-4 py-3 sm:px-5 sm:py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">{title}</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {canUpload ? 'Pick media or upload new files' : 'Pick existing media'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canUpload ? (
              <>
                <input
                  ref={inputRef}
                  type="file"
                  accept={allowVideoFilesInUpload ? 'image/*,video/mp4,video/webm,video/quicktime' : 'image/*'}
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    const files = event.target.files;
                    if (files?.length) {
                      handleUploadFiles(files);
                    }
                    if (inputRef.current) {
                      inputRef.current.value = '';
                    }
                  }}
                />
                <LoadingButton
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600"
                  isLoading={isUploading}
                >
                  Upload file(s)
                </LoadingButton>
              </>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 sm:rounded-full sm:px-4"
            >
              Close
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 sm:px-5 sm:py-5 sm:pb-24">
          {canUpload && !isMobile && (
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragOver(true);
              }}
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                if (event.currentTarget.contains(event.relatedTarget)) return;
                setIsDragOver(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragOver(false);
                handleUploadFiles(event.dataTransfer?.files || []);
              }}
              className={`mb-4 rounded-2xl border-2 border-dashed px-4 py-4 text-center text-xs transition ${
                isDragOver
                  ? 'border-blue-400 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-slate-50 text-slate-500'
              }`}
            >
              Drag and drop media files here, or use Upload file(s) (max {MAX_BATCH_UPLOADS})
            </div>
          )}
          {canUpload && isMobile && <p className="mb-3 text-xs text-slate-500">Use Upload file(s) to add files.</p>}
          {error && <p className="mb-4 text-xs text-rose-500">{error}</p>}
          {uploadError && <p className="mb-4 text-xs text-rose-500">{uploadError}</p>}
          {deleteError && <p className="mb-4 text-xs text-rose-500">{deleteError}</p>}
          {isUploading && uploadProgress.total > 0 && (
            <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
              <div className="flex items-center justify-between gap-3 text-xs font-semibold text-blue-800">
                {uploadProgress.phase === 'processing' ? (
                  <span>Processing {uploadStep} of {uploadProgress.total} on server...</span>
                ) : (
                  <>
                    <span>Uploading {uploadStep} of {uploadProgress.total}</span>
                    <span>{uploadPercent}%</span>
                  </>
                )}
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-blue-100">
                {uploadProgress.phase === 'processing' ? (
                  <div className="h-full w-2/5 rounded-full bg-blue-600 animate-pulse" />
                ) : (
                  <div
                    className="h-full rounded-full bg-blue-600 transition-[width] duration-200"
                    style={{ width: `${uploadPercent}%` }}
                  />
                )}
              </div>
              {uploadProgress.activeFileName ? (
                <p className="mt-2 truncate text-[11px] text-blue-700">
                  {uploadProgress.activeFileName}
                </p>
              ) : null}
            </div>
          )}

          {allowVideo && (
            <div className="mb-4 inline-flex flex-wrap rounded-full border border-slate-200 bg-slate-50 p-1">
              {MEDIA_FILTERS.map((filterKey) => {
                const active = mediaFilter === filterKey;
                const label =
                  filterKey === 'all' ? 'All' : filterKey === 'images' ? 'Images' : 'Videos';
                return (
                  <button
                    key={filterKey}
                    type="button"
                    onClick={() => setMediaFilter(filterKey)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-white'
                    }`}
                  >
                    {label} ({mediaCounts[filterKey] || 0})
                  </button>
                );
              })}
            </div>
          )}

          {!items.length && isLoading && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
              {skeletons.map((item) => (
                <LibrarySkeletonCard key={item} compact />
              ))}
            </div>
          )}

          {visibleItems.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
              {visibleItems.map((mediaItem) => {
                const id = String(mediaItem?.id || '');
                const mediaType = String(mediaItem?.media_type || 'image');
                const selected = Boolean(selectedUnionMap[id]);
                const isVideo = mediaType === 'video';
                const canDelete = mediaItem?.can_delete !== false;
                return (
                  <div
                    key={`${mediaType}-${id}-${mediaItem?.url || ''}`}
                    className={`group relative overflow-hidden rounded-xl border text-left shadow-sm transition sm:rounded-2xl ${
                      selected ? 'border-blue-500 ring-1 ring-blue-200' : 'border-slate-200'
                    }`}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleSelection(mediaItem)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          toggleSelection(mediaItem);
                        }
                      }}
                      className="relative block w-full cursor-pointer"
                    >
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                        {mediaItem?.url ? (
                          isVideo ? (
                            selected ? (
                              <>
                                <video
                                  ref={(node) => setPreviewVideoRef(id, node)}
                                  src={`${String(mediaItem.url || '').trim()}#t=0,10`}
                                  muted
                                  playsInline
                                  preload="metadata"
                                  className="h-full w-full object-cover"
                                  onTimeUpdate={(event) => {
                                    const videoEl = event.currentTarget;
                                    if (videoEl.currentTime >= 10) {
                                      videoEl.pause();
                                      videoEl.currentTime = 0;
                                      setPreviewPlayingId('');
                                    }
                                  }}
                                  onPause={() => {
                                    setPreviewPlayingId((prev) => (prev === id ? '' : prev));
                                  }}
                                  onPlay={() => {
                                    setPreviewPlayingId(id);
                                  }}
                                />
                                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/25 to-transparent px-2 pb-2 pt-8">
                                  <div className="pointer-events-auto flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        handleTogglePreviewPlayback(id);
                                      }}
                                      className="rounded-full border border-white/40 bg-black/50 px-3 py-1 text-[10px] font-semibold text-white"
                                    >
                                      {previewPlayingId === id ? 'Pause' : 'Play 10s'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        handleRestartPreview(id);
                                      }}
                                      className="rounded-full border border-white/30 bg-white/15 px-3 py-1 text-[10px] font-semibold text-white"
                                    >
                                      Restart
                                    </button>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <>
                                <video
                                  ref={(node) => setPreviewVideoRef(id, node)}
                                  src={`${String(mediaItem.url || '').trim()}#t=0,10`}
                                  muted
                                  playsInline
                                  preload="metadata"
                                  className="h-full w-full object-cover"
                                />
                                <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-14 w-14">
                                    <path
                                      fillRule="evenodd"
                                      clipRule="evenodd"
                                      d="M11.0748 7.50835C9.74622 6.72395 8.25 7.79065 8.25 9.21316V14.7868C8.25 16.2093 9.74622 17.276 11.0748 16.4916L15.795 13.7048C17.0683 12.953 17.0683 11.047 15.795 10.2952L11.0748 7.50835ZM9.75 9.21316C9.75 9.01468 9.84615 8.87585 9.95947 8.80498C10.0691 8.73641 10.1919 8.72898 10.3122 8.80003L15.0324 11.5869C15.165 11.6652 15.25 11.8148 15.25 12C15.25 12.1852 15.165 12.3348 15.0324 12.4131L10.3122 15.2C10.1919 15.271 10.0691 15.2636 9.95947 15.195C9.84615 15.1242 9.75 14.9853 9.75 14.7868V9.21316Z"
                                      fill="#ededed"
                                    />
                                    <path
                                      fillRule="evenodd"
                                      clipRule="evenodd"
                                      d="M12 1.25C6.06294 1.25 1.25 6.06294 1.25 12C1.25 17.9371 6.06294 22.75 12 22.75C17.9371 22.75 22.75 17.9371 22.75 12C22.75 6.06294 17.9371 1.25 12 1.25ZM2.75 12C2.75 6.89137 6.89137 2.75 12 2.75C17.1086 2.75 21.25 6.89137 21.25 12C21.25 17.1086 17.1086 21.25 12 21.25C6.89137 21.25 2.75 17.1086 2.75 12Z"
                                      fill="#ededed"
                                    />
                                  </svg>
                                </span>
                              </>
                            )
                          ) : (
                            <LazyImage src={mediaItem.url} alt={mediaItem.title || 'Image'} />
                          )
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-slate-400">
                            No media
                          </div>
                        )}
                      </div>
                      {selected && (
                        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold text-slate-600">
                          Selected
                        </span>
                      )}
                    </div>
                    <div className="border-t border-slate-200 bg-white px-3 py-2">
                      <p className="line-clamp-2 text-xs font-semibold text-slate-800">
                        {mediaItem?.title || 'Media'}
                      </p>
                      {isVideo && mediaItem?.product_name ? (
                        <p className="mt-1 text-[11px] text-slate-500">
                          Product: {mediaItem.product_name}
                        </p>
                      ) : null}
                      {isVideo && mediaItem?.seller_name ? (
                        <p className="mt-1 text-[11px] text-slate-500">
                          Seller: {mediaItem.seller_name}
                        </p>
                      ) : null}
                    </div>
                    {canDelete ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteMedia(mediaItem);
                        }}
                        disabled={deletingId === id}
                        className={`absolute right-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-rose-600 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 ${
                          isVideo ? 'bottom-14' : 'bottom-3'
                        }`}
                        aria-label="Delete media"
                        title="Delete media"
                      >
                        {deletingId === id ? (
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-rose-600 border-t-transparent" />
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                            <path d="M3 6h18" />
                            <path d="M8 6V4h8v2" />
                            <path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                          </svg>
                        )}
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}

          {!isLoading && items.length > 0 && visibleItems.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
              No {mediaFilter === 'videos' ? 'videos' : 'images'} in this view.
            </div>
          )}

          {showInfiniteLoader && (
            <div className="mt-6 flex justify-center">
              <BouncingDotsLoader className="text-slate-400" dotClassName="bg-slate-400" />
            </div>
          )}

          <div ref={loadMoreRef} className="h-10" />
        </div>

        <div className="fixed bottom-[max(0.9rem,env(safe-area-inset-bottom))] right-4 z-[61] flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm"
          >
            Cancel
          </button>
          <LoadingButton
            type="button"
            onClick={handleApply}
            className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={selectedCount === 0}
          >
            Done
          </LoadingButton>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
}

export default ProductImageLibraryModal;
