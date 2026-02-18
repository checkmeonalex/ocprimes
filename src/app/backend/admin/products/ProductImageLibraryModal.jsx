import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import LazyImage from '../components/LazyImage';
import LibrarySkeletonCard from '../components/LibrarySkeletonCard';
import BouncingDotsLoader from '../components/BouncingDotsLoader';
import { fetchMediaPage, uploadMediaFile } from './functions/media';
import LoadingButton from '../../../../components/LoadingButton';

const MEDIA_PAGE_SIZE = 20;
const MOBILE_MEDIA_PAGE_SIZE = 8;
const MAX_BATCH_UPLOADS = 8;
const IMAGE_LIBRARY_CACHE = new Map();
const IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif|bmp|svg|avif)$/i;

function ProductImageLibraryModal({
  isOpen,
  onClose,
  onApply,
  selectedId,
  selectedIds = [],
  listEndpoint = '/api/admin/media',
  uploadEndpoint = '/api/admin/media/upload',
  deleteEndpointBase = '/api/admin/media',
  title = 'Image Library',
  maxSelection = 7,
  zIndexClass = 'z-[60]',
  zIndex = 999,
}) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [selectedMap, setSelectedMap] = useState({});
  const [selectedOrder, setSelectedOrder] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const inputRef = useRef(null);
  const loadMoreRef = useRef(null);
  const isLoadingRef = useRef(false);
  const perPage = isMobile ? MOBILE_MEDIA_PAGE_SIZE : MEDIA_PAGE_SIZE;
  const cacheKey = useMemo(() => `${listEndpoint}::${perPage}`, [listEndpoint, perPage]);

  const writeCache = useCallback(
    (nextItems, nextPage, nextHasMore) => {
      IMAGE_LIBRARY_CACHE.set(cacheKey, {
        items: Array.isArray(nextItems) ? nextItems : [],
        page: Number(nextPage) || 1,
        hasMore: Boolean(nextHasMore),
      });
    },
    [cacheKey],
  );

  const loadImages = useCallback(
    async (requestedPage, replace = false) => {
      if (isLoadingRef.current) return;
      isLoadingRef.current = true;
      setIsLoading(true);
      setError('');
      try {
        const payload = await fetchMediaPage({
          page: requestedPage,
          perPage,
          endpoint: listEndpoint,
        });
        const nextItems = Array.isArray(payload?.items) ? payload.items : [];
        const nextHasMore = payload?.pages
          ? requestedPage < Number(payload.pages)
          : nextItems.length === perPage;
        setItems((prev) => {
          const merged = replace ? nextItems : [...prev, ...nextItems];
          writeCache(merged, requestedPage, nextHasMore);
          return merged;
        });
        setPage(requestedPage);
        setHasMore(nextHasMore);
      } catch (err) {
        setError(err?.message || 'Unable to load images.');
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    [listEndpoint, perPage, writeCache],
  );

  useEffect(() => {
    if (!isOpen) {
      setIsVisible(false);
      return;
    }
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
    const seeded = {};
    const nextOrder = [];
    selectedIds.forEach((id) => {
      if (id) seeded[String(id)] = true;
      if (id) nextOrder.push(String(id));
    });
    setSelectedMap(seeded);
    setSelectedOrder(nextOrder);
    const cached = IMAGE_LIBRARY_CACHE.get(cacheKey);
    if (cached) {
      setItems(Array.isArray(cached.items) ? cached.items : []);
      setPage(Number(cached.page) || 1);
      setHasMore(Boolean(cached.hasMore));
      return;
    }
    setItems([]);
    setPage(1);
    setHasMore(true);
    loadImages(1, true);
  }, [cacheKey, isOpen, loadImages, selectedIds]);

  const handleDeleteImage = useCallback(
    async (media) => {
      const id = media?.id ? String(media.id) : '';
      if (!id || deletingId) return;
      setDeleteError('');
      setDeletingId(id);
      try {
        const response = await fetch(`${deleteEndpointBase}/${id}`, { method: 'DELETE' });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error || 'Unable to delete image.');
        }
        setItems((prev) => {
          const next = prev.filter((item) => String(item?.id || '') !== id);
          writeCache(next, page, hasMore);
          return next;
        });
        setSelectedMap((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        setSelectedOrder((prev) => prev.filter((entry) => entry !== id));
      } catch (err) {
        setDeleteError(err?.message || 'Unable to delete image.');
      } finally {
        setDeletingId('');
      }
    },
    [deleteEndpointBase, deletingId, hasMore, page, writeCache],
  );

  useEffect(() => {
    if (!isOpen) return;
    const node = loadMoreRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (!hasMore || isLoading) return;
        loadImages(page + 1);
      },
      { rootMargin: '200px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, isLoading, loadImages, page, isOpen]);

  const handleUploadFiles = useCallback(
    async (incomingFiles) => {
      const selected = Array.from(incomingFiles || []);
      const capped = selected.slice(0, MAX_BATCH_UPLOADS);
      const files = capped.filter((file) => {
        const mime = String(file?.type || '').toLowerCase();
        const name = String(file?.name || '');
        return mime.startsWith('image/') || IMAGE_EXT_RE.test(name);
      });
      if (!files.length) {
        setUploadError('Please select valid image file(s).');
        return;
      }
      if (selected.length > MAX_BATCH_UPLOADS) {
        setUploadError(`Only ${MAX_BATCH_UPLOADS} images can be uploaded at once. First ${MAX_BATCH_UPLOADS} selected.`);
      }
      setIsUploading(true);
      if (selected.length <= MAX_BATCH_UPLOADS) setUploadError('');
      const uploadedItems = [];
      const failed = [];
      for (const file of files) {
        try {
          const uploaded = await uploadMediaFile({ file, endpoint: uploadEndpoint });
          uploadedItems.push(uploaded);
        } catch (uploadErr) {
          failed.push(file?.name || uploadErr?.message || 'Upload failed');
        }
      }
      if (uploadedItems.length) {
        setItems((prev) => {
          const next = [...uploadedItems, ...prev];
          writeCache(next, page, hasMore);
          return next;
        });
      }
      if (failed.length) {
        const preview = failed.slice(0, 2).join(', ');
        const suffix = failed.length > 2 ? ` (+${failed.length - 2} more)` : '';
        setUploadError(
          `Uploaded ${uploadedItems.length}/${files.length}. Failed: ${preview}${suffix}`,
        );
      }
      setIsUploading(false);
    },
    [hasMore, page, uploadEndpoint, writeCache],
  );

  const skeletons = useMemo(() => Array.from({ length: 8 }, (_, idx) => idx), []);
  const showInfiniteLoader = isLoading && items.length > 0;

  const toggleSelection = (media) => {
    const id = media?.id ? String(media.id) : '';
    if (!id) return;
    setSelectedMap((prev) => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
        setSelectedOrder((order) => order.filter((entry) => entry !== id));
      } else if (Object.keys(next).length < maxSelection) {
        next[id] = true;
        setSelectedOrder((order) => [...order, id]);
      }
      return next;
    });
  };

  const handleApply = () => {
    const selectedById = new Map(
      items.filter((item) => item?.id).map((item) => [String(item.id), item]),
    );
    const selected = selectedOrder
      .map((id) => selectedById.get(String(id)))
      .filter(Boolean);
    if (onApply) {
      onApply({ gallery: selected });
    }
    onClose();
  };

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
        aria-label="Close image library"
      />
      <div
        className={`relative z-10 flex h-[100dvh] w-full max-w-none flex-col overflow-hidden rounded-none border-0 bg-white shadow-2xl transition-transform duration-200 ease-out ${
          isVisible ? 'translate-y-0' : 'translate-y-2'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 px-4 py-3 sm:px-5 sm:py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Image Library
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              Pick a thumbnail or upload a new image
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
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
              Upload image(s)
            </LoadingButton>
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
          {!isMobile && (
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
              Drag and drop image(s) here, or use Upload image(s) (max {MAX_BATCH_UPLOADS})
            </div>
          )}
          {isMobile && (
            <p className="mb-3 text-xs text-slate-500">Use Upload image(s) to add files.</p>
          )}
          {error && <p className="mb-4 text-xs text-rose-500">{error}</p>}
          {uploadError && <p className="mb-4 text-xs text-rose-500">{uploadError}</p>}
          {deleteError && <p className="mb-4 text-xs text-rose-500">{deleteError}</p>}

          {!items.length && isLoading && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
              {skeletons.map((item) => (
                <LibrarySkeletonCard key={item} compact />
              ))}
            </div>
          )}

          {items.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
              {items.map((media) => (
                <div
                  key={`${media.id}-${media.url}`}
                  className={`group relative overflow-hidden rounded-xl border text-left shadow-sm transition sm:rounded-2xl ${
                    selectedMap[String(media.id)]
                      ? 'border-blue-500 ring-1 ring-blue-200'
                      : 'border-slate-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleSelection(media)}
                    className="relative block w-full"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                      {media.url ? (
                        <LazyImage src={media.url} alt={media.title || 'Image'} />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-slate-400">
                          No image
                        </div>
                      )}
                    </div>
                    {selectedMap[String(media.id)] && (
                      <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold text-slate-600">
                        Selected
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDeleteImage(media);
                    }}
                    disabled={deletingId === String(media.id)}
                    className="absolute bottom-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-rose-600 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label="Delete image"
                    title="Delete image"
                  >
                    {deletingId === String(media.id) ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-rose-600 border-t-transparent" />
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="h-4 w-4"
                      >
                        <path d="M3 6h18" />
                        <path d="M8 6V4h8v2" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                      </svg>
                    )}
                  </button>
                </div>
              ))}
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
            disabled={!Object.keys(selectedMap).length}
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
