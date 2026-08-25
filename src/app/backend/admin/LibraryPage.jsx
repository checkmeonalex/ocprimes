import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BouncingDotsLoader from './components/BouncingDotsLoader';
import LazyImage from './components/LazyImage';
import LibrarySkeletonCard from './components/LibrarySkeletonCard';
import ImageEditorModal from './image/ImageEditorModal';
import LoadingButton from '../../../components/LoadingButton';
import { prepareWebpUpload } from './image/utils/webpUtils.mjs';
import AdminShell from '@/components/admin/AdminShell';
import { useAlerts } from '@/context/AlertContext';

const MEDIA_PAGE_SIZE = 20;
const STALE_DAYS = 180;
const MAX_BATCH_UPLOADS = 8;

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Unattached', value: 'unattached' },
  { label: 'Stale', value: 'stale' },
];
const COMPONENT_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Stale', value: 'stale' },
];

/* ── icons ── */
const IcoUpload = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" />
    <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" />
  </svg>
);
const IcoTrash = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M5 7h14m-9 3v7m4-7v7M8 7l1-2h6l1 2m-1 0v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IcoView = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" strokeLinecap="round" />
    <polyline points="15 3 21 3 21 9" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="10" y1="14" x2="21" y2="3" strokeLinecap="round" />
  </svg>
);
const IcoClose = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
  </svg>
);
const IcoCopy = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IcoCheck = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2">
    <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IcoSearch = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" strokeLinecap="round" />
  </svg>
);

const IMAGE_ID_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
function generateImageId() {
  let id = 'IMG-';
  for (let i = 0; i < 7; i++) id += IMAGE_ID_ALPHABET[Math.floor(Math.random() * IMAGE_ID_ALPHABET.length)];
  return id;
}

function generateBatchId() {
  return `BATCH-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function displayId(item) {
  return item?.local_image_id || item?.id || '';
}

function displayIdWithMain(item) {
  const id = displayId(item);
  return item?.is_batch_main ? `${id} (main)` : id;
}

function formatBatchDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const IcoLayers = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="m12 3 9 5-9 5-9-5 9-5Z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="m3 13 9 5 9-5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IcoStar = ({ filled = false }) => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
    <path d="m12 3 2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17.5 6.1 20.8l1.3-6.5-4.9-4.5 6.6-.8Z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

async function copyText(text) {
  if (!text) return false;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fall through to legacy path */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  } catch { return false; }
}

function MediaCard({ item, isSelected, isCopied, onToggleSelect, onOpen, onCopyId, onDelete, onSetMain, className = '' }) {
  const inBatch = Boolean(item.source_batch_id);
  return (
    <div
      className={`group relative overflow-hidden rounded-xl border bg-white shadow-sm transition hover:shadow-md dark:bg-white/5 dark:shadow-none ${
        isSelected ? 'border-slate-900 ring-1 ring-slate-900/20 dark:border-white dark:ring-white/20' : 'border-slate-200 dark:border-white/10'
      } ${className}`}
    >
      {/* Checkbox */}
      <label className="absolute left-2 top-2 z-10 cursor-pointer">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onToggleSelect(item.id, e.target.checked)}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 rounded border-white/80 bg-white/90 text-slate-900 shadow-sm"
          aria-label={`Select ${item.title || 'image'}`}
        />
      </label>

      {/* Image */}
      <button type="button" onClick={() => onOpen(item)} className="block w-full">
        <div className="aspect-square overflow-hidden bg-slate-100 dark:bg-white/10">
          <LazyImage src={item.url} alt={item.title || 'Media'} />
        </div>
      </button>

      {/* Badges */}
      {item.is_batch_main ? (
        <span className="absolute right-2 top-2 flex items-center gap-0.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-semibold text-white">
          <IcoStar filled />
          Main
        </span>
      ) : item.unattached ? (
        <span className="absolute right-2 top-2 rounded-full bg-slate-900/75 px-1.5 py-0.5 text-[9px] font-semibold text-white">
          Free
        </span>
      ) : item.is_stale ? (
        <span className="absolute right-2 top-2 rounded-full bg-amber-500/90 px-1.5 py-0.5 text-[9px] font-semibold text-white">
          Stale
        </span>
      ) : null}

      {/* Hover actions */}
      <div className="absolute bottom-0 inset-x-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-2 py-2 opacity-0 transition group-hover:opacity-100">
        <button type="button" onClick={() => onOpen(item)} className="text-[10px] font-semibold text-white/90 hover:text-white">
          Edit
        </button>
        <div className="flex gap-1">
          {inBatch && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSetMain(item, !item.is_batch_main); }}
              className={`flex h-6 w-6 items-center justify-center rounded-lg hover:bg-white/40 ${
                item.is_batch_main ? 'bg-amber-500 text-white' : 'bg-white/20 text-white'
              }`}
              aria-label={item.is_batch_main ? 'Unmark as main' : 'Mark as main'}
              title={item.is_batch_main ? 'Unmark as main' : 'Mark as main for this batch'}
            >
              <IcoStar filled={item.is_batch_main} />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onCopyId(item); }}
            className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/20 text-white hover:bg-white/40"
            aria-label="Copy ID"
            title="Copy image ID"
          >
            {isCopied ? <IcoCheck /> : <IcoCopy />}
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); if (item?.url) window.open(item.url, '_blank', 'noopener'); }}
            className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/20 text-white hover:bg-white/40"
            aria-label="View"
          >
            <IcoView />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(item); }}
            className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-500/80 text-white hover:bg-rose-500"
            aria-label="Delete"
          >
            <IcoTrash />
          </button>
        </div>
      </div>
    </div>
  );
}

function WooCommerceLibraryPage({
  listEndpoint = '/api/admin/media',
  uploadEndpoint = '/api/admin/media/upload',
  deleteEndpointBase = '/api/admin/media',
  title = 'Image Library',
  filterOptions = FILTERS,
}) {
  const { confirmAlert } = useAlerts();
  const [mediaItems, setMediaItems] = useState([]);
  const [filter, setFilter] = useState(filterOptions[0]?.value || 'all');
  const [columns, setColumns] = useState(3);
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
  const [uploadPreviews, setUploadPreviews] = useState([]);
  const [uploadStatus, setUploadStatus] = useState('');
  const [activeMenuId, setActiveMenuId] = useState('');
  const [selectedMediaIds, setSelectedMediaIds] = useState(new Set());
  const [isDeletingSelection, setIsDeletingSelection] = useState(false);
  const [copiedId, setCopiedId] = useState('');
  const [copiedSelection, setCopiedSelection] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const loadMoreRef = useRef(null);
  const copiedTimerRef = useRef(null);

  useEffect(() => {
    if (!activeMedia) return;
    const handleKey = (e) => { if (e.key === 'Escape') setActiveMedia(null); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeMedia]);

  useEffect(() => {
    if (!activeMenuId) return;
    const handleClick = () => setActiveMenuId('');
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [activeMenuId]);

  useEffect(() => () => { uploadPreviews.forEach((u) => URL.revokeObjectURL(u)); }, [uploadPreviews]);

  useEffect(() => () => { if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current); }, []);

  useEffect(() => {
    setSelectedMediaIds((cur) => {
      if (!cur.size) return cur;
      const valid = new Set(mediaItems.map((i) => i.id));
      const next = new Set([...cur].filter((id) => valid.has(id)));
      return next.size === cur.size ? cur : next;
    });
  }, [mediaItems]);

  const handleUploadFiles = useCallback(async (files) => {
    const queue = (Array.isArray(files) ? files : []).slice(0, MAX_BATCH_UPLOADS);
    if (!queue.length) return;
    const batchId = queue.length > 1 ? generateBatchId() : '';
    setIsUploading(true);
    setUploadError('');
    setUploadStatus(`Uploading 0/${queue.length}…`);
    try {
      const uploaded = [];
      const failed = [];
      for (let i = 0; i < queue.length; i++) {
        setUploadStatus(`Uploading ${i + 1}/${queue.length}…`);
        try {
          const { webpFile, filename } = await prepareWebpUpload(queue[i]);
          const fd = new FormData();
          fd.append('file', webpFile);
          fd.append('local_image_id', generateImageId());
          if (batchId) fd.append('source_batch_id', batchId);
          const res = await fetch(uploadEndpoint, { method: 'POST', body: fd });
          const p = await res.json().catch(() => null);
          if (!res.ok) throw new Error(p?.message || p?.error || 'Upload failed.');
          uploaded.push({
            id: p?.id || `${Date.now()}-${i}`,
            local_image_id: p?.local_image_id || '',
            source_batch_id: p?.source_batch_id || '',
            url: p?.url || '',
            title: filename,
            unattached: true,
            created_at: new Date().toISOString(),
          });
        } catch (e) { failed.push(queue[i]?.name || `File ${i + 1}`); }
      }
      if (uploaded.length) { setMediaItems((p) => [...uploaded, ...p]); setIsUploadOpen(false); setUploadPreviews([]); }
      if (failed.length) setUploadError(`Failed: ${failed.slice(0, 3).join(', ')}${failed.length > 3 ? ` +${failed.length - 3} more` : ''}`);
      setUploadStatus(uploaded.length ? `Uploaded ${uploaded.length}/${queue.length}.` : '');
    } catch (e) { setUploadError(e?.message || 'Upload failed.'); setUploadStatus(''); }
    finally { setIsUploading(false); }
  }, [uploadEndpoint]);

  const deleteMediaById = useCallback(async (id) => {
    const res = await fetch(`${deleteEndpointBase}/${id}`, { method: 'DELETE' });
    const p = await res.json().catch(() => null);
    if (!res.ok) throw new Error(p?.error || 'Unable to delete.');
    setMediaItems((prev) => prev.filter((e) => e.id !== id));
    setSelectedMediaIds((prev) => { if (!prev.has(id)) return prev; const n = new Set(prev); n.delete(id); return n; });
    setActiveMedia((prev) => (prev?.id === id ? null : prev));
  }, [deleteEndpointBase]);

  const handleDelete = useCallback(async (item) => {
    if (!item?.id || isDeletingSelection) return;
    const ok = await confirmAlert({ type: 'warning', title: 'Delete image?', message: 'This cannot be undone.', confirmLabel: 'Delete', cancelLabel: 'Cancel' });
    if (!ok) return;
    setError('');
    try { await deleteMediaById(item.id); setActiveMenuId(''); } catch (e) { setError(e?.message || 'Delete failed.'); }
  }, [confirmAlert, deleteMediaById, isDeletingSelection]);

  const handleDeleteSelected = useCallback(async () => {
    if (!selectedMediaIds.size || isDeletingSelection) return;
    const ok = await confirmAlert({ type: 'warning', title: `Delete ${selectedMediaIds.size} image${selectedMediaIds.size > 1 ? 's' : ''}?`, message: 'This cannot be undone.', confirmLabel: 'Delete all', cancelLabel: 'Cancel' });
    if (!ok) return;
    setError('');
    setIsDeletingSelection(true);
    setActiveMenuId('');
    try { for (const id of selectedMediaIds) await deleteMediaById(id); }
    catch (e) { setError(e?.message || 'Delete failed.'); }
    finally { setIsDeletingSelection(false); }
  }, [confirmAlert, deleteMediaById, isDeletingSelection, selectedMediaIds]);

  const handleCopySelectedIds = useCallback(async () => {
    if (!selectedMediaIds.size) return;
    const ids = mediaItems.filter((i) => selectedMediaIds.has(i.id)).map((i) => displayIdWithMain(i));
    const ok = await copyText(ids.join('\n'));
    if (!ok) return;
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    setCopiedSelection(true);
    copiedTimerRef.current = setTimeout(() => setCopiedSelection(false), 1500);
  }, [mediaItems, selectedMediaIds]);

  const handleCopyId = useCallback(async (item) => {
    const idToCopy = displayIdWithMain(item);
    if (!idToCopy) return;
    const ok = await copyText(idToCopy);
    if (!ok) return;
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    setCopiedId(item.id);
    copiedTimerRef.current = setTimeout(() => setCopiedId(''), 1500);
  }, []);

  const handleToggleSelect = useCallback((id, checked) => {
    setSelectedMediaIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }, []);

  const handleCopyBatchIds = useCallback(async (batchId, items) => {
    const ok = await copyText(items.map((i) => displayIdWithMain(i)).join('\n'));
    if (!ok) return;
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    setCopiedId(`batch:${batchId}`);
    copiedTimerRef.current = setTimeout(() => setCopiedId(''), 1500);
  }, []);

  const handleDeleteBatch = useCallback(async (batchId, items) => {
    if (isDeletingSelection) return;
    const ok = await confirmAlert({ type: 'warning', title: `Delete this batch?`, message: `This removes all ${items.length} image${items.length > 1 ? 's' : ''} in this batch. This cannot be undone.`, confirmLabel: 'Delete batch', cancelLabel: 'Cancel' });
    if (!ok) return;
    setError('');
    setIsDeletingSelection(true);
    try { for (const item of items) await deleteMediaById(item.id); }
    catch (e) { setError(e?.message || 'Delete failed.'); }
    finally { setIsDeletingSelection(false); }
  }, [confirmAlert, deleteMediaById, isDeletingSelection]);

  const handleSetBatchMain = useCallback(async (item, nextMain) => {
    if (!item?.id) return;
    const batchId = item.source_batch_id;
    setError('');
    try {
      const res = await fetch(`${deleteEndpointBase}/${item.id}/main`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ main: nextMain }),
      });
      const p = await res.json().catch(() => null);
      if (!res.ok) throw new Error(p?.error || 'Unable to update main image.');
      setMediaItems((prev) => prev.map((i) => {
        if (i.id === item.id) return { ...i, is_batch_main: nextMain };
        if (nextMain && batchId && i.source_batch_id === batchId) return { ...i, is_batch_main: false };
        return i;
      }));
    } catch (e) { setError(e?.message || 'Unable to update main image.'); }
  }, [deleteEndpointBase]);

  const loadMedia = useCallback(async (reqPage, replace = false) => {
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ per_page: MEDIA_PAGE_SIZE, page: reqPage, filter, stale_days: STALE_DAYS });
      const res = await fetch(`${listEndpoint}?${params}`);
      const p = await res.json().catch(() => null);
      if (!res.ok) throw new Error(p?.error || 'Unable to load library.');
      const items = Array.isArray(p?.items) ? p.items : [];
      setMediaItems((prev) => replace ? items : [...prev, ...items]);
      setPage(reqPage);
      const np = p?.pages ? Number(p.pages) : null;
      if (Number.isFinite(np)) { setPages(np); setHasMore(reqPage < np); }
      else { setPages(1); setHasMore(items.length === MEDIA_PAGE_SIZE); }
      setTotalSize(p?.total_count != null ? `${p.total_count}` : '--');
    } catch (e) { setError(e?.message || 'Unable to load library.'); }
    finally { setIsLoading(false); }
  }, [filter, listEndpoint]);

  useEffect(() => {
    const t = setTimeout(() => { setMediaItems([]); setPage(1); setPages(1); setHasMore(true); loadMedia(1, true); }, 200);
    return () => clearTimeout(t);
  }, [filter, loadMedia]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(([e]) => { if (e?.isIntersecting && hasMore && !isLoading) loadMedia(page + 1); }, { rootMargin: '200px' });
    obs.observe(node);
    return () => obs.disconnect();
  }, [hasMore, isLoading, loadMedia, page]);

  const filteredMediaItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return mediaItems;
    return mediaItems.filter((item) => {
      const id = String(item.id ?? '').toLowerCase();
      const localId = String(item.local_image_id ?? '').toLowerCase();
      const title = String(item.title ?? '').toLowerCase();
      return id.includes(q) || localId.includes(q) || title.includes(q);
    });
  }, [mediaItems, searchQuery]);

  const visibleIds = useMemo(() => filteredMediaItems.map((i) => i.id).filter(Boolean), [filteredMediaItems]);
  const selCount = selectedMediaIds.size;
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedMediaIds.has(id));
  const hasSelection = selCount > 0;

  /* Group items uploaded together (same source_batch_id) into isolated batch
     blocks, same as the app's "By pushed batch" view — never mixed into a
     flat grid with unrelated images. Items without a batch id render as
     individual, ungrouped cards. */
  const { batchGroups, ungroupedItems } = useMemo(() => {
    const groups = new Map();
    const ungrouped = [];
    for (const item of filteredMediaItems) {
      const batchId = item.source_batch_id;
      if (!batchId) { ungrouped.push(item); continue; }
      if (!groups.has(batchId)) groups.set(batchId, { id: batchId, items: [], createdAt: item.created_at || '' });
      const group = groups.get(batchId);
      group.items.push(item);
      if (item.created_at && (!group.createdAt || item.created_at > group.createdAt)) group.createdAt = item.created_at;
    }
    const sortedGroups = Array.from(groups.values()).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return { batchGroups: sortedGroups, ungroupedItems: ungrouped };
  }, [filteredMediaItems]);

  /* grid: 2 on mobile, 3 on sm, then 4/5 on lg based on user choice */
  const gridCols = { 3: 'grid-cols-3', 4: 'sm:grid-cols-4', 5: 'sm:grid-cols-5' };
  const gridClass = `grid-cols-2 ${columns === 3 ? 'sm:grid-cols-3' : columns === 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-5'}`;

  return (
    <AdminShell bg="bg-slate-50/60">
      <div className="mx-auto w-full max-w-6xl space-y-4 pb-16 pt-4">

        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Library</h1>
            <p className="mt-0.5 text-xs text-slate-400 dark:text-zinc-500">
              {totalSize !== '--' && totalSize ? `${totalSize} images` : 'Your uploaded media'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-zinc-200"
          >
            <IcoUpload />
            <span className="hidden sm:inline">Upload</span>
          </button>
        </div>

        {/* ── Search ── */}
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5">
          <IcoSearch />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by image ID or filename…"
            className="w-full bg-transparent text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none dark:text-white dark:placeholder:text-zinc-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-zinc-500 dark:hover:bg-white/10 dark:hover:text-zinc-300"
              aria-label="Clear search"
            >
              <IcoClose />
            </button>
          )}
        </div>

        {/* ── Toolbar ── */}
        <div className="flex items-center justify-between gap-3">
          {/* Filters */}
          <div className="flex items-center gap-1 overflow-x-auto rounded-full border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-white/5">
            {(filterOptions || FILTERS).map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                className={`whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                  filter === f.value ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900' : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Grid size — desktop only */}
          <div className="hidden items-center gap-1 rounded-full border border-slate-200 bg-white p-1 sm:flex dark:border-white/10 dark:bg-white/5">
            {[3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setColumns(n)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                  columns === n ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900' : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* ── Selection bar — only when items selected ── */}
        {hasSelection && (
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">{selCount} selected</span>
              <button
                type="button"
                onClick={() => setSelectedMediaIds(new Set())}
                className="text-[11px] font-medium text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-300"
              >
                Clear
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopySelectedIds}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
              >
                {copiedSelection ? <IcoCheck /> : <IcoCopy />}
                {copiedSelection ? 'Copied' : 'Copy IDs'}
              </button>
              <button
                type="button"
                onClick={handleDeleteSelected}
                disabled={isDeletingSelection}
                className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-rose-500 disabled:opacity-50"
              >
                <IcoTrash />
                {isDeletingSelection ? 'Deleting…' : `Delete ${selCount}`}
              </button>
            </div>
          </div>
        )}

        {/* ── Select all row ── */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedMediaIds(allSelected ? new Set() : new Set(visibleIds))}
            disabled={!visibleIds.length || isDeletingSelection}
            className="text-[11px] font-medium text-slate-400 hover:text-slate-700 disabled:opacity-40 transition dark:text-zinc-500 dark:hover:text-zinc-300"
          >
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
          {totalSize && totalSize !== '--' && (
            <span className="text-[11px] text-slate-300 dark:text-zinc-600">· {totalSize} total</span>
          )}
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">{error}</div>
        )}

        {/* ── Loading skeleton ── */}
        {!mediaItems.length && isLoading && (
          <div className={`grid gap-2 sm:gap-3 ${gridClass}`}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-xl bg-slate-200 dark:bg-white/10" />
            ))}
          </div>
        )}

        {/* ── Batch groups — images uploaded together stay isolated, same as the app ── */}
        {batchGroups.map((batch) => (
          <div key={batch.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-3 dark:border-white/5 dark:bg-white/[0.03]">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                  <IcoLayers />
                </span>
                <div>
                  <p className="font-mono text-xs font-semibold text-slate-700 dark:text-zinc-300">{batch.id}</p>
                  <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                    {batch.items.length} image{batch.items.length > 1 ? 's' : ''}
                    {formatBatchDate(batch.createdAt) ? ` · ${formatBatchDate(batch.createdAt)}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyBatchIds(batch.id, batch.items)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
                >
                  {copiedId === `batch:${batch.id}` ? <IcoCheck /> : <IcoCopy />}
                  {copiedId === `batch:${batch.id}` ? 'Copied' : 'Copy IDs'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteBatch(batch.id, batch.items)}
                  disabled={isDeletingSelection}
                  className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:border-red-900/40 dark:bg-white/5 dark:text-red-300 dark:hover:bg-red-950/40"
                >
                  <IcoTrash />
                  Delete batch
                </button>
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto p-3 sm:gap-3 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-white/10">
              {batch.items.map((item) => (
                <MediaCard
                  key={`${item.id}-${item.url || 'media'}`}
                  item={item}
                  isSelected={selectedMediaIds.has(item.id)}
                  isCopied={copiedId === item.id}
                  onToggleSelect={handleToggleSelect}
                  onOpen={setActiveMedia}
                  onCopyId={handleCopyId}
                  onDelete={handleDelete}
                  onSetMain={handleSetBatchMain}
                  className="w-32 shrink-0 sm:w-40"
                />
              ))}
            </div>
          </div>
        ))}

        {/* ── Ungrouped grid ── */}
        {ungroupedItems.length > 0 && (
          <div className={`grid gap-2 sm:gap-3 ${gridClass}`}>
            {ungroupedItems.map((item) => (
              <MediaCard
                key={`${item.id}-${item.url || 'media'}`}
                item={item}
                isSelected={selectedMediaIds.has(item.id)}
                isCopied={copiedId === item.id}
                onToggleSelect={handleToggleSelect}
                onOpen={setActiveMedia}
                onCopyId={handleCopyId}
                onDelete={handleDelete}
                onSetMain={handleSetBatchMain}
              />
            ))}
          </div>
        )}

        {!mediaItems.length && !isLoading && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white py-16 dark:border-white/10 dark:bg-white/5">
            <svg viewBox="0 0 24 24" className="h-8 w-8 text-slate-300 dark:text-zinc-600" fill="none" stroke="currentColor" strokeWidth="1.4">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <path d="M3 16l5-5 4 4 3-3 6 6" />
              <circle cx="8.5" cy="8.5" r="1.5" />
            </svg>
            <p className="text-sm font-medium text-slate-400 dark:text-zinc-500">No images found</p>
            <button
              type="button"
              onClick={() => setIsUploadOpen(true)}
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white dark:bg-white dark:text-slate-900"
            >
              Upload your first image
            </button>
          </div>
        )}

        {mediaItems.length > 0 && !filteredMediaItems.length && !isLoading && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white py-16 dark:border-white/10 dark:bg-white/5">
            <IcoSearch />
            <p className="text-sm font-medium text-slate-400 dark:text-zinc-500">No images match “{searchQuery}”</p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Clear search
            </button>
          </div>
        )}

        {/* ── Load more ── */}
        <div className="flex justify-center pt-2">
          {isLoading && mediaItems.length > 0 && (
            <BouncingDotsLoader className="text-slate-400 dark:text-zinc-500" dotClassName="bg-slate-400 dark:bg-zinc-500" />
          )}
          {hasMore && !isLoading && (
            <LoadingButton
              type="button"
              onClick={() => loadMedia(page + 1)}
              isLoading={isLoading}
              className="rounded-full border border-slate-200 bg-white px-5 py-2 text-xs font-semibold text-slate-500 hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400 dark:hover:border-white/20"
            >
              Load more
            </LoadingButton>
          )}
        </div>
        <div ref={loadMoreRef} className="h-1" />

        <ImageEditorModal
          media={activeMedia}
          onClose={() => setActiveMedia(null)}
          onSaved={(saved) => {
            if (!saved?.url) return;
            setMediaItems((prev) => [saved, ...prev.filter((e) => e.id !== saved.id)]);
            setActiveMedia(null);
          }}
        />
      </div>

      {/* ── Upload modal ── */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button
            type="button"
            onClick={() => setIsUploadOpen(false)}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            aria-label="Close"
          />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:rounded-3xl dark:border-white/10 dark:bg-[#0a0a0a]">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-white/10">
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Upload Images</p>
                <p className="text-[11px] text-slate-400 dark:text-zinc-500">Up to {MAX_BATCH_UPLOADS} files · JPG, PNG, WEBP</p>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-white/10 dark:text-zinc-400 dark:hover:bg-white/20"
              >
                <IcoClose />
              </button>
            </div>

            {/* Batch notice */}
            <div className="flex items-start gap-2.5 border-b border-slate-100 bg-slate-50/60 px-5 py-3 dark:border-white/10 dark:bg-white/[0.03]">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                <IcoLayers />
              </span>
              <p className="text-[11px] leading-4 text-slate-500 dark:text-zinc-400">
                Selecting more than one file uploads them together as a single batch, kept isolated from your other images in the library.
              </p>
            </div>

            {/* Drop zone */}
            <div className="p-5">
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center transition hover:border-slate-400 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/25 dark:hover:bg-white/10">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (!files.length) return;
                    setUploadError('');
                    setUploadStatus('');
                    setUploadPreviews((prev) => { prev.forEach((u) => URL.revokeObjectURL(u)); return files.slice(0, 4).map((f) => URL.createObjectURL(f)); });
                    handleUploadFiles(files);
                    e.target.value = '';
                  }}
                />
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-zinc-400">
                  <IcoUpload />
                </span>
                <span className="text-sm font-semibold text-slate-700 dark:text-zinc-200">Tap to pick images</span>
                <span className="text-[11px] text-slate-400 dark:text-zinc-500">or drag and drop here</span>
              </label>

              {/* Previews */}
              {uploadPreviews.length > 0 && (
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {uploadPreviews.map((url, i) => (
                    <img key={i} src={url} alt="Preview" className="aspect-square w-full rounded-xl object-cover" />
                  ))}
                </div>
              )}

              {/* Status */}
              {(uploadStatus || uploadError) && (
                <div className={`mt-3 rounded-xl px-3 py-2 text-xs font-medium ${uploadError ? 'bg-rose-50 text-rose-600 dark:bg-red-950/40 dark:text-red-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'}`}>
                  {uploadError || uploadStatus}
                </div>
              )}

              {isUploading && (
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-400 dark:text-zinc-500">
                  <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  {uploadStatus || 'Uploading…'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

export default WooCommerceLibraryPage;
