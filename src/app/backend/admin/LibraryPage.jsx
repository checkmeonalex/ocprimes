import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BouncingDotsLoader from './components/BouncingDotsLoader';
import LazyImage from './components/LazyImage';
import LibrarySkeletonCard from './components/LibrarySkeletonCard';
import ImageEditorModal from './image/ImageEditorModal';
import LoadingButton from '../../../components/LoadingButton';
import { prepareWebpUpload } from './image/utils/webpUtils.mjs';
import AdminSidebar from '@/components/AdminSidebar';

const MEDIA_PAGE_SIZE = 20;
const STALE_DAYS = 180;

const FILTERS = [
  { label: 'All Images', value: 'all' },
  { label: 'Unattached', value: 'unattached' },
  { label: 'Stale', value: 'stale' },
];
const GRID_OPTIONS = [2, 4, 5, 7, 9];
const GRID_CLASS_MAP = {
  2: 'grid-cols-2',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  7: 'grid-cols-7',
  9: 'grid-cols-9',
};

const renderGridIcon = (cols) => {
  const rows = 2;
  const width = 18;
  const height = 12;
  const gap = cols >= 7 ? 1 : 1.5;
  const cellWidth = Math.max(1, Math.floor((width - gap * (cols - 1)) / cols));
  const cellHeight = Math.max(2, Math.floor((height - gap * (rows - 1)) / rows));
  const actualWidth = cols * cellWidth + gap * (cols - 1);
  const actualHeight = rows * cellHeight + gap * (rows - 1);
  const offsetX = (24 - actualWidth) / 2;
  const offsetY = (24 - actualHeight) / 2;
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      {Array.from({ length: rows * cols }).map((_, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        return (
          <rect
            key={`${cols}-${index}`}
            x={offsetX + col * (cellWidth + gap)}
            y={offsetY + row * (cellHeight + gap)}
            width={cellWidth}
            height={cellHeight}
            rx="0.6"
            fill="currentColor"
          />
        );
      })}
    </svg>
  );
};

function WooCommerceLibraryPage() {
  const [mediaItems, setMediaItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [columns, setColumns] = useState(4);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalSize, setTotalSize] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeMedia, setActiveMedia] = useState(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadPreview, setUploadPreview] = useState('');
  const [activeMenuId, setActiveMenuId] = useState('');
  const loadMoreRef = useRef(null);

  useEffect(() => {
    if (!activeMedia) return;
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        setActiveMedia(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeMedia]);

  useEffect(() => {
    if (!activeMenuId) return;
    const handleClick = () => setActiveMenuId('');
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [activeMenuId]);

  const handleUploadFile = useCallback(
    async (file) => {
      if (!file) return;
      setIsUploading(true);
      setUploadError('');
      try {
        const { webpFile, filename } = await prepareWebpUpload(file);
        const formData = new FormData();
        formData.append('file', webpFile);
        const response = await fetch('/api/admin/media/upload', {
          method: 'POST',
          body: formData,
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.message || payload?.error || 'Unable to upload image.');
        }
        const newItem = {
          id: payload?.id || payload?.key || `${Date.now()}`,
          url: payload?.url || '',
          title: filename,
          unattached: true,
        };
        setMediaItems((prev) => [newItem, ...prev]);
        setIsUploadOpen(false);
        setUploadPreview('');
      } catch (uploadErr) {
        setUploadError(uploadErr?.message || 'Unable to upload image.');
      } finally {
        setIsUploading(false);
      }
    },
    [],
  );

  const handleDelete = useCallback(async (item) => {
    if (!item?.id) return;
    const confirmed = window.confirm('Delete this image? This cannot be undone.');
    if (!confirmed) return;
    setError('');
    try {
      const response = await fetch(`/api/admin/media/${item.id}`, { method: 'DELETE' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to delete image.');
      }
      setMediaItems((prev) => prev.filter((entry) => entry.id !== item.id));
      setActiveMenuId('');
    } catch (err) {
      setError(err?.message || 'Unable to delete image.');
    }
  }, []);

  const loadMedia = useCallback(
    async (requestedPage, replace = false) => {
      setIsLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({
          per_page: MEDIA_PAGE_SIZE.toString(),
          page: requestedPage.toString(),
          filter,
          stale_days: STALE_DAYS.toString(),
        });
        const response = await fetch(`/api/admin/media?${params.toString()}`);
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error || 'Unable to load the library.');
        }
        const items = Array.isArray(payload?.items) ? payload.items : [];
        setMediaItems((prev) => (replace ? items : [...prev, ...items]));
        setPage(requestedPage);
        const nextPages = payload?.pages ? Number(payload.pages) : null;
        if (Number.isFinite(nextPages)) {
          setPages(nextPages);
          setHasMore(requestedPage < nextPages);
        } else {
          setPages(1);
          setHasMore(items.length === MEDIA_PAGE_SIZE);
        }
        if (payload?.total_count !== undefined && payload?.total_count !== null) {
          setTotalSize(`${payload.total_count} items`);
        } else {
          setTotalSize('--');
        }
      } catch (err) {
        setError(err?.message || 'Unable to load the library.');
      } finally {
        setIsLoading(false);
      }
    },
    [filter],
  );

  useEffect(() => {
    const handle = setTimeout(() => {
      setMediaItems([]);
      setPage(1);
      setPages(1);
      setHasMore(true);
      loadMedia(1, true);
    }, 200);
    return () => clearTimeout(handle);
  }, [filter, loadMedia]);

  const siteName = 'OCP Admin';
  const siteLogo = '';
  const canLoadMore = hasMore && !isLoading;
  const gridClass = GRID_CLASS_MAP[columns] || GRID_CLASS_MAP[4];
  const compactView = columns >= 7;
  const gridGapClass = compactView ? 'gap-2' : columns >= 5 ? 'gap-3' : 'gap-4';
  const skeletonCount = useMemo(() => {
    if (columns >= 7) return columns * 2;
    if (columns >= 5) return columns * 2;
    return 8;
  }, [columns]);
  const showInfiniteLoader = isLoading && mediaItems.length > 0;

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (!canLoadMore || isLoading) return;
        loadMedia(page + 1);
      },
      { rootMargin: '200px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [canLoadMore, isLoading, loadMedia, page]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <AdminSidebar />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10">
          <div className="mx-auto w-full max-w-6xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Library</p>
                <h1 className="mt-2 text-2xl font-semibold text-slate-900">Image Library</h1>
                <p className="mt-2 text-sm text-slate-500">
                  Review uploaded images, filter stale assets, and keep your library clean.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm">
                  Total size {totalSize || '--'}
                </div>
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(true)}
                  className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm"
                >
                  Upload image
                </button>
                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                  {siteLogo ? (
                    <img src={siteLogo} alt={siteName} className="h-7 w-7 rounded-full object-cover" />
                  ) : (
                    <span className="h-7 w-7 rounded-full bg-slate-200" />
                  )}
                  {siteName}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {FILTERS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setFilter(item.value)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                      filter === item.value
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white text-slate-500 border border-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
                <span className="text-[11px] text-slate-400">
                  Stale = older than {STALE_DAYS} days
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500">
                <span className="text-[11px] text-slate-400">View</span>
                {GRID_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setColumns(option)}
                    aria-label={`Grid view ${option} columns`}
                    className={`rounded-full p-2 text-[11px] font-semibold transition ${
                      columns === option
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {renderGridIcon(option)}
                  </button>
                ))}
              </div>
            </div>

            <div className={`mt-6 grid ${gridGapClass} ${gridClass}`}>
              {!mediaItems.length && isLoading &&
                Array.from({ length: skeletonCount }).map((_, index) => (
                  <LibrarySkeletonCard key={`skeleton-${index}`} compact={compactView} />
                ))}
              {mediaItems.map((item) => (
                <div
                  key={`${item.id}-${item.url || item.source_url || item.date || 'media'}`}
                  className={`group relative overflow-visible border border-slate-200 bg-white shadow-sm ${
                    compactView ? 'rounded-2xl' : 'rounded-3xl'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveMedia(item)}
                    className="relative block w-full text-left"
                  >
                    <div
                      className={`relative aspect-[4/3] w-full overflow-hidden bg-slate-100 ${
                        compactView ? 'rounded-2xl' : 'rounded-3xl'
                      }`}
                    >
                      <LazyImage src={item.url} alt={item.title || 'Media'} />
                      {item.unattached && (
                        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600">
                          Unattached
                        </span>
                      )}
                      {item.is_stale && (
                        <span className="absolute right-3 top-3 rounded-full bg-amber-100/90 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">
                          Stale
                        </span>
                      )}
                      <span className="absolute bottom-3 left-3 rounded-full bg-slate-900/80 px-2 py-1 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                        Edit image
                      </span>
                    </div>
                  </button>
                  <div className="absolute bottom-3 right-3">
                    <div className="relative">
                      <button
                        type="button"
                        aria-label="Open menu"
                        onClick={(event) => {
                          event.stopPropagation();
                          setActiveMenuId(String(item.id));
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-sm opacity-0 transition hover:bg-white group-hover:opacity-100"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                          <circle cx="6" cy="12" r="1.6" fill="currentColor" />
                          <circle cx="12" cy="12" r="1.6" fill="currentColor" />
                          <circle cx="18" cy="12" r="1.6" fill="currentColor" />
                        </svg>
                      </button>
                      {activeMenuId === String(item.id) && (
                        <div
                          className="absolute right-0 z-10 mt-2 w-40 overflow-hidden rounded-2xl border border-slate-200 bg-white text-xs shadow-lg"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId('');
                              if (item?.url) {
                                window.open(item.url, '_blank', 'noopener,noreferrer');
                              }
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-slate-600 hover:bg-slate-50"
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                              <path
                                d="M14 5h5v5m-9 9h9V10"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M5 19h7"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M5 19V7h7"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-rose-600 hover:bg-rose-50"
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                              <path
                                d="M5 7h14m-9 3v7m4-7v7M8 7l1-2h6l1 2m-1 0v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V7"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {!mediaItems.length && !isLoading && (
                <div className="col-span-full rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-400">
                  No images found for this filter.
                </div>
              )}
            </div>

            {error && <p className="mt-4 text-xs text-rose-500">{error}</p>}

            <div className="mt-6 flex items-center justify-center">
              {showInfiniteLoader && (
                <BouncingDotsLoader className="text-slate-400" dotClassName="bg-slate-400" />
              )}
              {canLoadMore && (
                <LoadingButton
                  type="button"
                  onClick={() => loadMedia(page + 1)}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-500"
                  isLoading={isLoading}
                >
                  Load next
                </LoadingButton>
              )}
            </div>
            <div ref={loadMoreRef} className="h-1 w-full" />
            <ImageEditorModal
              media={activeMedia}
              onClose={() => setActiveMedia(null)}
            />
          </div>
        </main>
      </div>

      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <button
            type="button"
            onClick={() => setIsUploadOpen(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            aria-label="Close upload"
          />
          <div className="relative z-10 w-full max-w-lg max-h-[calc(100vh-48px)] overflow-y-auto rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Upload</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">Add image to library</p>
                <p className="mt-1 text-xs text-slate-500">Upload a new image to your store library.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadOpen(false)}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500"
              >
                Close
              </button>
            </div>

            <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center text-xs text-slate-500">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    if (typeof reader.result === 'string') {
                      setUploadPreview(reader.result);
                    }
                  };
                  reader.readAsDataURL(file);
                  handleUploadFile(file);
                }}
              />
              <span className="text-sm font-semibold text-slate-700">Drop image or click to upload</span>
              <span className="mt-1 text-[11px] text-slate-400">JPG, PNG, WEBP up to 10MB</span>
            </label>

            {uploadPreview && (
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                <img src={uploadPreview} alt="Upload preview" className="h-48 w-full object-cover" />
              </div>
            )}

            {uploadError && <p className="mt-3 text-xs text-rose-500">{uploadError}</p>}

            <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400">
              <span>{isUploading ? 'Uploading...' : 'Ready when you are.'}</span>
              <span>{isUploading ? 'Please wait' : 'Auto-uploads on select'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WooCommerceLibraryPage;
