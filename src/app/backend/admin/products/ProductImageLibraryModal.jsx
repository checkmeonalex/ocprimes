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
}) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
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
    [],
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
  }, [isOpen, loadImages, selectedId, selectedIds]);

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

  const handleUpload = useCallback(
    async (file) => {
      if (!file) return;
      setIsUploading(true);
      setUploadError('');
      try {
        const uploaded = await uploadMediaFile({ file });
        setItems((prev) => [uploaded, ...prev]);
      } catch (uploadErr) {
        setUploadError(uploadErr?.message || 'Unable to upload image.');
      } finally {
        setIsUploading(false);
      }
    },
    [],
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
      } else if (Object.keys(next).length < 7) {
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-6">
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
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  handleUpload(file);
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
              Upload
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
          {error && <p className="mb-4 text-xs text-rose-500">{error}</p>}
          {uploadError && <p className="mb-4 text-xs text-rose-500">{uploadError}</p>}

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
