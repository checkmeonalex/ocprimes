'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import LoadingButton from '@/components/LoadingButton';
import ColorPicker, { defaultSwatches, getSwatchStyle } from './ColorPicker';
import { useAlerts } from '@/context/AlertContext';

const PAGE_SIZE = 10;

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString();
  } catch (_error) {
    return '—';
  }
};

function TaxonomyManager({
  title,
  description,
  endpoint,
  singularLabel,
  pluralLabel,
  optionsEndpoint,
}) {
  const { confirmAlert } = useAlerts();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [form, setForm] = useState({ name: '', slug: '', description: '', type_id: '' });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', slug: '', description: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [types, setTypes] = useState([]);
  const [typesLoading, setTypesLoading] = useState(false);
  const [typesError, setTypesError] = useState('');
  const [activeItem, setActiveItem] = useState(null);
  const [options, setOptions] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState('');
  const [optionForm, setOptionForm] = useState({ name: '', slug: '', color_hex: '' });
  const [optionCreateLoading, setOptionCreateLoading] = useState(false);
  const [optionCreateError, setOptionCreateError] = useState('');
  const [optionEditId, setOptionEditId] = useState(null);
  const [optionEditForm, setOptionEditForm] = useState({ name: '', slug: '', color_hex: '' });
  const [optionEditLoading, setOptionEditLoading] = useState(false);
  const [optionEditError, setOptionEditError] = useState('');
  const [deleteLoadingId, setDeleteLoadingId] = useState(null);
  const [optionDeleteLoadingId, setOptionDeleteLoadingId] = useState(null);

  const canSubmit = form.name.trim().length >= 2 && (!optionsEndpoint || form.type_id);

  const loadItems = useCallback(
    async (nextPage = page) => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        params.set('page', String(nextPage));
        params.set('per_page', String(PAGE_SIZE));
        if (search.trim()) {
          params.set('search', search.trim());
        }
        const response = await fetch(`${endpoint}?${params.toString()}`);
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error || `Unable to load ${pluralLabel}.`);
        }
        setItems(Array.isArray(payload?.items) ? payload.items : []);
        setPages(payload?.pages || 1);
        setPage(payload?.page || nextPage);
        setTotalCount(
          Number.isFinite(Number(payload?.total_count)) ? Number(payload.total_count) : 0,
        );
      } catch (err) {
        setError(err?.message || `Unable to load ${pluralLabel}.`);
      } finally {
        setLoading(false);
      }
    },
    [endpoint, page, pluralLabel, search],
  );

  useEffect(() => {
    loadItems(1);
  }, [loadItems]);

  useEffect(() => {
    if (!optionsEndpoint) return;
    const loadTypes = async () => {
      setTypesLoading(true);
      setTypesError('');
      try {
        const response = await fetch('/api/admin/attribute-types');
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error || 'Unable to load attribute types.');
        }
        setTypes(Array.isArray(payload?.items) ? payload.items : []);
      } catch (err) {
        setTypesError(err?.message || 'Unable to load attribute types.');
        setTypes([]);
      } finally {
        setTypesLoading(false);
      }
    };
    loadTypes();
  }, [optionsEndpoint]);

  const handleSearch = () => {
    loadItems(1);
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!canSubmit || createLoading) return;
    setCreateLoading(true);
    setCreateError('');
    setCreateSuccess('');
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          slug: form.slug.trim(),
          description: form.description.trim(),
          ...(optionsEndpoint ? { type_id: form.type_id } : {}),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || `Unable to create ${singularLabel}.`);
      }
      setForm({ name: '', slug: '', description: '' });
      setCreateSuccess(`${title} created.`);
      loadItems(1);
    } catch (err) {
      setCreateError(err?.message || `Unable to create ${singularLabel}.`);
    } finally {
      setCreateLoading(false);
    }
  };

  const isColorAttribute = activeItem?.type?.slug === 'color';

  const loadOptions = useCallback(async (attribute) => {
    if (!optionsEndpoint || !attribute?.id) return;
    setOptionsLoading(true);
    setOptionsError('');
    try {
      const params = new URLSearchParams({ attribute_id: attribute.id });
      const response = await fetch(`${optionsEndpoint}?${params.toString()}`);
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to load attribute options.');
      }
      setOptions(Array.isArray(payload?.items) ? payload.items : []);
    } catch (err) {
      setOptionsError(err?.message || 'Unable to load attribute options.');
      setOptions([]);
    } finally {
      setOptionsLoading(false);
    }
  }, [optionsEndpoint]);

  const startOptions = (item) => {
    setActiveItem(item);
    setOptionForm({ name: '', slug: '', color_hex: '' });
    setOptionCreateError('');
    setOptionEditError('');
    setOptionEditId(null);
    setOptionEditForm({ name: '', slug: '', color_hex: '' });
    loadOptions(item);
  };

  const handleCreateOption = async (event) => {
    event.preventDefault();
    if (!activeItem?.id || !optionForm.name.trim()) return;
    setOptionCreateLoading(true);
    setOptionCreateError('');
    try {
      const response = await fetch(optionsEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attribute_id: activeItem.id,
          name: optionForm.name.trim(),
          slug: optionForm.slug.trim(),
          color_hex: isColorAttribute ? optionForm.color_hex.trim() : '',
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to create option.');
      }
      setOptionForm({ name: '', slug: '', color_hex: '' });
      loadOptions(activeItem);
    } catch (err) {
      setOptionCreateError(err?.message || 'Unable to create option.');
    } finally {
      setOptionCreateLoading(false);
    }
  };

  const startOptionEdit = (option) => {
    setOptionEditId(option.id);
    setOptionEditForm({
      name: option.name || '',
      slug: option.slug || '',
      color_hex: option.color_hex || '',
    });
    setOptionEditError('');
  };

  const handleOptionEdit = async () => {
    if (!optionEditId || !optionEditForm.name.trim()) return;
    setOptionEditLoading(true);
    setOptionEditError('');
    try {
      const response = await fetch(optionsEndpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: optionEditId,
          name: optionEditForm.name.trim(),
          slug: optionEditForm.slug.trim(),
          color_hex: isColorAttribute ? optionEditForm.color_hex.trim() : '',
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to update option.');
      }
      setOptionEditId(null);
      setOptionEditForm({ name: '', slug: '', color_hex: '' });
      loadOptions(activeItem);
    } catch (err) {
      setOptionEditError(err?.message || 'Unable to update option.');
    } finally {
      setOptionEditLoading(false);
    }
  };

  const handleDeleteItem = async (item) => {
    if (!item?.id) return;
    const confirmed = await confirmAlert({
      type: 'warning',
      title: `Delete ${singularLabel}?`,
      message: `Delete ${item.name || singularLabel}?`,
      confirmLabel: 'Allow',
      cancelLabel: 'Deny',
    });
    if (!confirmed) return;
    setDeleteLoadingId(item.id);
    setEditError('');
    try {
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || `Unable to delete ${singularLabel}.`);
      }
      if (activeItem?.id === item.id) {
        setActiveItem(null);
        setOptions([]);
      }
      loadItems(1);
    } catch (err) {
      setEditError(err?.message || `Unable to delete ${singularLabel}.`);
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const handleDeleteOption = async (option) => {
    if (!option?.id || !optionsEndpoint) return;
    const confirmed = await confirmAlert({
      type: 'warning',
      title: 'Delete option?',
      message: `Delete option "${option.name}"?`,
      confirmLabel: 'Allow',
      cancelLabel: 'Deny',
    });
    if (!confirmed) return;
    setOptionDeleteLoadingId(option.id);
    setOptionEditError('');
    try {
      const response = await fetch(optionsEndpoint, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: option.id }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to delete option.');
      }
      loadOptions(activeItem);
    } catch (err) {
      setOptionEditError(err?.message || 'Unable to delete option.');
    } finally {
      setOptionDeleteLoadingId(null);
    }
  };

  const startEdit = (item) => {
    setEditId(item.id);
    setEditForm({
      name: item.name || '',
      slug: item.slug || '',
      description: item.description || '',
      type_id: item.type_id || item.type?.id || '',
    });
    setEditError('');
    setEditSuccess('');
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditForm({ name: '', slug: '', description: '', type_id: '' });
    setEditError('');
    setEditSuccess('');
  };

  const handleEdit = async () => {
    if (!editId || !editForm.name.trim()) return;
    setEditLoading(true);
    setEditError('');
    setEditSuccess('');
    try {
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editId,
          name: editForm.name.trim(),
          slug: editForm.slug.trim(),
          description: editForm.description.trim(),
          ...(optionsEndpoint ? { type_id: editForm.type_id } : {}),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || `Unable to update ${singularLabel}.`);
      }
      setEditSuccess(`${title} updated.`);
      cancelEdit();
      loadItems(page);
    } catch (err) {
      setEditError(err?.message || `Unable to update ${singularLabel}.`);
    } finally {
      setEditLoading(false);
    }
  };

  const emptyState = useMemo(() => {
    if (loading) return `Loading ${pluralLabel}...`;
    return `No ${pluralLabel} yet.`;
  }, [loading, pluralLabel]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="rounded-[32px] border border-slate-200 bg-gradient-to-r from-white via-slate-50 to-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">Admin Catalog</p>
            <h1 className="mt-3 text-2xl font-semibold text-slate-900">{title}</h1>
            <p className="mt-2 text-sm text-slate-500">{description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleSearch();
                }
              }}
              placeholder={`Search ${pluralLabel}...`}
              className="w-56 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 outline-none"
            />
            <LoadingButton
              type="button"
              isLoading={loading}
              onClick={handleSearch}
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
            >
              Search
            </LoadingButton>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
              Total {pluralLabel}
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{totalCount || 0}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
              Current page
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {page} / {pages}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
              Live status
            </p>
            <p className="mt-2 text-lg font-semibold text-emerald-600">Connected</p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Quick create
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-800">
              Add a new {singularLabel} to your catalog
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">
            {pluralLabel}
          </span>
        </div>
        <form onSubmit={handleCreate} className="mt-4 grid gap-4 md:grid-cols-[1.4fr_1fr]">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
              {singularLabel} name
            </label>
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder={`New ${singularLabel} name`}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
              required
            />
            <label className="mt-4 block text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
              slug (optional)
            </label>
            <input
              value={form.slug}
              onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
              placeholder="auto-generated if empty"
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            />
            {optionsEndpoint && (
              <>
                <label className="mt-4 block text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                  Attribute type
                </label>
                <select
                  value={form.type_id || ''}
                  onChange={(event) => setForm((prev) => ({ ...prev, type_id: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                >
                  <option value="">Select type</option>
                  {types.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
                {typesError && <p className="mt-2 text-xs text-rose-500">{typesError}</p>}
              </>
            )}
          </div>
          <div className="flex flex-col">
            <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
              description (optional)
            </label>
            <textarea
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Add a short description"
              className="mt-2 min-h-[140px] flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            />
          </div>
          <div className="md:col-span-2 flex flex-wrap items-center gap-3">
            <LoadingButton
              type="submit"
              isLoading={createLoading}
              disabled={!canSubmit}
              className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white disabled:bg-slate-300"
            >
              Create {singularLabel}
            </LoadingButton>
            {createError && <span className="text-xs text-rose-500">{createError}</span>}
            {createSuccess && <span className="text-xs text-emerald-600">{createSuccess}</span>}
          </div>
        </form>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.2em] text-slate-400">
            <tr>
              <th className="px-5 py-4">Name</th>
              <th className="px-5 py-4">Slug</th>
              <th className="px-5 py-4">Description</th>
              <th className="px-5 py-4">Created</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-sm text-slate-500">
                  {emptyState}
                </td>
              </tr>
            )}
            {items.map((item) => {
              const isEditing = editId === item.id;
              return (
                <tr key={item.id} className="border-t border-slate-200 align-top">
                  <td className="px-5 py-4">
                    {isEditing ? (
                      <input
                        value={editForm.name}
                        onChange={(event) =>
                          setEditForm((prev) => ({ ...prev, name: event.target.value }))
                        }
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-slate-800">
                        {item.name || `Untitled ${singularLabel}`}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {isEditing ? (
                      <input
                        value={editForm.slug}
                        onChange={(event) =>
                          setEditForm((prev) => ({ ...prev, slug: event.target.value }))
                        }
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                      />
                    ) : (
                      item.slug || '—'
                    )}
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {isEditing ? (
                      <textarea
                        value={editForm.description}
                        onChange={(event) =>
                          setEditForm((prev) => ({ ...prev, description: event.target.value }))
                        }
                        className="min-h-[80px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                      />
                    ) : (
                      item.description ? item.description.slice(0, 120) : '—'
                    )}
                  </td>
                  <td className="px-5 py-4 text-slate-600">{formatDate(item.created_at)}</td>
                  <td className="px-5 py-4 text-right">
                    {isEditing ? (
                      <div className="flex items-center justify-end gap-2">
                        {optionsEndpoint && (
                          <select
                            value={editForm.type_id || ''}
                            onChange={(event) =>
                              setEditForm((prev) => ({ ...prev, type_id: event.target.value }))
                            }
                            className="mr-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                          >
                            <option value="">Type</option>
                            {types.map((type) => (
                              <option key={type.id} value={type.id}>
                                {type.name}
                              </option>
                            ))}
                          </select>
                        )}
                        <LoadingButton
                          type="button"
                          isLoading={editLoading}
                          onClick={handleEdit}
                          className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
                        >
                          Save
                        </LoadingButton>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        {optionsEndpoint && (
                          <button
                            type="button"
                            onClick={() => startOptions(item)}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                          >
                            <span>Options</span>
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 5v14" />
                              <path d="M5 12h14" />
                            </svg>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-200 text-rose-500 hover:bg-rose-50"
                          aria-label={`Delete ${singularLabel}`}
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18" />
                            <path d="M8 6V4h8v2" />
                            <path d="M6 6l1 14h10l1-14" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                    {editError && isEditing && (
                      <p className="mt-2 text-xs text-rose-500">{editError}</p>
                    )}
                    {editSuccess && !isEditing && (
                      <p className="mt-2 text-xs text-emerald-600">{editSuccess}</p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {deleteLoadingId && (
          <div className="px-5 py-3 text-xs text-slate-400">Deleting...</div>
        )}
      </div>

      {optionsEndpoint && activeItem && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Attribute options
              </p>
              <h2 className="mt-2 text-lg font-semibold text-slate-900">
                {activeItem.name}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Add and edit available values for this attribute.
              </p>
            </div>
            <button
              type="button"
              onClick={() => startOptions(activeItem)}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              Add option
            </button>
          </div>

          <form onSubmit={handleCreateOption} className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr_180px]">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                Option name
              </label>
              <input
                value={optionForm.name}
                onChange={(event) => setOptionForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="e.g. Midnight Blue"
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                slug (optional)
              </label>
              <input
                value={optionForm.slug}
                onChange={(event) => setOptionForm((prev) => ({ ...prev, slug: event.target.value }))}
                placeholder="auto-generated if empty"
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                Color
              </label>
              <ColorPicker
                value={optionForm.color_hex}
                onChange={(value) => setOptionForm((prev) => ({ ...prev, color_hex: value }))}
                disabled={!isColorAttribute}
                showSwatches={isColorAttribute}
                showTextInput={isColorAttribute}
                swatches={defaultSwatches}
                inputClassName={`mt-2 h-12 w-full rounded-2xl border border-slate-200 p-1 ${
                  !isColorAttribute ? 'opacity-40' : ''
                }`}
                textInputClassName="mt-3 w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs text-slate-700"
              />
            </div>
            <div className="md:col-span-3 flex flex-wrap items-center gap-3">
              <LoadingButton
                type="submit"
                isLoading={optionCreateLoading}
                className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white"
              >
                Create option
              </LoadingButton>
              {optionCreateError && <span className="text-xs text-rose-500">{optionCreateError}</span>}
            </div>
          </form>

          {optionsError && (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {optionsError}
            </div>
          )}

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                <tr>
                  <th className="px-4 py-3">Option</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Color</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {optionsLoading && (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-sm text-slate-500">
                      Loading options...
                    </td>
                  </tr>
                )}
                {!optionsLoading && options.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-sm text-slate-500">
                      No options yet.
                    </td>
                  </tr>
                )}
                {options.map((option) => {
                  const isOptionEditing = optionEditId === option.id;
                  return (
                    <tr key={option.id} className="border-t border-slate-200">
                      <td className="px-4 py-3">
                        {isOptionEditing ? (
                          <input
                            value={optionEditForm.name}
                            onChange={(event) =>
                              setOptionEditForm((prev) => ({ ...prev, name: event.target.value }))
                            }
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                          />
                        ) : (
                          <span className="text-sm font-semibold text-slate-800">{option.name}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {isOptionEditing ? (
                          <input
                            value={optionEditForm.slug}
                            onChange={(event) =>
                              setOptionEditForm((prev) => ({ ...prev, slug: event.target.value }))
                            }
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                          />
                        ) : (
                          option.slug || '—'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isOptionEditing ? (
                          <div className="space-y-2">
                            <ColorPicker
                              value={optionEditForm.color_hex}
                              onChange={(value) =>
                                setOptionEditForm((prev) => ({ ...prev, color_hex: value }))
                              }
                              disabled={!isColorAttribute}
                              showSwatches={isColorAttribute}
                              showTextInput={isColorAttribute}
                              swatches={defaultSwatches}
                              inputClassName={`h-10 w-14 rounded-xl border border-slate-200 p-1 ${
                                !isColorAttribute ? 'opacity-40' : ''
                              }`}
                              textInputClassName="w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs text-slate-700"
                            />
                          </div>
                        ) : option.color_hex ? (
                          <div className="flex items-center gap-2">
                            <span
                              className="h-5 w-5 rounded-full border border-slate-200"
                              style={getSwatchStyle(option.color_hex)}
                            />
                            <span className="text-xs text-slate-500">{option.color_hex}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isOptionEditing ? (
                          <div className="flex items-center justify-end gap-2">
                            <LoadingButton
                              type="button"
                              isLoading={optionEditLoading}
                              onClick={handleOptionEdit}
                              className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
                            >
                              Save
                            </LoadingButton>
                            <button
                              type="button"
                              onClick={() => setOptionEditId(null)}
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleDeleteOption(option)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-200 text-rose-500 hover:bg-rose-50"
                              aria-label="Delete option"
                              disabled={optionDeleteLoadingId === option.id}
                            >
                              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18" />
                                <path d="M8 6V4h8v2" />
                                <path d="M6 6l1 14h10l1-14" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => startOptionEdit(option)}
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                            >
                              Edit
                            </button>
                          </div>
                        )}
                        {optionEditError && isOptionEditing && (
                          <p className="mt-2 text-xs text-rose-500">{optionEditError}</p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-slate-500">
        <button
          type="button"
          className="rounded-full border border-slate-200 px-3 py-1 font-semibold disabled:opacity-50"
          onClick={() => loadItems(Math.max(1, page - 1))}
          disabled={page <= 1 || loading}
        >
          Previous
        </button>
        <span>
          Page {page} of {pages}
        </span>
        <button
          type="button"
          className="rounded-full border border-slate-200 px-3 py-1 font-semibold disabled:opacity-50"
          onClick={() => loadItems(Math.min(pages, page + 1))}
          disabled={page >= pages || loading}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default TaxonomyManager;
