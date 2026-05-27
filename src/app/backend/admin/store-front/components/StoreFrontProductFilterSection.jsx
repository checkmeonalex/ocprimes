import { useEffect, useMemo, useRef, useState } from 'react'

const FILTER_MODES = [
  { id: 'category', label: 'Categories' },
  { id: 'tag', label: 'Tags' },
]
const MAX_TITLE_CHARS = 80
const MODAL_PAGE_SIZE = 10

const normalizeOptions = (options = []) =>
  (Array.isArray(options) ? options : [])
    .map((item) => ({
      id: String(item?.id || '').trim(),
      name: String(item?.name || '').trim(),
      slug: String(item?.slug || '').trim(),
    }))
    .filter((item) => item.id && item.name)

export default function StoreFrontProductFilterSection({
  isLoading,
  brand,
  selectedMode,
  onChangeMode,
  onToggleOption,
  customTitleValue,
  onCustomTitleChange,
  onSaveCustomTitle,
  isSavingCustomTitle,
  productLimitValue,
  onProductLimitChange,
  onSaveProductLimit,
  isSavingProductLimit,
  isSaving,
}) {
  const options = brand?.storefront_filter_options || { categories: [], tags: [] }
  const categories = normalizeOptions(options.categories)
  const tags = normalizeOptions(options.tags)
  const activeList = selectedMode === 'tag' ? tags : categories
  const selectedIds = new Set(
    (
      selectedMode === 'tag'
        ? brand?.storefront_filter_tag_ids
        : brand?.storefront_filter_category_ids
    ) || [],
  )
  const previewItems = activeList.slice(0, MODAL_PAGE_SIZE)
  const shouldShowSeeAll = activeList.length > MODAL_PAGE_SIZE
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isAllModalOpen, setIsAllModalOpen] = useState(false)
  const [modalVisibleCount, setModalVisibleCount] = useState(MODAL_PAGE_SIZE)
  const [isAppendingModalItems, setIsAppendingModalItems] = useState(false)
  const modalScrollRef = useRef(null)
  const previewTitle = String(customTitleValue || '').trim() || 'Most Popular'
  const titleChars = String(customTitleValue || '').length
  const visibleModalItems = useMemo(
    () => activeList.slice(0, modalVisibleCount),
    [activeList, modalVisibleCount],
  )

  useEffect(() => {
    if (!isAllModalOpen) return undefined
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsAllModalOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isAllModalOpen])

  useEffect(() => {
    if (!isAllModalOpen) return
    setModalVisibleCount(MODAL_PAGE_SIZE)
    setIsAppendingModalItems(false)
    const node = modalScrollRef.current
    if (node) node.scrollTop = 0
  }, [isAllModalOpen, selectedMode])

  const handleOpenAllModal = () => {
    if (!shouldShowSeeAll) return
    setIsAllModalOpen(true)
  }

  const handleModalScroll = () => {
    const node = modalScrollRef.current
    if (!node || isAppendingModalItems) return
    const nearBottom = node.scrollTop + node.clientHeight >= node.scrollHeight - 20
    if (!nearBottom || modalVisibleCount >= activeList.length) return

    setIsAppendingModalItems(true)
    window.setTimeout(() => {
      setModalVisibleCount((prev) => Math.min(prev + MODAL_PAGE_SIZE, activeList.length))
      setIsAppendingModalItems(false)
    }, 220)
  }

  return (
    <section className="border-t border-slate-200 pt-6">
      {isLoading ? (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="h-6 w-36 animate-pulse rounded-md bg-slate-200/85" />
              <div className="h-4 w-72 animate-pulse rounded-md bg-slate-200/70" />
            </div>
            <div className="h-8 w-20 animate-pulse rounded-full bg-slate-200/80" />
          </div>
          <div className="h-10 w-44 animate-pulse rounded-full bg-slate-200/80" />
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="h-5 w-40 animate-pulse rounded-md bg-slate-200/80" />
            <div className="mt-3 flex flex-wrap gap-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-9 w-24 animate-pulse rounded-full bg-slate-200/75" />
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="h-3 w-44 animate-pulse rounded-md bg-slate-200/80" />
            <div className="mt-2 h-10 w-40 animate-pulse rounded-lg bg-slate-200/75" />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Star Product</h3>
              <p className="mt-1 text-sm text-slate-500">
                Choose what shoppers can filter by on your storefront: categories or tags from products you have already used.
              </p>
            </div>
            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
              Storefront
            </span>
          </div>

          <div className="inline-flex rounded-full border border-slate-200 bg-white p-1">
            {FILTER_MODES.map((mode) => {
              const isActive = selectedMode === mode.id
              return (
                <button
                  key={mode.id}
                  type="button"
                  disabled={isSaving || !brand}
                  onClick={() => onChangeMode(mode.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {mode.label}
                </button>
              )
            })}
          </div>

          {!brand ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              No brand linked yet. Assign a brand first to configure product filters.
            </p>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 whitespace-nowrap">
                  <p className="text-lg font-semibold text-slate-900">{previewTitle}</p>
                  <button
                    type="button"
                    disabled={!brand || isSaving || isSavingCustomTitle}
                    onClick={() => setIsEditingTitle((prev) => !prev)}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label="Edit section name"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2">
                      <path d="M12 20h9" strokeLinecap="round" />
                      <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L8 18l-4 1 1-4 11.5-11.5z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </span>
                {shouldShowSeeAll ? (
                  <button
                    type="button"
                    className="text-sm font-semibold text-slate-700 hover:text-slate-900"
                    onClick={handleOpenAllModal}
                  >
                    See all
                  </button>
                ) : null}
              </div>
              {isEditingTitle ? (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={customTitleValue}
                      onChange={(event) => onCustomTitleChange(event.target.value)}
                      placeholder="Most Popular"
                      maxLength={MAX_TITLE_CHARS}
                      disabled={!brand || isSaving || isSavingCustomTitle}
                      className="h-10 min-w-[220px] flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={onSaveCustomTitle}
                      disabled={!brand || isSaving || isSavingCustomTitle}
                      className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSavingCustomTitle ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {titleChars}/{MAX_TITLE_CHARS} characters
                  </p>
                </div>
              ) : null}

              {activeList.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {previewItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      disabled={isSaving || !brand}
                      onClick={() => onToggleOption(item.id)}
                      className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
                        selectedIds.has(item.id)
                          ? 'bg-slate-900 text-white'
                          : 'border border-slate-300 bg-white text-slate-900'
                      }`}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500">
                  No {selectedMode === 'tag' ? 'tags' : 'categories'} found from your previous products.
                </p>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Products to show before catalog
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                type="number"
                min={1}
                max={48}
                value={productLimitValue}
                onChange={(event) => onProductLimitChange(event.target.value)}
                disabled={!brand || isSaving || isSavingProductLimit}
                className="h-10 w-24 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <button
                type="button"
                onClick={onSaveProductLimit}
                disabled={!brand || isSaving || isSavingProductLimit}
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingProductLimit ? 'Saving...' : 'Save count'}
              </button>
            </div>
          </div>
        </div>
      )}
      {isAllModalOpen ? (
        <div className="fixed inset-0 z-[95] flex items-end justify-center bg-slate-900/45 p-0 sm:items-center sm:p-4">
          <div className="w-full overflow-hidden rounded-t-3xl bg-white shadow-[0_30px_80px_rgba(15,23,42,0.26)] sm:max-w-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">
                {selectedMode === 'tag' ? 'All tags' : 'All categories'}
              </p>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100"
                onClick={() => setIsAllModalOpen(false)}
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div
              ref={modalScrollRef}
              onScroll={handleModalScroll}
              className="max-h-[70dvh] overflow-y-auto px-4 py-4 sm:max-h-[70vh]"
            >
              <div className="flex flex-wrap gap-2">
                {visibleModalItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={isSaving || !brand}
                    onClick={() => onToggleOption(item.id)}
                    className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
                      selectedIds.has(item.id)
                        ? 'bg-slate-900 text-white'
                        : 'border border-slate-300 bg-white text-slate-900'
                    }`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
              {isAppendingModalItems ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {Array.from({ length: MODAL_PAGE_SIZE }).map((_, index) => (
                    <span
                      key={`modal-skeleton-${index}`}
                      className="h-10 w-24 animate-pulse rounded-full bg-slate-200/80"
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
