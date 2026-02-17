import { useCallback, useEffect, useMemo, useState } from 'react';

const ProductTagSelector = ({
  selectedTags = [],
  onSelectTags = () => {},
  tags = [],
  maxSelected = 12,
  isLoading = false,
  isLoadingMore = false,
  hasMore = false,
  errorMessage = '',
  onOpen = () => {},
  onLoadMore = null,
  onCreateTag = null,
  isCreatingTag = false,
  createTagError = '',
  className = '',
}) => {
  const PAGE_CHUNK = 15;
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isCreateConfirmOpen, setIsCreateConfirmOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_CHUNK);
  const normalizeId = (value) => String(value ?? '').trim();
  const normalizedSearch = String(searchTerm || '').trim().toLowerCase();

  const sortedTags = useMemo(() => {
    const items = Array.isArray(tags) ? [...tags] : [];
    return items.sort((a, b) => {
      const aOwner = a?.is_owner ? 1 : 0;
      const bOwner = b?.is_owner ? 1 : 0;
      if (aOwner !== bOwner) return bOwner - aOwner;
      const aCount = Number(a?.usage_count ?? a?.count ?? 0) || 0;
      const bCount = Number(b?.usage_count ?? b?.count ?? 0) || 0;
      if (aCount !== bCount) return bCount - aCount;
      return String(a?.name || '').localeCompare(String(b?.name || ''));
    });
  }, [tags]);

  const filteredTags = useMemo(() => {
    if (!searchTerm) return sortedTags;
    const term = searchTerm.toLowerCase();
    return sortedTags.filter((tag) =>
      (tag.name || '').toLowerCase().includes(term) ||
      (tag.slug || '').toLowerCase().includes(term)
    );
  }, [sortedTags, searchTerm]);

  const visibleTags = useMemo(
    () => filteredTags.slice(0, visibleCount),
    [filteredTags, visibleCount],
  );
  const hasLocalMore = visibleCount < filteredTags.length;

  const toggleTag = (tagId) => {
    const targetId = normalizeId(tagId);
    const isSelected = selectedTags.some((id) => normalizeId(id) === targetId);
    if (!isSelected && selectedTags.length >= maxSelected) {
      return;
    }
    const newSelection = isSelected
      ? selectedTags.filter((id) => normalizeId(id) !== targetId)
      : [...selectedTags, tagId];
    onSelectTags(newSelection);
  };

  const isTagSelected = (tagId) =>
    selectedTags.some((id) => normalizeId(id) === normalizeId(tagId));

  const selectedTagNames = useMemo(() => {
    const selectedSet = new Set(selectedTags.map((id) => normalizeId(id)));
    return tags
      .filter((tag) => selectedSet.has(normalizeId(tag.id)))
      .map((tag) => tag.name)
      .join(', ');
  }, [selectedTags, tags]);

  const canCreateFromSearch = useMemo(() => {
    if (!normalizedSearch) return false;
    const exactMatch = tags.some((tag) => {
      const name = String(tag?.name || '').trim().toLowerCase();
      const slug = String(tag?.slug || '').trim().toLowerCase();
      return name === normalizedSearch || slug === normalizedSearch;
    });
    return !exactMatch;
  }, [normalizedSearch, tags]);

  useEffect(() => {
    setVisibleCount(PAGE_CHUNK);
  }, [searchTerm, isOpen]);

  const tryLoadMore = useCallback(async () => {
    if (hasLocalMore) {
      setVisibleCount((prev) => prev + PAGE_CHUNK);
      return;
    }
    if (!hasMore || !onLoadMore || isLoadingMore || isLoading) return;
    await onLoadMore();
  }, [hasLocalMore, hasMore, isLoading, isLoadingMore, onLoadMore]);

  const handleListScroll = useCallback(
    (event) => {
      const target = event.currentTarget;
      if (!target) return;
      const distanceFromBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
      if (distanceFromBottom <= 80) {
        tryLoadMore();
      }
    },
    [tryLoadMore],
  );

  return (
    <div className={`relative w-full ${className}`}>
      <button
        type="button"
        onClick={() => {
          if (!isOpen) {
            onOpen();
          }
          setIsOpen((prev) => !prev);
        }}
        className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-left text-xs text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <div className="flex min-w-0 items-center justify-between gap-1">
          <span className={`min-w-0 max-w-[46%] truncate ${selectedTags.length > 0 ? 'text-slate-900' : 'text-slate-500'}`}>
            {selectedTags.length > 0
              ? `${selectedTags.length} tag${selectedTags.length !== 1 ? 's' : ''} selected`
              : 'Select tags...'}
          </span>
          <span className="min-w-0 flex-1 truncate px-1 text-right text-slate-500">
            {selectedTagNames || 'None selected'}
          </span>
          <svg
            className={`ml-1 h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center px-0 py-0 sm:items-center sm:px-4 sm:py-6">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            aria-label="Close tags"
          />
          <div className="relative z-10 flex w-full max-h-[86vh] min-h-0 flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white p-4 shadow-2xl sm:max-h-[calc(100vh-48px)] sm:max-w-2xl sm:rounded-[28px] sm:p-5">
            <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-slate-200 sm:hidden" />
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                  Tags
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">Select product tags</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Maximum {maxSelected} tags
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500"
              >
                Done
              </button>
            </div>

            <div className="mt-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search or create tag..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 py-2 pl-8 pr-10 text-xs text-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500"
                />
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg
                    className="h-4 w-4 text-slate-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                {canCreateFromSearch ? (
                  <button
                    type="button"
                    onClick={() => setIsCreateConfirmOpen(true)}
                    className="absolute inset-y-0 right-1.5 my-auto inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                    aria-label="Create tag from search"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                    </svg>
                  </button>
                ) : null}
              </div>
              {createTagError ? (
                <p className="mt-1 text-[11px] text-rose-600">{createTagError}</p>
              ) : null}
            </div>

            <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1" onScroll={handleListScroll}>
              {isLoading && (
                <div className="rounded-2xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-500">
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                    Loading tags...
                  </span>
                </div>
              )}

              {!isLoading && errorMessage && (
                <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50/60 px-3 py-6 text-center text-xs text-rose-500">
                  {errorMessage}
                </div>
              )}

              {!isLoading && !errorMessage && (
                <div className="space-y-1">
                  {visibleTags.map((tag) => {
                    const selected = isTagSelected(tag.id);
                    return (
                    <label
                      key={tag.id}
                      className={`flex items-center rounded-2xl border px-3 py-2 transition ${
                        selected
                          ? 'border-emerald-200 bg-emerald-50/70'
                          : 'border-transparent hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleTag(tag.id)}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span
                        className={`ml-2 block truncate text-xs font-medium ${
                          selected ? 'text-emerald-700' : 'text-slate-700'
                        }`}
                      >
                        {tag.name}
                      </span>
                      {(tag.count !== undefined || tag.usage_count !== undefined) && (
                        <span className={`ml-auto text-xs ${selected ? 'text-emerald-600' : 'text-slate-500'}`}>
                          {Number(tag.usage_count ?? tag.count ?? 0) || 0}
                        </span>
                      )}
                    </label>
                    );
                  })}
                </div>
              )}
              {!isLoading && !errorMessage && (hasLocalMore || hasMore || isLoadingMore) && (
                <div className="mt-3 flex justify-center pb-1">
                  {isLoadingMore ? (
                    <span className="inline-flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                      Loading more tags...
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={tryLoadMore}
                      className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Load more
                    </button>
                  )}
                </div>
              )}
              {!isLoading && !errorMessage && selectedTags.length >= maxSelected && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
                  Maximum {maxSelected} tags selected.
                </div>
              )}

              {!isLoading && !errorMessage && filteredTags.length === 0 && searchTerm && (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-500">
                  No tags found for "{searchTerm}"
                </div>
              )}

              {!isLoading && !errorMessage && tags.length === 0 && !searchTerm && (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-500">
                  No tags available
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {isCreateConfirmOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-3">
          <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-2xl">
            <p className="text-sm font-semibold text-slate-900">Create tag?</p>
            <p className="mt-1 text-xs text-slate-600">
              "{searchTerm.trim()}" is not in the list. Create this tag now?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreateConfirmOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!canCreateFromSearch || !onCreateTag || isCreatingTag}
                onClick={async () => {
                  if (!onCreateTag || !canCreateFromSearch) return;
                  const created = await onCreateTag(searchTerm.trim());
                  if (created) {
                    setSearchTerm('');
                    setIsCreateConfirmOpen(false);
                  }
                }}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreatingTag ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ProductTagSelector;
