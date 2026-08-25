'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import LoadingButton from '@/components/LoadingButton';
import ColorPicker, { defaultSwatches, getSwatchStyle } from './ColorPicker';
import { useAlerts } from '@/context/AlertContext';

const PAGE_SIZE = 10;

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const emptyItemForm = { id: '', name: '', slug: '', description: '', type_id: '' };
const emptyOptionForm = { id: '', name: '', slug: '', color_hex: '' };

// ── Bottom sheet — same pattern as Tags/Categories ─────────────────────────
function Sheet({ open, title, onClose, children, forceBottom = false }) {
  if (!open) return null;
  return (
    <div
      className={`fixed inset-0 z-[90] bg-slate-900/40 [animation:taxonomy-sheet-fade_220ms_ease-out] ${
        forceBottom ? 'p-0 sm:p-4' : 'p-3 sm:p-4'
      }`}
    >
      <div className={`mx-auto flex h-full w-full max-w-md items-end ${forceBottom ? '' : 'sm:items-center'}`}>
        <div
          className={`w-full overflow-hidden bg-white shadow-[0_30px_80px_rgba(15,23,42,0.26)] ${
            forceBottom
              ? 'h-[70dvh] rounded-t-3xl rounded-b-none [animation:taxonomy-sheet-up_260ms_cubic-bezier(0.22,1,0.36,1)] sm:h-auto sm:rounded-3xl sm:[animation:taxonomy-sheet-pop_220ms_ease-out]'
              : 'rounded-3xl [animation:taxonomy-sheet-pop_220ms_ease-out]'
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100"
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className={`${forceBottom ? 'max-h-[calc(70dvh-57px)] sm:max-h-[70vh]' : 'max-h-[70vh]'} overflow-y-auto px-4 py-4`}>
            {children}
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes taxonomy-sheet-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes taxonomy-sheet-up {
          from { transform: translateY(44px); opacity: 0.9; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes taxonomy-sheet-pop {
          from { transform: translateY(10px) scale(0.985); opacity: 0.9; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function TaxonomyManager({
  title,
  description,
  endpoint,
  singularLabel,
  pluralLabel,
  optionsEndpoint,
}) {
  const { confirmAlert, pushAlert } = useAlerts();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [totalCount, setTotalCount] = useState(0);

  const [types, setTypes] = useState([]);
  const [typesError, setTypesError] = useState('');

  // Item (attribute/tag/brand) create + edit share one sheet form
  const [itemForm, setItemForm] = useState(emptyItemForm);
  const [itemSaving, setItemSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [activeItem, setActiveItem] = useState(null);

  // Expanded-in-place options (terms), nested under the attribute card —
  // same visual idea as Categories nesting child rows under a parent.
  const [expandedId, setExpandedId] = useState(null);
  const [optionsByItem, setOptionsByItem] = useState({});
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState('');

  const [optionForm, setOptionForm] = useState(emptyOptionForm);
  const [optionSaving, setOptionSaving] = useState(false);
  const [optionCreateOpen, setOptionCreateOpen] = useState(false);
  const [optionEditOpen, setOptionEditOpen] = useState(false);
  const [optionActionOpen, setOptionActionOpen] = useState(false);
  const [activeOption, setActiveOption] = useState(null);
  const [optionParent, setOptionParent] = useState(null);

  const canSaveItem = itemForm.name.trim().length >= 2 && (!optionsEndpoint || itemForm.type_id);
  const activeItemType = types.find((t) => t.id === itemForm.type_id);
  const isColorAttribute = (optionParent?.type?.slug || activeItemType?.slug) === 'color';
  const canSaveOption = optionForm.name.trim().length > 0;

  const loadItems = useCallback(
    async (nextPage = page, nextQuery = query) => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ page: String(nextPage), per_page: String(PAGE_SIZE) });
        if (nextQuery.trim()) params.set('search', nextQuery.trim());
        const response = await fetch(`${endpoint}?${params.toString()}`, { cache: 'no-store' });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || `Unable to load ${pluralLabel}.`);
        setItems(Array.isArray(payload?.items) ? payload.items : []);
        setPage(Number(payload?.page || nextPage) || 1);
        setPages(Number(payload?.pages || 1) || 1);
        setTotalCount(Number(payload?.total_count || 0) || 0);
      } catch (err) {
        setItems([]);
        setError(err?.message || `Unable to load ${pluralLabel}.`);
      } finally {
        setLoading(false);
      }
    },
    [endpoint, page, pluralLabel, query],
  );

  useEffect(() => {
    loadItems(1, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!optionsEndpoint) return;
    const loadTypes = async () => {
      setTypesError('');
      try {
        const response = await fetch('/api/admin/attribute-types');
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || 'Unable to load attribute types.');
        setTypes(Array.isArray(payload?.items) ? payload.items : []);
      } catch (err) {
        setTypesError(err?.message || 'Unable to load attribute types.');
        setTypes([]);
      }
    };
    loadTypes();
  }, [optionsEndpoint]);

  const onSearch = () => {
    const next = search.trim();
    setQuery(next);
    loadItems(1, next);
  };

  // ── Item CRUD ──────────────────────────────────────────────────────────

  const openCreate = () => {
    setItemForm({ ...emptyItemForm, type_id: types[0]?.id || '' });
    setCreateOpen(true);
  };

  const openEdit = (item) => {
    setItemForm({
      id: String(item?.id || ''),
      name: item?.name || '',
      slug: item?.slug || '',
      description: item?.description || '',
      type_id: item?.type_id || item?.type?.id || '',
    });
    setEditOpen(true);
    setActionOpen(false);
  };

  const submitCreate = async (event) => {
    event.preventDefault();
    if (!canSaveItem || itemSaving) return;
    setItemSaving(true);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: itemForm.name.trim(),
          slug: itemForm.slug.trim(),
          description: itemForm.description.trim(),
          ...(optionsEndpoint ? { type_id: itemForm.type_id } : {}),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || `Unable to create ${singularLabel}.`);
      pushAlert({ type: 'success', title, message: `${title} created.` });
      setCreateOpen(false);
      setItemForm(emptyItemForm);
      await loadItems(1, query);
    } catch (err) {
      pushAlert({ type: 'error', title, message: err?.message || `Unable to create ${singularLabel}.` });
    } finally {
      setItemSaving(false);
    }
  };

  const submitEdit = async (event) => {
    event.preventDefault();
    if (!canSaveItem || !itemForm.id || itemSaving) return;
    setItemSaving(true);
    try {
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: itemForm.id,
          name: itemForm.name.trim(),
          slug: itemForm.slug.trim(),
          description: itemForm.description.trim(),
          ...(optionsEndpoint ? { type_id: itemForm.type_id } : {}),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || `Unable to update ${singularLabel}.`);
      pushAlert({ type: 'success', title, message: `${title} updated.` });
      setEditOpen(false);
      setActionOpen(false);
      await loadItems(page, query);
    } catch (err) {
      pushAlert({ type: 'error', title, message: err?.message || `Unable to update ${singularLabel}.` });
    } finally {
      setItemSaving(false);
    }
  };

  const deleteItem = async (item) => {
    if (!item?.id) return;
    const confirmed = await confirmAlert({
      type: 'warning',
      title: `Delete ${singularLabel}?`,
      message: `Delete "${item.name || singularLabel}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
    });
    if (!confirmed) return;
    try {
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || `Unable to delete ${singularLabel}.`);
      pushAlert({ type: 'success', title, message: `${title} deleted.` });
      setActionOpen(false);
      if (expandedId === item.id) setExpandedId(null);
      await loadItems(1, query);
    } catch (err) {
      pushAlert({ type: 'error', title, message: err?.message || `Unable to delete ${singularLabel}.` });
    }
  };

  // ── Options (terms) — expand a card in place, like Categories nesting children ──

  const loadOptions = useCallback(async (attribute) => {
    if (!optionsEndpoint || !attribute?.id) return;
    setOptionsLoading(true);
    setOptionsError('');
    try {
      const params = new URLSearchParams({ attribute_id: attribute.id });
      const response = await fetch(`${optionsEndpoint}?${params.toString()}`);
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Unable to load options.');
      setOptionsByItem((prev) => ({ ...prev, [attribute.id]: Array.isArray(payload?.items) ? payload.items : [] }));
    } catch (err) {
      setOptionsError(err?.message || 'Unable to load options.');
    } finally {
      setOptionsLoading(false);
    }
  }, [optionsEndpoint]);

  const toggleExpand = (item) => {
    if (!optionsEndpoint) return;
    if (expandedId === item.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(item.id);
    if (!optionsByItem[item.id]) loadOptions(item);
  };

  const openOptionCreate = (attribute) => {
    setOptionParent(attribute);
    setOptionForm(emptyOptionForm);
    setOptionCreateOpen(true);
  };

  const openOptionEdit = (attribute, option) => {
    setOptionParent(attribute);
    setActiveOption(option);
    setOptionForm({
      id: String(option?.id || ''),
      name: option?.name || '',
      slug: option?.slug || '',
      color_hex: option?.color_hex || '',
    });
    setOptionEditOpen(true);
    setOptionActionOpen(false);
  };

  const submitOptionCreate = async (event) => {
    event.preventDefault();
    if (!canSaveOption || !optionParent?.id || optionSaving) return;
    setOptionSaving(true);
    try {
      const response = await fetch(optionsEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attribute_id: optionParent.id,
          name: optionForm.name.trim(),
          slug: optionForm.slug.trim(),
          color_hex: isColorAttribute ? optionForm.color_hex.trim() : '',
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Unable to create option.');
      pushAlert({ type: 'success', title, message: 'Option created.' });
      setOptionCreateOpen(false);
      setOptionForm(emptyOptionForm);
      await loadOptions(optionParent);
    } catch (err) {
      pushAlert({ type: 'error', title, message: err?.message || 'Unable to create option.' });
    } finally {
      setOptionSaving(false);
    }
  };

  const submitOptionEdit = async (event) => {
    event.preventDefault();
    if (!canSaveOption || !optionForm.id || optionSaving) return;
    setOptionSaving(true);
    try {
      const response = await fetch(optionsEndpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: optionForm.id,
          name: optionForm.name.trim(),
          slug: optionForm.slug.trim(),
          color_hex: isColorAttribute ? optionForm.color_hex.trim() : '',
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Unable to update option.');
      pushAlert({ type: 'success', title, message: 'Option updated.' });
      setOptionEditOpen(false);
      setOptionActionOpen(false);
      await loadOptions(optionParent);
    } catch (err) {
      pushAlert({ type: 'error', title, message: err?.message || 'Unable to update option.' });
    } finally {
      setOptionSaving(false);
    }
  };

  const deleteOption = async (attribute, option) => {
    if (!option?.id || !optionsEndpoint) return;
    const confirmed = await confirmAlert({
      type: 'warning',
      title: 'Delete option?',
      message: `Delete option "${option.name}"?`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
    });
    if (!confirmed) return;
    try {
      const response = await fetch(optionsEndpoint, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: option.id }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Unable to delete option.');
      pushAlert({ type: 'success', title, message: 'Option deleted.' });
      setOptionActionOpen(false);
      await loadOptions(attribute);
    } catch (err) {
      pushAlert({ type: 'error', title, message: err?.message || 'Unable to delete option.' });
    }
  };

  const headerHint = useMemo(
    () => `${totalCount} total · page ${page} of ${pages}`,
    [totalCount, page, pages],
  );

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="flex items-center justify-between py-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
          <p className="mt-1 text-xs text-slate-500">{headerHint}</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.24)] transition hover:brightness-110"
          aria-label={`Add ${singularLabel}`}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <label className="inline-flex h-11 flex-1 items-center rounded-full border border-slate-200 bg-white px-3 text-sm text-slate-700">
          <svg className="mr-2 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                onSearch();
              }
            }}
            placeholder={`Search ${pluralLabel}`}
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </label>
        <button
          type="button"
          onClick={onSearch}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Go
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}

      <div className="mt-3">
        {loading ? (
          <ul className="space-y-2 py-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <li key={index} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="h-4 w-28 animate-pulse rounded-md bg-slate-200/85" />
                  <div className="mt-1.5 h-3 w-44 animate-pulse rounded-md bg-slate-200/70" />
                </div>
                <div className="h-9 w-9 animate-pulse rounded-full bg-slate-200/80" />
              </li>
            ))}
          </ul>
        ) : items.length ? (
          <ul className="space-y-2">
            {items.map((item) => {
              const isExpanded = expandedId === item.id;
              const itemOptions = optionsByItem[item.id] || [];
              return (
                <li key={item.id} className="rounded-2xl border border-slate-200 bg-white">
                  <div className="flex items-center gap-3 px-3 py-3">
                    {optionsEndpoint && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(item)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100"
                        aria-label={isExpanded ? 'Collapse options' : 'Expand options'}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                          fill="none" stroke="currentColor" strokeWidth="2.5"
                        >
                          <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {item?.name || `Untitled ${singularLabel}`}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        /{item?.slug || '—'} · {formatDate(item?.created_at)}
                        {optionsEndpoint && item?.type?.name ? ` · ${item.type.name}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveItem(item);
                        setActionOpen(true);
                      }}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                      aria-label={`${singularLabel} actions`}
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                        <circle cx="5" cy="12" r="1.8" />
                        <circle cx="12" cy="12" r="1.8" />
                        <circle cx="19" cy="12" r="1.8" />
                      </svg>
                    </button>
                  </div>

                  {/* Nested options — same indent + dashed connector pattern
                      Categories uses for child rows under a parent. */}
                  {optionsEndpoint && isExpanded && (
                    <div className="ml-6 space-y-2 border-l border-dashed border-slate-200 px-3 pb-3 pl-4">
                      {optionsLoading && !optionsByItem[item.id] ? (
                        <p className="py-2 text-xs text-slate-400">Loading options…</p>
                      ) : itemOptions.length ? (
                        itemOptions.map((option) => (
                          <div
                            key={option.id}
                            className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2"
                          >
                            {option.color_hex ? (
                              <span
                                className="h-4 w-4 shrink-0 rounded-full border border-slate-200"
                                style={getSwatchStyle(option.color_hex)}
                              />
                            ) : null}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold text-slate-800">{option.name}</p>
                              <p className="truncate text-[11px] text-slate-400">/{option.slug || '—'}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setOptionParent(item);
                                setActiveOption(option);
                                setOptionActionOpen(true);
                              }}
                              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200/60"
                              aria-label="Option actions"
                            >
                              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                                <circle cx="5" cy="12" r="1.6" />
                                <circle cx="12" cy="12" r="1.6" />
                                <circle cx="19" cy="12" r="1.6" />
                              </svg>
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="py-2 text-xs text-slate-400">No options yet.</p>
                      )}
                      <button
                        type="button"
                        onClick={() => openOptionCreate(item)}
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-2 text-xs font-semibold text-slate-500 transition hover:border-slate-400 hover:text-slate-700"
                      >
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                        Add option
                      </button>
                      {optionsError && <p className="text-xs text-rose-500">{optionsError}</p>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="py-8 text-sm text-slate-500">No {pluralLabel} yet.</p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
        <button
          type="button"
          className="rounded-full border border-slate-200 px-3 py-1.5 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => loadItems(Math.max(1, page - 1), query)}
          disabled={page <= 1 || loading}
        >
          Previous
        </button>
        <span>Page {page} of {pages}</span>
        <button
          type="button"
          className="rounded-full border border-slate-200 px-3 py-1.5 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => loadItems(Math.min(pages, page + 1), query)}
          disabled={page >= pages || loading}
        >
          Next
        </button>
      </div>

      {/* ── Item sheets ────────────────────────────────────────────────── */}

      <Sheet open={createOpen} title={`Create ${singularLabel}`} onClose={() => !itemSaving && setCreateOpen(false)} forceBottom>
        <form onSubmit={submitCreate} className="space-y-3">
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Name</span>
            <input
              value={itemForm.name}
              onChange={(event) => setItemForm((prev) => ({ ...prev, name: event.target.value }))}
              className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none"
              required
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Slug (optional)</span>
            <input
              value={itemForm.slug}
              onChange={(event) => setItemForm((prev) => ({ ...prev, slug: event.target.value }))}
              placeholder="auto-generated if empty"
              className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none"
            />
          </label>
          {optionsEndpoint && (
            <div>
              <span className="text-xs font-semibold text-slate-600">Type</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {types.map((type) => {
                  const selected = itemForm.type_id === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setItemForm((prev) => ({ ...prev, type_id: type.id }))}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        selected
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                      }`}
                    >
                      {type.name}
                    </button>
                  );
                })}
              </div>
              {typesError && <p className="mt-2 text-xs text-rose-500">{typesError}</p>}
            </div>
          )}
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Description (optional)</span>
            <textarea
              value={itemForm.description}
              onChange={(event) => setItemForm((prev) => ({ ...prev, description: event.target.value }))}
              className="mt-1 h-24 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none"
            />
          </label>
          <LoadingButton
            type="submit"
            isLoading={itemSaving}
            disabled={!canSaveItem}
            className="w-full rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            Create {singularLabel}
          </LoadingButton>
        </form>
      </Sheet>

      <Sheet open={editOpen} title={`Edit ${singularLabel}`} onClose={() => !itemSaving && setEditOpen(false)} forceBottom>
        <form onSubmit={submitEdit} className="space-y-3">
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Name</span>
            <input
              value={itemForm.name}
              onChange={(event) => setItemForm((prev) => ({ ...prev, name: event.target.value }))}
              className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none"
              required
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Slug (optional)</span>
            <input
              value={itemForm.slug}
              onChange={(event) => setItemForm((prev) => ({ ...prev, slug: event.target.value }))}
              className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none"
            />
          </label>
          {optionsEndpoint && (
            <div>
              <span className="text-xs font-semibold text-slate-600">Type</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {types.map((type) => {
                  const selected = itemForm.type_id === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setItemForm((prev) => ({ ...prev, type_id: type.id }))}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        selected
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                      }`}
                    >
                      {type.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Description (optional)</span>
            <textarea
              value={itemForm.description}
              onChange={(event) => setItemForm((prev) => ({ ...prev, description: event.target.value }))}
              className="mt-1 h-24 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none"
            />
          </label>
          <LoadingButton
            type="submit"
            isLoading={itemSaving}
            disabled={!canSaveItem}
            className="w-full rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            Save changes
          </LoadingButton>
        </form>
      </Sheet>

      <Sheet open={actionOpen} title={activeItem?.name || title} onClose={() => setActionOpen(false)}>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => openEdit(activeItem)}
            className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Edit
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14.06 4.94l3.75 3.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {optionsEndpoint && (
            <button
              type="button"
              onClick={() => {
                setActionOpen(false);
                if (expandedId !== activeItem?.id) toggleExpand(activeItem);
              }}
              className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              View options
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          <button
            type="button"
            onClick={() => deleteItem(activeItem)}
            className="flex w-full items-center justify-between rounded-2xl border border-rose-200 px-3 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
          >
            Delete
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 7h16" strokeLinecap="round" />
              <path d="M9 7V5h6v2" strokeLinecap="round" />
              <path d="M7 7l1 12h8l1-12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </Sheet>

      {/* ── Option sheets ──────────────────────────────────────────────── */}

      <Sheet
        open={optionCreateOpen}
        title={`Add option${optionParent?.name ? ` — ${optionParent.name}` : ''}`}
        onClose={() => !optionSaving && setOptionCreateOpen(false)}
        forceBottom
      >
        <form onSubmit={submitOptionCreate} className="space-y-3">
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Option name</span>
            <input
              value={optionForm.name}
              onChange={(event) => setOptionForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="e.g. Midnight Blue"
              className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none"
              required
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Slug (optional)</span>
            <input
              value={optionForm.slug}
              onChange={(event) => setOptionForm((prev) => ({ ...prev, slug: event.target.value }))}
              placeholder="auto-generated if empty"
              className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none"
            />
          </label>
          {isColorAttribute && (
            <div>
              <span className="text-xs font-semibold text-slate-600">Color</span>
              <ColorPicker
                value={optionForm.color_hex}
                onChange={(value) => setOptionForm((prev) => ({ ...prev, color_hex: value }))}
                showSwatches
                showTextInput
                swatches={defaultSwatches}
                inputClassName="mt-1.5 h-12 w-full rounded-xl border border-slate-200 p-1"
                textInputClassName="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700"
              />
            </div>
          )}
          <LoadingButton
            type="submit"
            isLoading={optionSaving}
            disabled={!canSaveOption}
            className="w-full rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            Create option
          </LoadingButton>
        </form>
      </Sheet>

      <Sheet
        open={optionEditOpen}
        title={`Edit option${optionParent?.name ? ` — ${optionParent.name}` : ''}`}
        onClose={() => !optionSaving && setOptionEditOpen(false)}
        forceBottom
      >
        <form onSubmit={submitOptionEdit} className="space-y-3">
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Option name</span>
            <input
              value={optionForm.name}
              onChange={(event) => setOptionForm((prev) => ({ ...prev, name: event.target.value }))}
              className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none"
              required
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Slug (optional)</span>
            <input
              value={optionForm.slug}
              onChange={(event) => setOptionForm((prev) => ({ ...prev, slug: event.target.value }))}
              className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none"
            />
          </label>
          {isColorAttribute && (
            <div>
              <span className="text-xs font-semibold text-slate-600">Color</span>
              <ColorPicker
                value={optionForm.color_hex}
                onChange={(value) => setOptionForm((prev) => ({ ...prev, color_hex: value }))}
                showSwatches
                showTextInput
                swatches={defaultSwatches}
                inputClassName="mt-1.5 h-12 w-full rounded-xl border border-slate-200 p-1"
                textInputClassName="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700"
              />
            </div>
          )}
          <LoadingButton
            type="submit"
            isLoading={optionSaving}
            disabled={!canSaveOption}
            className="w-full rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            Save changes
          </LoadingButton>
        </form>
      </Sheet>

      <Sheet open={optionActionOpen} title={activeOption?.name || 'Option'} onClose={() => setOptionActionOpen(false)}>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => openOptionEdit(optionParent, activeOption)}
            className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Edit
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14.06 4.94l3.75 3.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => deleteOption(optionParent, activeOption)}
            className="flex w-full items-center justify-between rounded-2xl border border-rose-200 px-3 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
          >
            Delete
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 7h16" strokeLinecap="round" />
              <path d="M9 7V5h6v2" strokeLinecap="round" />
              <path d="M7 7l1 12h8l1-12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </Sheet>
    </div>
  );
}

export default TaxonomyManager;
