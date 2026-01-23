import { useState, useMemo } from 'react';

const ProductCategorySelector = ({
  selectedCategories = [],
  onSelectCategories = () => {},
  categories = [],
  frequentlyUsedCategories = [],
  maxTopCategories = 10,
  isLoading = false,
  errorMessage = '',
  onOpen = () => {},
  className = '',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [navPath, setNavPath] = useState([]);
  
  const treeNodes = useMemo(() => {
    const map = new Map();
    categories.forEach((cat) => {
      map.set(cat.id, { ...cat, children: [] });
    });
    const roots = [];
    map.forEach((node) => {
      if (node.parent_id && map.has(node.parent_id)) {
        map.get(node.parent_id).children.push(node);
      } else {
        roots.push(node);
      }
    });
    const sortNodes = (list) => {
      list.sort((a, b) => a.name.localeCompare(b.name));
      list.forEach((child) => sortNodes(child.children));
    };
    sortNodes(roots);
    return { map, roots };
  }, [categories]);

  const breadcrumb = useMemo(() => {
    if (!navPath.length) return 'All Categories';
    return navPath
      .map((id) => treeNodes.map.get(id)?.name)
      .filter(Boolean)
      .join(' > ');
  }, [navPath, treeNodes.map]);

  const currentNodes = useMemo(() => {
    if (!navPath.length) return treeNodes.roots;
    const active = treeNodes.map.get(navPath[navPath.length - 1]);
    return active?.children || [];
  }, [navPath, treeNodes]);

  const flattenedWithPath = useMemo(() => {
    const parents = new Map(categories.map((cat) => [cat.id, cat.parent_id]));
    const names = new Map(categories.map((cat) => [cat.id, cat.name]));
    const buildPath = (id) => {
      const parts = [];
      let cursor = id;
      while (cursor) {
        const name = names.get(cursor);
        if (name) parts.unshift(name);
        cursor = parents.get(cursor);
      }
      return parts.join(' > ');
    };
    return categories.map((cat) => ({
      ...cat,
      breadcrumb: buildPath(cat.id),
    }));
  }, [categories]);

  const filteredNodes = useMemo(() => {
    if (!searchTerm) return currentNodes;
    const term = searchTerm.toLowerCase();
    return flattenedWithPath.filter((cat) => {
      const name = (cat.name || '').toLowerCase();
      const slug = (cat.slug || '').toLowerCase();
      const crumb = (cat.breadcrumb || '').toLowerCase();
      return name.includes(term) || slug.includes(term) || crumb.includes(term);
    });
  }, [currentNodes, flattenedWithPath, searchTerm]);

  const toggleCategory = (categoryId) => {
    const newSelection = selectedCategories.includes(categoryId)
      ? selectedCategories.filter(id => id !== categoryId)
      : [...selectedCategories, categoryId];
    
    onSelectCategories(newSelection);
  };

  const toggleAllInGroup = (groupCategories) => {
    const allSelected = groupCategories.every(cat => selectedCategories.includes(cat.id));
    
    if (allSelected) {
      // Deselect all
      const newSelection = selectedCategories.filter(id => 
        !groupCategories.some(cat => cat.id === id)
      );
      onSelectCategories(newSelection);
    } else {
      // Select all that aren't already selected
      const idsToAdd = groupCategories
        .filter(cat => !selectedCategories.includes(cat.id))
        .map(cat => cat.id);
      onSelectCategories([...selectedCategories, ...idsToAdd]);
    }
  };

  const isCategorySelected = (categoryId) => selectedCategories.includes(categoryId);

  const selectedCategoryNames = useMemo(() => {
    return categories
      .filter(cat => selectedCategories.includes(cat.id))
      .map(cat => cat.name)
      .join(', ');
  }, [selectedCategories, categories]);

  return (
    <div className={`relative w-full ${className}`}>
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => {
            const next = !prev;
            if (next) {
              onOpen();
            }
            return next;
          });
        }}
        className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-left text-xs text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <div className="flex items-center justify-between">
          <span className={selectedCategories.length > 0 ? 'text-slate-900' : 'text-slate-500'}>
            {selectedCategories.length > 0 
              ? `${selectedCategories.length} category${selectedCategories.length !== 1 ? 'ies' : ''} selected`
              : 'Select categories...'}
          </span>
          <span className="text-slate-500 truncate max-w-[50%]">
            {selectedCategoryNames || 'None selected'}
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
            aria-label="Close categories"
          />
          <div className="relative z-10 w-full max-w-2xl max-h-[calc(100vh-48px)] overflow-y-auto rounded-[28px] border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                  Categories
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">Select product categories</p>
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
                  placeholder="Search categories..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    if (e.target.value) {
                      setNavPath([]);
                    }
                  }}
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
                  Loading categories...
                </span>
              </div>
            )}

            {!isLoading && errorMessage && (
              <div className="mt-4 rounded-2xl border border-dashed border-rose-200 bg-rose-50/60 px-3 py-6 text-center text-xs text-rose-500">
                {errorMessage}
              </div>
            )}

            {!isLoading && !errorMessage && (
              <div className="mt-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.5px] text-slate-500">
                    {breadcrumb}
                  </h3>
                  {navPath.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setNavPath((prev) => prev.slice(0, -1))}
                      className="text-xs font-medium text-emerald-600 hover:text-emerald-800"
                    >
                      Back
                    </button>
                  )}
                </div>
                <div className="mt-2 space-y-1">
                  {filteredNodes.map((category) => {
                    const hasChildren =
                      !searchTerm &&
                      Array.isArray(category.children) &&
                      category.children.length > 0;
                    const label = searchTerm ? category.breadcrumb : category.name;
                    return (
                      <div
                        key={category.id}
                        className="flex items-center rounded-2xl px-3 py-2 hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={isCategorySelected(category.id)}
                          onChange={() => toggleCategory(category.id)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (hasChildren) {
                              setNavPath((prev) => [...prev, category.id]);
                              setSearchTerm('');
                            }
                          }}
                          className="ml-2 flex flex-1 items-center justify-between text-left"
                        >
                          <span className="block truncate text-xs font-medium text-slate-700">
                            {label}
                          </span>
                          {hasChildren && (
                            <svg
                              viewBox="0 0 24 24"
                              className="h-3.5 w-3.5 text-slate-400"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M9 6l6 6-6 6" />
                            </svg>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!isLoading && !errorMessage && filteredNodes.length === 0 && searchTerm && (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-500">
                No categories found for "{searchTerm}"
              </div>
            )}

            {!isLoading && !errorMessage && categories.length === 0 && !searchTerm && (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-500">
                No categories available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductCategorySelector;
