import { useMemo, useState } from 'react';

const ProductTagSelector = ({
  selectedTags = [],
  onSelectTags = () => {},
  tags = [],
  maxSelected = 12,
  isLoading = false,
  errorMessage = '',
  onOpen = () => {},
  className = '',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const normalizeId = (value) => String(value ?? '').trim();

  const filteredTags = useMemo(() => {
    if (!searchTerm) return tags;
    const term = searchTerm.toLowerCase();
    return tags.filter((tag) =>
      (tag.name || '').toLowerCase().includes(term) ||
      (tag.slug || '').toLowerCase().includes(term)
    );
  }, [tags, searchTerm]);

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
        <div className="flex items-center justify-between">
          <span className={selectedTags.length > 0 ? 'text-slate-900' : 'text-slate-500'}>
            {selectedTags.length > 0
              ? `${selectedTags.length} tag${selectedTags.length !== 1 ? 's' : ''} selected`
              : 'Select tags...'}
          </span>
          <span className="text-slate-500 truncate max-w-[50%]">
            {selectedTagNames || 'None selected'}
          </span>
          <svg
            className={`ml-2 h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
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
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-6">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            aria-label="Close tags"
          />
          <div className="relative z-10 w-full max-w-2xl max-h-[calc(100vh-48px)] overflow-y-auto rounded-[28px] border border-slate-200 bg-white p-5 shadow-2xl">
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
                  placeholder="Search tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs text-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500"
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-2">
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
              </div>
            </div>

            {isLoading && (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-500">
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                  Loading tags...
                </span>
              </div>
            )}

            {!isLoading && errorMessage && (
              <div className="mt-4 rounded-2xl border border-dashed border-rose-200 bg-rose-50/60 px-3 py-6 text-center text-xs text-rose-500">
                {errorMessage}
              </div>
            )}

            {!isLoading && !errorMessage && (
              <div className="mt-4 space-y-1">
                {filteredTags.map((tag) => {
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
                    {tag.count !== undefined && (
                      <span className={`ml-auto text-xs ${selected ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {tag.count}
                      </span>
                    )}
                  </label>
                  );
                })}
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
      )}
    </div>
  );
};

export default ProductTagSelector;
