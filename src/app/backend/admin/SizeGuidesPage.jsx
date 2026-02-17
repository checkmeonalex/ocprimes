import { useCallback, useEffect, useMemo, useState } from 'react';
import { readStoredSiteInfo, readStoredSiteId } from '../../../utils/connector';
import { fetchSizeGuides, createSizeGuide, deleteSizeGuide } from './products/functions/sizeGuides';
import { fetchProductCategories } from './products/functions/categories';
import ProductCategorySelector from './products/ProductCategorySelector';
import { uploadMediaFile } from './products/functions/media';
import LoadingButton from '../../../components/LoadingButton';
import AdminSidebar from '@/components/AdminSidebar';
import AdminDesktopHeader from '@/components/admin/AdminDesktopHeader';
import { useAlerts } from '@/context/AlertContext';

const buildTableHtml = (columns, rows) => {
  const head = columns.map((col) => `<th>${col || ''}</th>`).join('');
  const body = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${cell || ''}</td>`).join('')}</tr>`)
    .join('');
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
};

const stripHtml = (value) => value.replace(/<[^>]+>/g, '').trim();

function WooCommerceSizeGuidesPage() {
  const { confirmAlert } = useAlerts();
  const [siteInfo, setSiteInfo] = useState(() => readStoredSiteInfo());
  const [siteId, setSiteId] = useState(() => readStoredSiteId() || siteInfo?.siteId || '');
  const [sizeGuides, setSizeGuides] = useState([]);
  const [useDefaultGuides, setUseDefaultGuides] = useState(() => {
    try {
      const raw = localStorage.getItem('agentic_use_default_size_guides');
      if (raw === null) return true;
      return raw === 'true';
    } catch (_error) {
      return true;
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [generalInfo, setGeneralInfo] = useState('');
  const [useTable, setUseTable] = useState(true);
  const [useHtml, setUseHtml] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [categoryError, setCategoryError] = useState('');
  const [columns, setColumns] = useState(['Size', 'Chest', 'Length']);
  const [rows, setRows] = useState([
    ['', '', ''],
    ['', '', ''],
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key === 'agentic_wp_site') {
        setSiteInfo(readStoredSiteInfo());
      }
      if (event.key === 'agentic_wp_site_id') {
        setSiteId(readStoredSiteId());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    if (siteInfo?.siteId) {
      setSiteId(siteInfo.siteId);
    }
  }, [siteInfo]);

  const loadSizeGuides = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('agentic_auth_token');
      if (!siteId || !token) {
        throw new Error('Connect a store to load size guides.');
      }
      const payload = await fetchSizeGuides({ siteId, token });
      setSizeGuides(Array.isArray(payload?.size_guides) ? payload.size_guides : []);
    } catch (err) {
      setError(err?.message || 'Unable to load size guides.');
    } finally {
      setIsLoading(false);
    }
  }, [siteId]);

  const loadCategories = useCallback(async () => {
    setCategoryError('');
    try {
      const token = localStorage.getItem('agentic_auth_token');
      if (!siteId || !token) {
        throw new Error('Connect a store to load categories.');
      }
      const payload = await fetchProductCategories({ siteId, token, topLimit: 10 });
      setCategories(Array.isArray(payload?.categories) ? payload.categories : []);
    } catch (err) {
      setCategoryError(err?.message || 'Unable to load categories.');
      setCategories([]);
    }
  }, [siteId]);

  useEffect(() => {
    loadSizeGuides();
  }, [loadSizeGuides]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    try {
      localStorage.setItem('agentic_use_default_size_guides', String(useDefaultGuides));
    } catch (_error) {}
  }, [useDefaultGuides]);

  const visibleGuides = useMemo(() => {
    if (useDefaultGuides) return sizeGuides;
    return sizeGuides.filter((guide) => !guide.is_default);
  }, [sizeGuides, useDefaultGuides]);

  const handleAddColumn = () => {
    setColumns((prev) => [...prev, '']);
    setRows((prev) => prev.map((row) => [...row, '']));
  };

  const handleRemoveColumn = (index) => {
    setColumns((prev) => prev.filter((_, colIndex) => colIndex !== index));
    setRows((prev) => prev.map((row) => row.filter((_, colIndex) => colIndex !== index)));
  };

  const handleAddRow = () => {
    setRows((prev) => [...prev, columns.map(() => '')]);
  };

  const handleRemoveRow = (index) => {
    setRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
  };

  const handleCreateGuide = async () => {
    if (!title.trim()) {
      setSaveError('Title is required.');
      return;
    }
    setIsSaving(true);
    setSaveError('');
    try {
      const token = localStorage.getItem('agentic_auth_token');
      if (!siteId || !token) {
        throw new Error('Connect a store to save size guides.');
      }
      const baseContent = useHtml ? content : buildTableHtml(columns, rows);
      const htmlContent = imageUrl
        ? `${baseContent}\n<p><img src="${imageUrl}" alt="Size guide" /></p>`
        : baseContent;
      const payload = await createSizeGuide({
        siteId,
        token,
        id: editingGuide?.id,
        title: title.trim(),
        content: htmlContent,
        general_info: generalInfo.trim(),
        category_ids: selectedCategoryIds,
      });
      const created = payload?.size_guide;
      if (created) {
        setSizeGuides((prev) => {
          const filtered = prev.filter((item) => item.id !== created.id);
          return [created, ...filtered];
        });
      }
      setIsCreateOpen(false);
      setEditingGuide(null);
      setTitle('');
      setContent('');
      setUseTable(true);
      setUseHtml(false);
      setImageUrl('');
      setSelectedCategoryIds([]);
      setGeneralInfo('');
      setColumns(['Size', 'Chest', 'Length']);
      setRows([
        ['', '', ''],
        ['', '', ''],
      ]);
    } catch (err) {
      setSaveError(err?.message || 'Unable to save size guide.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditGuide = (guide) => {
    setEditingGuide(guide);
    setTitle(guide.title || '');
    setContent(guide.content || '');
    setGeneralInfo(guide.general_info || '');
    setSelectedCategoryIds(Array.isArray(guide.category_ids) ? guide.category_ids : []);
    setUseHtml(true);
    setUseTable(false);
    setIsCreateOpen(true);
  };

  const handleDeleteGuide = async (guide) => {
    if (!guide?.id) return;
    const confirmDelete = await confirmAlert({
      type: 'warning',
      title: 'Delete size guide?',
      message: `Delete "${guide.title}"? This cannot be undone.`,
      confirmLabel: 'Allow',
      cancelLabel: 'Deny',
    });
    if (!confirmDelete) return;
    setDeleteError('');
    try {
      const token = localStorage.getItem('agentic_auth_token');
      if (!siteId || !token) {
        throw new Error('Connect a store to delete size guides.');
      }
      await deleteSizeGuide({ siteId, token, id: guide.id });
      setSizeGuides((prev) => prev.filter((item) => item.id !== guide.id));
    } catch (err) {
      setDeleteError(err?.message || 'Unable to delete size guide.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <AdminSidebar />

        <main className="flex-1 px-6 py-8">
                  <AdminDesktopHeader />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Inventory
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-900">Size Guides</h1>
              <p className="mt-1 text-xs text-slate-500">
                Assign a size guide to products that need fit information.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={useDefaultGuides}
                  onChange={(event) => setUseDefaultGuides(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                Use default size guide
              </label>
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white"
              >
                New Size Guide
              </button>
            </div>
          </div>

          {error && <p className="mt-4 text-xs text-rose-500">{error}</p>}
          {deleteError && <p className="mt-4 text-xs text-rose-500">{deleteError}</p>}

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {isLoading && (
              <div className="rounded-3xl border border-slate-200 bg-white p-5 text-xs text-slate-400">
                Loading size guides...
              </div>
            )}
            {!isLoading && visibleGuides.length === 0 && (
              <div className="rounded-3xl border border-slate-200 bg-white p-5 text-xs text-slate-400">
                No size guides found.
              </div>
            )}
            {visibleGuides.map((guide) => (
              <div
                key={guide.id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">{guide.title}</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditGuide(guide)}
                      className="rounded-full border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-500 hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    {!guide.is_default && (
                      <button
                        type="button"
                        onClick={() => handleDeleteGuide(guide)}
                        className="rounded-full border border-rose-200 px-2 py-1 text-[10px] font-semibold text-rose-500 hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {stripHtml(guide.general_info || guide.content || '').slice(0, 120) || 'Table size guide'}
                </p>
                {Array.isArray(guide.categories) && guide.categories.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {guide.categories.map((category) => (
                      <span
                        key={`${guide.id}-category-${category.id}`}
                        className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-500"
                      >
                        {category.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </main>
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <button
            type="button"
            onClick={() => setIsCreateOpen(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            aria-label="Close size guide"
          />
          <div className="relative z-10 w-full max-w-3xl max-h-[calc(100vh-48px)] overflow-y-auto rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingGuide ? 'Edit size guide' : 'Create size guide'}
              </h2>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
              >
                Close
              </button>
            </div>

            {saveError && <p className="mt-3 text-xs text-rose-500">{saveError}</p>}

            <label className="mt-4 block text-[11px] text-slate-400">Title</label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs"
              placeholder="e.g., Men’s Tops"
            />
            <label className="mt-4 block text-[11px] text-slate-400">General Info</label>
            <textarea
              value={generalInfo}
              onChange={(event) => setGeneralInfo(event.target.value)}
              rows={3}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs text-slate-600"
              placeholder="How to measure, fit type, tolerance..."
            />
            <label className="mt-4 block text-[11px] text-slate-400">Default Categories</label>
            {categoryError && <p className="mt-2 text-xs text-rose-500">{categoryError}</p>}
            <ProductCategorySelector
              selectedCategories={selectedCategoryIds}
              onSelectCategories={setSelectedCategoryIds}
              categories={categories}
              frequentlyUsedCategories={[]}
              maxTopCategories={0}
              className="mt-2 w-full"
            />

            <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-600">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={useTable}
                  onChange={(event) => {
                    const next = event.target.checked;
                    setUseTable(next);
                    if (next) {
                      setUseHtml(false);
                    }
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                Use table layout
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={useHtml}
                  onChange={(event) => {
                    const next = event.target.checked;
                    setUseHtml(next);
                    if (next) {
                      setUseTable(false);
                    }
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                Use HTML editor
              </label>
            </div>

            {useTable && (
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddColumn}
                    className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
                  >
                    Add column
                  </button>
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
                  >
                    Add row
                  </button>
                  <LoadingButton
                    type="button"
                    isLoading={isUploading}
                    onClick={async () => {
                      const token = localStorage.getItem('agentic_auth_token');
                      if (!siteId || !token) {
                        setSaveError('Connect a store to upload images.');
                        return;
                      }
                      const fileInput = document.createElement('input');
                      fileInput.type = 'file';
                      fileInput.accept = 'image/*';
                      fileInput.onchange = async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        setIsUploading(true);
                        setSaveError('');
                        try {
                          const uploaded = await uploadMediaFile({ siteId, token, file });
                          if (uploaded?.url || uploaded?.src) {
                            setImageUrl(uploaded.url || uploaded.src);
                          }
                        } catch (err) {
                          setSaveError(err?.message || 'Unable to upload image.');
                        } finally {
                          setIsUploading(false);
                        }
                      };
                      fileInput.click();
                    }}
                    className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
                  >
                    Add image
                  </LoadingButton>
                </div>
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="min-w-full text-left text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        {columns.map((column, colIndex) => (
                          <th key={`col-${colIndex}`} className="border-b px-3 py-2 text-slate-500">
                            <div className="flex items-center gap-2">
                              <input
                                value={column}
                                onChange={(event) =>
                                  setColumns((prev) =>
                                    prev.map((item, idx) => (idx === colIndex ? event.target.value : item)),
                                  )
                                }
                                className="w-full bg-transparent text-xs font-semibold text-slate-600 outline-none"
                                placeholder="Header"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveColumn(colIndex)}
                                className="rounded-full border border-slate-200 px-2 py-1 text-[10px] text-slate-500 hover:bg-slate-50"
                                aria-label="Remove column"
                              >
                                ✕
                              </button>
                            </div>
                          </th>
                        ))}
                        <th className="border-b px-3 py-2 text-slate-400" />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, rowIndex) => (
                        <tr key={`row-${rowIndex}`} className="border-t">
                          {row.map((cell, colIndex) => (
                            <td key={`cell-${rowIndex}-${colIndex}`} className="px-3 py-2">
                              <input
                                value={cell}
                                onChange={(event) =>
                                  setRows((prev) =>
                                    prev.map((rowItem, idx) =>
                                      idx === rowIndex
                                        ? rowItem.map((item, cellIdx) =>
                                            cellIdx === colIndex ? event.target.value : item,
                                          )
                                        : rowItem,
                                    ),
                                  )
                                }
                                className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
                                placeholder="Value"
                              />
                            </td>
                          ))}
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(rowIndex)}
                              className="rounded-full border border-slate-200 px-2 py-1 text-[10px] text-slate-500 hover:bg-slate-50"
                              aria-label="Remove row"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {imageUrl && (
                  <div className="rounded-2xl border border-slate-200 p-3">
                    <img src={imageUrl} alt="Size guide" className="max-h-48 w-auto rounded-xl" />
                  </div>
                )}
              </div>
            )}

            {useHtml && (
              <div className="mt-4">
                <label className="block text-[11px] text-slate-400">Guide Content</label>
                <textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  rows={6}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs text-slate-600"
                  placeholder="Write size guide details..."
                />
                <div className="mt-4 rounded-2xl border border-slate-200 p-4 text-xs text-slate-600">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                    Preview
                  </p>
                  <div
                    className="prose prose-sm mt-3 max-w-none text-slate-600"
                    dangerouslySetInnerHTML={{ __html: content || '<p>No HTML content yet.</p>' }}
                  />
                </div>
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <LoadingButton
                type="button"
                onClick={handleCreateGuide}
                className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white"
                isLoading={isSaving}
              >
                {editingGuide ? 'Update size guide' : 'Save size guide'}
              </LoadingButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WooCommerceSizeGuidesPage;
