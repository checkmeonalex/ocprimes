import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LazyImage from '../components/LazyImage';
import LibrarySkeletonCard from '../components/LibrarySkeletonCard';
import BouncingDotsLoader from '../components/BouncingDotsLoader';
import { fetchMediaPage, uploadMediaFile } from './functions/media';
import LoadingButton from '../../../../components/LoadingButton';

const MEDIA_PAGE_SIZE = 20;

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
  const inputRef = useRef(null);
  const loadMoreRef = useRef(null);
  const isLoadingRef = useRef(false);

  const loadImages = useCallback(
    async (requestedPage, replace = false) => {
      if (isLoadingRef.current) return;
      isLoadingRef.current = true;
      setIsLoading(true);
      setError('');
      try {
        const payload = await fetchMediaPage({
          page: requestedPage,
          perPage: MEDIA_PAGE_SIZE,
          endpoint: listEndpoint,
        });
        const nextItems = Array.isArray(payload?.items) ? payload.items : [];
        setItems((prev) => (replace ? nextItems : [...prev, ...nextItems]));
        setPage(requestedPage);
        if (payload?.pages) {
          setHasMore(requestedPage < Number(payload.pages));
        } else {
          setHasMore(nextItems.length === MEDIA_PAGE_SIZE);
        }
      } catch (err) {
        setError(err?.message || 'Unable to load images.');
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    [listEndpoint],
  );

  useEffect(() => {
    if (!isOpen) return;
    setItems([]);
    setPage(1);
    setHasMore(true);
    const seeded = {};
    const nextOrder = [];
    selectedIds.forEach((id) => {
      if (id) seeded[String(id)] = true;
      if (id) nextOrder.push(String(id));
    });
    setSelectedMap(seeded);
    setSelectedOrder(nextOrder);
    loadImages(1, true);
    // run only when opening
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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
        setItems((prev) => prev.filter((item) => String(item?.id || '') !== id));
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
    [deleteEndpointBase, deletingId],
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
      const files = Array.from(incomingFiles || []).filter((file) =>
        String(file?.type || '').startsWith('image/'),
      );
      if (!files.length) {
        setUploadError('Please select valid image file(s).');
        return;
      }
      setIsUploading(true);
      setUploadError('');
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
        setItems((prev) => [...uploadedItems, ...prev]);
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
    [uploadEndpoint],
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

  return (
    <div className={`fixed inset-0 ${zIndexClass} flex items-center justify-center px-4 py-6`}>
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        aria-label="Close image library"
      />
      <div className="relative z-10 flex w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 px-5 py-4">
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
            <LoadingButton
              type="button"
              onClick={handleApply}
              className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={!Object.keys(selectedMap).length}
            >
              Apply
            </LoadingButton>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
            >
              Close
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5" style={{ maxHeight: '70vh' }}>
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
            Drag and drop image(s) here, or use Upload image(s)
          </div>
          {error && <p className="mb-4 text-xs text-rose-500">{error}</p>}
          {uploadError && <p className="mb-4 text-xs text-rose-500">{uploadError}</p>}
          {deleteError && <p className="mb-4 text-xs text-rose-500">{deleteError}</p>}

          {!items.length && isLoading && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {skeletons.map((item) => (
                <LibrarySkeletonCard key={item} compact />
              ))}
            </div>
          )}

          {items.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {items.map((media) => (
                <div
                  key={`${media.id}-${media.url}`}
                  className={`group relative overflow-hidden rounded-2xl border text-left shadow-sm transition ${
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
      </div>
    </div>
  );
}

export default ProductImageLibraryModal;
