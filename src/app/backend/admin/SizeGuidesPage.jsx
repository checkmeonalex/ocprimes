'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createSizeGuide, deleteSizeGuide, fetchSizeGuides, updateSizeGuide } from './products/functions/sizeGuides'
import AdminShell from '@/components/admin/AdminShell'
import { useAlerts } from '@/context/AlertContext'
import { Plus, Ruler, Trash2, X } from 'lucide-react'

const emptyColumn = () => ({ key: `col_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`, label: '' })

const blankDraft = () => ({
  id: null,
  name: '',
  unit_toggle: false,
  columns: [
    { key: 'size', label: 'Size' },
    { key: 'chest', label: 'Chest' },
    { key: 'waist', label: 'Waist' },
  ],
  rows: [{}, {}],
  how_to_measure: '',
  notes: '',
  visibility: 'public',
})

function SizeGuideEditor({ draft, onChange, onCancel, onSave, isSaving, error, isAdmin, readOnly }) {
  const updateField = (key, value) => onChange({ ...draft, [key]: value })

  const updateColumnLabel = (index, label) => {
    const columns = draft.columns.map((col, i) => (i === index ? { ...col, label } : col))
    onChange({ ...draft, columns })
  }

  const addColumn = () => {
    onChange({ ...draft, columns: [...draft.columns, emptyColumn()] })
  }

  const removeColumn = (index) => {
    const removedKey = draft.columns[index]?.key
    const columns = draft.columns.filter((_, i) => i !== index)
    const rows = draft.rows.map((row) => {
      const next = { ...row }
      delete next[removedKey]
      return next
    })
    onChange({ ...draft, columns, rows })
  }

  const updateCell = (rowIndex, columnKey, value) => {
    const rows = draft.rows.map((row, i) => (i === rowIndex ? { ...row, [columnKey]: value } : row))
    onChange({ ...draft, rows })
  }

  const addRow = () => onChange({ ...draft, rows: [...draft.rows, {}] })

  const removeRow = (index) => onChange({ ...draft, rows: draft.rows.filter((_, i) => i !== index) })

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onCancel}>
      <div
        className="flex h-full w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl dark:bg-[#000000]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            {readOnly ? 'Preview size guide' : draft.id ? 'Edit size guide' : 'New size guide'}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {readOnly && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400">
              This is a public size guide published by the platform. It's read-only here — you can use it, but only an admin can edit it.
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-zinc-400">
              Name
            </label>
            <input
              type="text"
              value={draft.name}
              onChange={(event) => updateField('name', event.target.value)}
              placeholder="e.g. Men's Shirts (UK/US/EU)"
              disabled={readOnly}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 disabled:bg-slate-50 disabled:text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-white dark:disabled:bg-white/[0.02]"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={draft.unit_toggle}
              onChange={(event) => updateField('unit_toggle', event.target.checked)}
              disabled={readOnly}
              className="h-4 w-4 rounded border-slate-300"
            />
            Show an IN / CM unit toggle on the storefront
          </label>

          {readOnly ? null : isAdmin ? (
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={draft.visibility !== 'private'}
                onChange={(event) => updateField('visibility', event.target.checked ? 'public' : 'private')}
                className="h-4 w-4 rounded border-slate-300"
              />
              Make public (visible to all vendors by default)
            </label>
          ) : (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400">
              This guide stays private to your store. Only admins can publish a size guide for all vendors.
            </p>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600 dark:text-zinc-400">Table</span>
              {!readOnly && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={addColumn}
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5"
                  >
                    + Column
                  </button>
                  <button
                    type="button"
                    onClick={addRow}
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5"
                  >
                    + Row
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-white/10">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-white/5">
                    {draft.columns.map((col, index) => (
                      <th key={col.key} className="border-b border-slate-200 p-1.5 dark:border-white/10">
                        <div className="flex items-center gap-1">
                          <input
                            value={col.label}
                            onChange={(event) => updateColumnLabel(index, event.target.value)}
                            placeholder="Label"
                            disabled={readOnly}
                            className="w-full min-w-[70px] rounded border border-transparent bg-transparent px-1.5 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-slate-300 disabled:text-slate-500 dark:text-zinc-200"
                          />
                          {!readOnly && draft.columns.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeColumn(index)}
                              className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-red-600 dark:hover:bg-white/10"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </th>
                    ))}
                    {!readOnly && <th className="w-8 border-b border-slate-200 dark:border-white/10" />}
                  </tr>
                </thead>
                <tbody>
                  {draft.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="odd:bg-white even:bg-slate-50/50 dark:odd:bg-transparent dark:even:bg-white/[0.03]">
                      {draft.columns.map((col) => (
                        <td key={col.key} className="border-b border-slate-100 p-1 dark:border-white/5">
                          <input
                            value={row[col.key] || ''}
                            onChange={(event) => updateCell(rowIndex, col.key, event.target.value)}
                            disabled={readOnly}
                            className="w-full min-w-[60px] rounded border border-transparent bg-transparent px-1.5 py-1 text-sm text-slate-700 outline-none focus:border-slate-300 disabled:text-slate-500 dark:text-zinc-200"
                          />
                        </td>
                      ))}
                      {!readOnly && (
                        <td className="border-b border-slate-100 p-1 text-center dark:border-white/5">
                          <button
                            type="button"
                            onClick={() => removeRow(rowIndex)}
                            className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-red-600 dark:hover:bg-white/10"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-zinc-400">
              How to measure (optional)
            </label>
            <textarea
              value={draft.how_to_measure}
              onChange={(event) => updateField('how_to_measure', event.target.value)}
              rows={3}
              placeholder="e.g. Chest: measure around the fullest part of your chest, keeping the tape level."
              disabled={readOnly}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 disabled:bg-slate-50 disabled:text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-white dark:disabled:bg-white/[0.02]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-zinc-400">
              Notes (optional)
            </label>
            <textarea
              value={draft.notes}
              onChange={(event) => updateField('notes', event.target.value)}
              rows={2}
              placeholder="e.g. Hassle-free returns: if it doesn't fit, we'll replace it or refund you."
              disabled={readOnly}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 disabled:bg-slate-50 disabled:text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-white dark:disabled:bg-white/[0.02]"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-white/10">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5"
          >
            {readOnly ? 'Close' : 'Cancel'}
          </button>
          {!readOnly && (
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving || !draft.name.trim()}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900"
            >
              {isSaving ? 'Saving…' : draft.id ? 'Save changes' : 'Create size guide'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SizeGuidesPage() {
  const { confirmAlert, pushAlert } = useAlerts()
  const [role, setRole] = useState('unknown')
  const [guides, setGuides] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const isAdmin = role === 'admin'
  const isVendor = role === 'vendor'

  useEffect(() => {
    let active = true
    const loadRole = async () => {
      try {
        const response = await fetch('/api/auth/role', {
          method: 'GET',
          cache: 'no-store',
          credentials: 'include',
        })
        const payload = await response.json().catch(() => null)
        if (!active) return
        if (!response.ok) {
          setRole('unknown')
          return
        }
        setRole(payload?.role === 'admin' || payload?.role === 'vendor' ? payload.role : 'unknown')
      } catch {
        if (active) setRole('unknown')
      }
    }
    void loadRole()
    return () => {
      active = false
    }
  }, [])

  const loadGuides = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const items = await fetchSizeGuides({ search })
      setGuides(items)
    } catch (error) {
      setLoadError(error.message || 'Unable to load size guides.')
    } finally {
      setIsLoading(false)
    }
  }, [search])

  useEffect(() => {
    loadGuides()
  }, [loadGuides])

  const filteredGuides = useMemo(() => guides, [guides])

  const openCreate = () => {
    setSaveError('')
    setDraft(blankDraft())
  }

  const openEdit = (guide) => {
    setSaveError('')
    setDraft({
      id: guide.id,
      name: guide.name || '',
      unit_toggle: Boolean(guide.unit_toggle),
      columns: Array.isArray(guide.columns) && guide.columns.length ? guide.columns : blankDraft().columns,
      rows: Array.isArray(guide.rows) ? guide.rows : [],
      how_to_measure: guide.how_to_measure || '',
      notes: guide.notes || '',
      visibility: guide.visibility === 'private' ? 'private' : 'public',
      readOnly: !guide.can_edit,
    })
  }

  const closeEditor = () => {
    setDraft(null)
    setSaveError('')
  }

  const handleSave = async () => {
    if (!draft?.name?.trim() || draft.readOnly) return
    setIsSaving(true)
    setSaveError('')
    try {
      const columns = draft.columns.filter((col) => col.label.trim())
      if (!columns.length) {
        throw new Error('Add at least one column.')
      }
      const payload = {
        name: draft.name.trim(),
        unit_toggle: draft.unit_toggle,
        columns,
        rows: draft.rows,
        how_to_measure: draft.how_to_measure || undefined,
        notes: draft.notes || undefined,
        ...(isAdmin ? { visibility: draft.visibility === 'private' ? 'private' : 'public' } : {}),
      }
      if (draft.id) {
        await updateSizeGuide({ id: draft.id, ...payload })
      } else {
        await createSizeGuide(payload)
      }
      closeEditor()
      loadGuides()
    } catch (error) {
      setSaveError(error.message || 'Unable to save size guide.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (guide) => {
    const confirmed = await confirmAlert({
      title: 'Delete size guide?',
      message: `"${guide.name}" will be permanently deleted. Products or categories still using it must be unassigned first.`,
      confirmLabel: 'Delete',
      type: 'danger',
    })
    if (!confirmed) return
    try {
      await deleteSizeGuide(guide.id)
      loadGuides()
    } catch (error) {
      pushAlert({ type: 'error', message: error.message || 'Unable to delete size guide.' })
    }
  }

  return (
    <AdminShell>
      <div className="mx-auto max-w-4xl py-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Size Guides</h1>
            <p className="text-sm text-slate-500 dark:text-zinc-400">
              Build measurement charts and attach them to categories or individual products.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
          >
            <Plus size={16} />
            New guide
          </button>
        </div>

        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search size guides…"
          className="mb-4 w-full max-w-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
        />

        {loadError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
            {loadError}
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-slate-500 dark:text-zinc-400">Loading…</p>
        ) : filteredGuides.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center dark:border-white/10">
            <Ruler className="mx-auto mb-2 text-slate-400" size={22} />
            <p className="text-sm text-slate-500 dark:text-zinc-400">No size guides yet.</p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {filteredGuides.map((guide) => {
              const isShared = guide.visibility !== 'private'
              return (
                <div
                  key={guide.id}
                  className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-slate-300 dark:border-white/10 dark:bg-white/5"
                >
                  <button type="button" onClick={() => openEdit(guide)} className="min-w-0 flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{guide.name}</p>
                      {isVendor && (
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            isShared
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-zinc-300'
                          }`}
                        >
                          {isShared ? 'Public' : 'Mine'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                      {(guide.columns || []).length} columns · {(guide.rows || []).length} rows
                    </p>
                  </button>
                  {guide.can_edit && (
                    <button
                      type="button"
                      onClick={() => handleDelete(guide)}
                      className="ml-2 shrink-0 rounded-md p-1.5 text-slate-400 opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-950/40"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {draft && (
        <SizeGuideEditor
          draft={draft}
          onChange={setDraft}
          onCancel={closeEditor}
          onSave={handleSave}
          isSaving={isSaving}
          error={saveError}
          isAdmin={isAdmin}
          readOnly={Boolean(draft.readOnly)}
        />
      )}
    </AdminShell>
  )
}
