'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { prepareWebpUpload } from '../../image/utils/webpUtils.mjs';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_UPLOAD_BYTES = 100 * 1024 * 1024;

export default function MediaLibraryModal({ isOpen, onClose, onSelect, acceptVideo = false }) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [urlError, setUrlError] = useState('');
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const urlInputRef = useRef(null);

  const fetchPage = useCallback(async (pageNum, replace = false) => {
    const setLoading = replace ? setIsLoading : setIsLoadingMore;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/media?page=${pageNum}&per_page=40`, { cache: 'no-store' });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) return;
      setItems((prev) => (replace ? data.items || [] : [...prev, ...(data.items || [])]));
      setPage(pageNum);
      setTotalPages(data.pages || 1);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setShowUrlInput(false);
      setUrlValue('');
      setUrlError('');
      return;
    }
    setItems([]);
    setPage(1);
    setTotalPages(1);
    fetchPage(1, true);
  }, [isOpen, fetchPage]);

  const handleApplyUrl = () => {
    const url = urlValue.trim();
    if (!url) { setUrlError('Paste an image URL first.'); return; }
    try { new URL(url); } catch { setUrlError("That doesn't look like a valid URL."); return; }
    onSelect(url, 'image');
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleUploadFile = useCallback(async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !String(file.type).startsWith('image/')) return;
    setIsUploading(true);
    try {
      const { webpFile } = await prepareWebpUpload(file, MAX_UPLOAD_BYTES);
      const form = new FormData();
      form.set('file', webpFile);
      form.set('alt_text', file.name.replace(/\.[^.]+$/, ''));
      const res = await fetch('/api/admin/media/upload', { method: 'POST', body: form });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Upload failed.');
      const url = String(data?.url || '').trim();
      if (url) {
        onSelect(url, 'image');
        onClose();
      }
    } catch {
      // silent — user can retry
    } finally {
      setIsUploading(false);
    }
  }, [onSelect, onClose]);

  const handleUploadVideo = useCallback(async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !String(file.type).startsWith('video/')) return;
    if (file.size > MAX_VIDEO_UPLOAD_BYTES) return;
    setIsUploadingVideo(true);
    try {
      const form = new FormData();
      form.set('file', file);
      const res = await fetch('/api/admin/media/video/upload', { method: 'POST', body: form });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Upload failed.');
      const url = String(data?.url || '').trim();
      if (url) {
        onSelect(url, 'video');
        onClose();
      }
    } catch {
      // silent — user can retry
    } finally {
      setIsUploadingVideo(false);
    }
  }, [onSelect, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative z-10 flex w-full flex-col bg-white shadow-2xl sm:max-w-3xl sm:rounded-2xl rounded-t-2xl max-h-[90vh]">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Media Library</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowUrlInput((prev) => !prev);
                setUrlError('');
                setTimeout(() => urlInputRef.current?.focus(), 50);
              }}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                showUrlInput
                  ? 'border-slate-800 bg-slate-800 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 0 0-5.656 0l-4 4a4 4 0 1 0 5.656 5.656l1.102-1.101m-.758-4.899a4 4 0 0 0 5.656 0l4-4a4 4 0 0 0-5.656-5.656l-1.1 1.1" />
              </svg>
              Use URL
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            >
              {isUploading ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              )}
              Upload New
            </button>
            {acceptVideo ? (
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                disabled={isUploadingVideo}
                className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-300 disabled:opacity-60"
              >
                {isUploadingVideo ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
                ) : (
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-2.36a.75.75 0 0 1 1.08.67v9.38a.75.75 0 0 1-1.08.67L15.75 16.5m-9-9h6a2.25 2.25 0 0 1 2.25 2.25v8.25a2.25 2.25 0 0 1-2.25 2.25h-6a2.25 2.25 0 0 1-2.25-2.25v-8.25A2.25 2.25 0 0 1 6.75 7.5Z" />
                  </svg>
                )}
                Upload video
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 transition"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* URL input panel */}
        {showUrlInput && (
          <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-5 py-3">
            <p className="mb-2 text-xs text-slate-500">Image will load directly from this URL — nothing is downloaded to your media library</p>
            <div className="flex gap-2">
              <input
                ref={urlInputRef}
                type="url"
                value={urlValue}
                onChange={(e) => { setUrlValue(e.target.value); setUrlError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleApplyUrl(); }}
                placeholder="https://example.com/image.jpg"
                className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300"
              />
              <button
                type="button"
                onClick={handleApplyUrl}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition"
              >
                Use this URL
              </button>
            </div>
            {urlError && <p className="mt-1.5 text-xs text-rose-500">{urlError}</p>}
          </div>
        )}

        {/* Image grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <svg className="mb-3 h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
              <p className="text-sm font-medium">No images yet</p>
              <p className="mt-1 text-xs">Click "Upload New" to add your first image</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => { onSelect(item.url, 'image'); onClose(); }}
                    className="group relative aspect-square overflow-hidden rounded-xl border-2 border-transparent transition hover:border-slate-900 focus:border-slate-900 focus:outline-none"
                    title={item.alt_text || item.title || ''}
                  >
                    <img
                      src={item.url}
                      alt={item.alt_text || ''}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/20">
                      <svg className="h-6 w-6 text-white opacity-0 drop-shadow transition group-hover:opacity-100" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    </span>
                  </button>
                ))}
              </div>
              {page < totalPages && (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => fetchPage(page + 1)}
                    disabled={isLoadingMore}
                    className="rounded-full border border-slate-200 bg-white px-5 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60"
                  >
                    {isLoadingMore ? 'Loading…' : 'Load more'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadFile} />
      {acceptVideo ? (
        <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleUploadVideo} />
      ) : null}
    </div>
  );
}
