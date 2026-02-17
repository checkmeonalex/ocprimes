'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import LoadingButton from '@/components/LoadingButton'
import { useAlerts } from '@/context/AlertContext'

const PAGE_SIZE = 12

const emptyForm = { id: '', name: '', description: '' }

const formatDate = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function Sheet({ open, title, onClose, children, forceBottom = false }) {
  if (!open) return null
  return (
    <div
      className={`fixed inset-0 z-[90] bg-slate-900/40 [animation:tags-sheet-fade_220ms_ease-out] ${
        forceBottom ? 'p-0 sm:p-4' : 'p-3 sm:p-4'
      }`}
    >
      <div className={`mx-auto flex h-full w-full max-w-md items-end ${forceBottom ? '' : 'sm:items-center'}`}>
        <div
          className={`w-full overflow-hidden bg-white shadow-[0_30px_80px_rgba(15,23,42,0.26)] ${
            forceBottom
              ? 'h-[60dvh] rounded-t-3xl rounded-b-none [animation:tags-sheet-up_260ms_cubic-bezier(0.22,1,0.36,1)] sm:h-auto sm:rounded-3xl sm:[animation:tags-sheet-pop_220ms_ease-out]'
              : 'rounded-3xl [animation:tags-sheet-pop_220ms_ease-out]'
          }`}
        >
          <div className='flex items-center justify-between border-b border-slate-100 px-4 py-3'>
            <p className='text-sm font-semibold text-slate-900'>{title}</p>
            <button
              type='button'
              onClick={onClose}
              className='inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100'
              aria-label='Close'
            >
              <svg viewBox='0 0 24 24' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='2'>
              <path d='M6 6l12 12M18 6L6 18' strokeLinecap='round' />
            </svg>
          </button>
        </div>
          <div className={`${forceBottom ? 'max-h-[calc(60dvh-57px)] sm:max-h-[70vh]' : 'max-h-[70vh]'} overflow-y-auto px-4 py-4`}>
            {children}
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes tags-sheet-fade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes tags-sheet-up {
          from {
            transform: translateY(44px);
            opacity: 0.9;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes tags-sheet-pop {
          from {
            transform: translateY(10px) scale(0.985);
            opacity: 0.9;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}

export default function TagsCompactManager() {
  const { confirmAlert, pushAlert } = useAlerts()
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [error, setError] = useState('')

  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [actionOpen, setActionOpen] = useState(false)
  const [activeItem, setActiveItem] = useState(null)

  const canSave = form.name.trim().length >= 2

  const loadTags = useCallback(
    async (nextPage = page, nextQuery = query) => {
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({
          page: String(nextPage),
          per_page: String(PAGE_SIZE),
        })
        if (nextQuery.trim()) {
          params.set('search', nextQuery.trim())
        }
        const response = await fetch(`/api/admin/tags?${params.toString()}`, {
          method: 'GET',
          cache: 'no-store',
        })
        const payload = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(payload?.error || 'Unable to load tags.')
        }
        setItems(Array.isArray(payload?.items) ? payload.items : [])
        setPage(Number(payload?.page || nextPage) || 1)
        setPages(Number(payload?.pages || 1) || 1)
        setTotalCount(Number(payload?.total_count || 0) || 0)
      } catch (loadError) {
        setItems([])
        setError(loadError?.message || 'Unable to load tags.')
      } finally {
        setLoading(false)
      }
    },
    [page, query],
  )

  useEffect(() => {
    loadTags(1, '')
  }, [loadTags])

  const openCreate = () => {
    setForm(emptyForm)
    setCreateOpen(true)
  }

  const openEdit = (item) => {
    setForm({
      id: String(item?.id || ''),
      name: String(item?.name || ''),
      description: String(item?.description || ''),
    })
    setEditOpen(true)
    setActionOpen(false)
  }

  const submitCreate = async (event) => {
    event.preventDefault()
    if (!canSave || saving) return
    setSaving(true)
    try {
      const response = await fetch('/api/admin/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to create tag.')
      pushAlert({ type: 'success', title: 'Tags', message: 'Tag created.' })
      setCreateOpen(false)
      setForm(emptyForm)
      await loadTags(1, query)
    } catch (submitError) {
      pushAlert({ type: 'error', title: 'Tags', message: submitError?.message || 'Unable to create tag.' })
    } finally {
      setSaving(false)
    }
  }

  const submitEdit = async (event) => {
    event.preventDefault()
    if (!canSave || !form.id || saving) return
    setSaving(true)
    try {
      const response = await fetch('/api/admin/tags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: form.id,
          name: form.name.trim(),
          description: form.description.trim(),
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to update tag.')
      pushAlert({ type: 'success', title: 'Tags', message: 'Tag updated.' })
      setEditOpen(false)
      setActionOpen(false)
      await loadTags(page, query)
    } catch (submitError) {
      pushAlert({ type: 'error', title: 'Tags', message: submitError?.message || 'Unable to update tag.' })
    } finally {
      setSaving(false)
    }
  }

  const deleteTag = async (item) => {
    if (!item?.id) return
    const confirmed = await confirmAlert({
      type: 'warning',
      title: 'Delete tag?',
      message: `Delete "${item.name || 'this tag'}"?`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
    })
    if (!confirmed) return

    try {
      const response = await fetch('/api/admin/tags', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to delete tag.')
      pushAlert({ type: 'success', title: 'Tags', message: 'Tag deleted.' })
      setActionOpen(false)
      await loadTags(page, query)
    } catch (deleteError) {
      pushAlert({ type: 'error', title: 'Tags', message: deleteError?.message || 'Unable to delete tag.' })
    }
  }

  const onSearch = () => {
    const next = search.trim()
    setQuery(next)
    loadTags(1, next)
  }

  const headerHint = useMemo(() => `${totalCount} total · page ${page} of ${pages}`, [totalCount, page, pages])

  const groupedItems = useMemo(() => {
    const safeItems = Array.isArray(items) ? items : []
    const mine = safeItems.filter((item) => Boolean(item?.is_owner))
    const trending = safeItems.filter((item) => !item?.is_owner && Number(item?.usage_count || 0) > 0)
    const common = safeItems.filter((item) => !item?.is_owner && Number(item?.usage_count || 0) <= 0)
    return { mine, trending, common }
  }, [items])

  return (
    <div className='mx-auto w-full max-w-5xl'>
      <div className='flex items-center justify-between py-2'>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight text-slate-900'>Tags</h1>
          <p className='mt-1 text-sm text-slate-500'>Add keywords to help customers find your products faster.</p>
          <p className='mt-1 text-xs text-slate-500'>{headerHint}</p>
        </div>
        <button
          type='button'
          onClick={openCreate}
          className='inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.24)] transition hover:brightness-110'
          aria-label='Add tag'
        >
          <svg viewBox='0 0 24 24' className='h-5 w-5' fill='none' stroke='currentColor' strokeWidth='2.2'>
            <path d='M12 5v14M5 12h14' />
          </svg>
        </button>
      </div>

      <div className='mt-3 flex items-center gap-2'>
        <label className='inline-flex h-11 flex-1 items-center rounded-full border border-slate-200 bg-white px-3 text-sm text-slate-700'>
          <svg className='mr-2 h-4 w-4 text-slate-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
          </svg>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                onSearch()
              }
            }}
            placeholder='Search tags'
            className='w-full bg-transparent text-sm outline-none placeholder:text-slate-400'
          />
        </label>
        <button
          type='button'
          onClick={onSearch}
          className='rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50'
        >
          Go
        </button>
      </div>

      {error ? <p className='mt-3 text-sm text-rose-600'>{error}</p> : null}

      <div className='mt-3 overflow-hidden'>
        {loading ? (
          <ul className='space-y-3 py-2'>
            {Array.from({ length: 6 }).map((_, index) => (
              <li key={index} className='flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3'>
                <div className='min-w-0 flex-1'>
                  <div className='h-4 w-28 animate-pulse rounded-md bg-slate-200/85' />
                  <div className='mt-1.5 h-3 w-44 animate-pulse rounded-md bg-slate-200/70' />
                </div>
                <div className='h-9 w-9 animate-pulse rounded-full bg-slate-200/80' />
              </li>
            ))}
          </ul>
        ) : items.length ? (
          <div className='space-y-4'>
            {[
              { key: 'mine', title: 'Created by you', list: groupedItems.mine },
              { key: 'trending', title: 'Trending', list: groupedItems.trending },
              { key: 'common', title: 'Others', list: groupedItems.common },
            ].map((section) =>
              section.list.length ? (
                <section key={section.key}>
                  <p className='text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400'>{section.title}</p>
                  <ul className='mt-2 space-y-2'>
                    {section.list.map((item) => (
                      <li key={item.id} className='flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3'>
                        <div className='min-w-0 flex-1'>
                          <p className='truncate text-sm font-semibold text-slate-900'>{item?.name || 'Untitled tag'}</p>
                          <p className='mt-0.5 truncate text-xs text-slate-500'>
                            /{item?.slug || '—'} · {formatDate(item?.created_at)}
                            {Number(item?.usage_count || 0) > 0 ? ` · ${item.usage_count} uses` : ''}
                          </p>
                        </div>
                        <button
                          type='button'
                          onClick={() => {
                            setActiveItem(item)
                            setActionOpen(true)
                          }}
                          className='inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50'
                          aria-label='Tag actions'
                        >
                          <svg viewBox='0 0 24 24' className='h-4 w-4' fill='currentColor'>
                            <circle cx='5' cy='12' r='1.8' />
                            <circle cx='12' cy='12' r='1.8' />
                            <circle cx='19' cy='12' r='1.8' />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null,
            )}
          </div>
        ) : (
          <p className='py-8 text-sm text-slate-500'>No tags found.</p>
        )}
      </div>

      <div className='mt-4 flex items-center justify-between text-xs text-slate-500'>
        <button
          type='button'
          className='rounded-full border border-slate-200 px-3 py-1.5 font-semibold disabled:cursor-not-allowed disabled:opacity-50'
          onClick={() => loadTags(Math.max(1, page - 1), query)}
          disabled={page <= 1 || loading}
        >
          Previous
        </button>
        <span>Page {page} of {pages}</span>
        <button
          type='button'
          className='rounded-full border border-slate-200 px-3 py-1.5 font-semibold disabled:cursor-not-allowed disabled:opacity-50'
          onClick={() => loadTags(Math.min(pages, page + 1), query)}
          disabled={page >= pages || loading}
        >
          Next
        </button>
      </div>

      <Sheet open={createOpen} title='Create tag' onClose={() => !saving && setCreateOpen(false)} forceBottom>
        <form onSubmit={submitCreate} className='space-y-3'>
          <label className='block'>
            <span className='text-xs font-semibold text-slate-600'>Name</span>
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              className='mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none'
              required
            />
          </label>
          <label className='block'>
            <span className='text-xs font-semibold text-slate-600'>Description (optional)</span>
            <textarea
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              className='mt-1 h-24 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none'
            />
          </label>
          <LoadingButton
            type='submit'
            isLoading={saving}
            disabled={!canSave}
            className='w-full rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60'
          >
            Create tag
          </LoadingButton>
        </form>
      </Sheet>

      <Sheet open={editOpen} title='Edit tag' onClose={() => !saving && setEditOpen(false)} forceBottom>
        <form onSubmit={submitEdit} className='space-y-3'>
          <label className='block'>
            <span className='text-xs font-semibold text-slate-600'>Name</span>
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              className='mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none'
              required
            />
          </label>
          <label className='block'>
            <span className='text-xs font-semibold text-slate-600'>Description (optional)</span>
            <textarea
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              className='mt-1 h-24 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none'
            />
          </label>
          <LoadingButton
            type='submit'
            isLoading={saving}
            disabled={!canSave}
            className='w-full rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60'
          >
            Save changes
          </LoadingButton>
        </form>
      </Sheet>

      <Sheet open={actionOpen} title={activeItem?.name || 'Tag'} onClose={() => setActionOpen(false)}>
        <div className='space-y-2'>
          <button
            type='button'
            onClick={() => openEdit(activeItem)}
            className='flex w-full items-center justify-between rounded-2xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
          >
            Edit
            <svg viewBox='0 0 24 24' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='1.8'>
              <path d='M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z' strokeLinecap='round' strokeLinejoin='round' />
              <path d='M14.06 4.94l3.75 3.75' strokeLinecap='round' strokeLinejoin='round' />
            </svg>
          </button>
          <button
            type='button'
            onClick={async () => {
              if (!activeItem?.slug) return
              await navigator.clipboard.writeText(activeItem.slug)
              pushAlert({ type: 'info', title: 'Tags', message: 'Slug copied.' })
              setActionOpen(false)
            }}
            className='flex w-full items-center justify-between rounded-2xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
          >
            Copy slug
            <svg viewBox='0 0 24 24' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='1.8'>
              <rect x='9' y='9' width='11' height='11' rx='2' />
              <path d='M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1' />
            </svg>
          </button>
          <button
            type='button'
            onClick={() => deleteTag(activeItem)}
            className='flex w-full items-center justify-between rounded-2xl border border-rose-200 px-3 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50'
          >
            Delete
            <svg viewBox='0 0 24 24' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='1.8'>
              <path d='M4 7h16' strokeLinecap='round' />
              <path d='M9 7V5h6v2' strokeLinecap='round' />
              <path d='M7 7l1 12h8l1-12' strokeLinecap='round' strokeLinejoin='round' />
            </svg>
          </button>
        </div>
      </Sheet>
    </div>
  )
}
