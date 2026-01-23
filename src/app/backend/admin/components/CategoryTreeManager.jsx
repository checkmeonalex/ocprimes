'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import LoadingButton from '@/components/LoadingButton';

const normalizeParentId = (value) => (value ? value : null);

const buildTree = (items) => {
  const nodes = new Map();
  const roots = [];

  items.forEach((item) => {
    nodes.set(item.id, { ...item, children: [] });
  });

  nodes.forEach((node) => {
    if (node.parent_id && nodes.has(node.parent_id)) {
      nodes.get(node.parent_id).children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortChildren = (list) => {
    list.sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.name.localeCompare(b.name);
    });
    list.forEach((child) => sortChildren(child.children));
  };

  sortChildren(roots);
  return roots;
};

const buildOptionList = (nodes, depth = 0, acc = []) => {
  nodes.forEach((node) => {
    acc.push({ id: node.id, name: `${'- '.repeat(depth)}${node.name}` });
    if (node.children.length) {
      buildOptionList(node.children, depth + 1, acc);
    }
  });
  return acc;
};

const isDescendant = (items, parentId, childId) => {
  const parentMap = new Map(items.map((item) => [item.id, item.parent_id]));
  let cursor = parentMap.get(childId);
  while (cursor) {
    if (cursor === parentId) return true;
    cursor = parentMap.get(cursor);
  }
  return false;
};

function CategoryTreeManager() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [draggedId, setDraggedId] = useState('');
  const [dropHint, setDropHint] = useState(null);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    parent_id: '',
  });

  const tree = useMemo(() => buildTree(items), [items]);
  const parentOptions = useMemo(() => buildOptionList(tree), [tree]);

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/categories/tree?limit=500', {
        credentials: 'include',
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to load categories.');
      }
      setItems(Array.isArray(payload?.items) ? payload.items : []);
    } catch (err) {
      setError(err?.message || 'Unable to load categories.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || isSaving) return;
    setIsSaving(true);
    setSaveError('');
    try {
      const response = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: form.name.trim(),
          slug: form.slug.trim(),
          description: form.description.trim(),
          parent_id: form.parent_id || undefined,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to create category.');
      }
      const created = payload?.item;
      if (created) {
        setItems((prev) => [...prev, created]);
      }
      setForm({ name: '', slug: '', description: '', parent_id: '' });
    } catch (err) {
      setSaveError(err?.message || 'Unable to create category.');
    } finally {
      setIsSaving(false);
    }
  };

  const applyReorder = useCallback(
    async (updates, nextItems) => {
      if (!updates.length) return;
      setItems(nextItems);
      setSaveError('');
      try {
        const response = await fetch('/api/admin/categories/order', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ updates }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error || 'Unable to reorder categories.');
        }
      } catch (err) {
        setSaveError(err?.message || 'Unable to reorder categories.');
        loadCategories();
      }
    },
    [loadCategories],
  );

  const buildReorderUpdates = useCallback(
    (dragId, targetId, position) => {
      const dragItem = items.find((item) => item.id === dragId);
      const targetItem = items.find((item) => item.id === targetId);
      if (!dragItem || !targetItem) return null;
      if (position === 'inside' && isDescendant(items, dragId, targetId)) {
        setSaveError('Cannot move a category inside its own descendant.');
        return null;
      }

      const oldParentId = normalizeParentId(dragItem.parent_id);
      const newParentId =
        position === 'inside' ? targetItem.id : normalizeParentId(targetItem.parent_id);

      const oldSiblings = items.filter(
        (item) => normalizeParentId(item.parent_id) === oldParentId && item.id !== dragId,
      );
      const newSiblings = items.filter(
        (item) => normalizeParentId(item.parent_id) === newParentId && item.id !== dragId,
      );

      let insertIndex = newSiblings.findIndex((item) => item.id === targetId);
      if (position === 'after') insertIndex += 1;
      if (position === 'inside') insertIndex = newSiblings.length;

      const nextNewSiblings = [...newSiblings];
      nextNewSiblings.splice(insertIndex, 0, { ...dragItem, parent_id: newParentId });

      const updates = [];
      const nextItems = items.map((item) => {
        if (item.id === dragId) {
          return { ...item, parent_id: newParentId };
        }
        return item;
      });

      const reindex = (list, parentId) => {
        list.forEach((item, index) => {
          const current = items.find((entry) => entry.id === item.id);
          if (!current) return;
          const nextParentId = parentId;
          const needsUpdate =
            normalizeParentId(current.parent_id) !== nextParentId || current.sort_order !== index;
          if (needsUpdate) {
            updates.push({
              id: item.id,
              parent_id: nextParentId,
              sort_order: index,
            });
          }
        });
      };

      const sameParent = oldParentId === newParentId;
      if (sameParent) {
        reindex(nextNewSiblings, newParentId);
      } else {
        reindex(oldSiblings, oldParentId);
        reindex(nextNewSiblings, newParentId);
      }

      const updatedMap = new Map(updates.map((update) => [update.id, update]));
      const updatedItems = nextItems.map((item) => {
        const update = updatedMap.get(item.id);
        if (!update) return item;
        return { ...item, parent_id: update.parent_id, sort_order: update.sort_order };
      });

      return { updates, nextItems: updatedItems };
    },
    [items],
  );

  const handleDrop = useCallback(
    (dragId, targetId, position) => {
      setDropHint(null);
      if (!dragId || dragId === targetId) {
        setDraggedId('');
        return;
      }
      const result = buildReorderUpdates(dragId, targetId, position);
      if (!result) return;
      setDraggedId('');
      applyReorder(result.updates, result.nextItems);
    },
    [applyReorder, buildReorderUpdates],
  );

  const renderNode = (node, depth = 0) => {
    const isDragged = node.id === draggedId;
    const dropAbove =
      dropHint?.targetId === node.id && dropHint?.position === 'before';
    const dropInside =
      dropHint?.targetId === node.id && dropHint?.position === 'inside';
    const dropBelow =
      dropHint?.targetId === node.id && dropHint?.position === 'after';

    return (
      <div key={node.id} className="space-y-2">
        <div
          className={`rounded-2xl border px-4 py-3 text-xs shadow-sm transition ${
            isDragged ? 'border-emerald-400 bg-emerald-50/70' : 'border-slate-200 bg-white'
          }`}
        >
          <div
            className={`h-2 rounded-full ${dropAbove ? 'bg-emerald-400' : 'bg-transparent'}`}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
              setDropHint({ targetId: node.id, position: 'before' });
            }}
            onDrop={(event) => {
              event.preventDefault();
              const dragId = event.dataTransfer.getData('text/plain') || draggedId;
              handleDrop(dragId, node.id, 'before');
            }}
          />
          <div
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData('text/plain', node.id);
              event.dataTransfer.effectAllowed = 'move';
              setDraggedId(node.id);
            }}
            onDragEnd={() => {
              setDraggedId('');
              setDropHint(null);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
              setDropHint({ targetId: node.id, position: 'inside' });
            }}
            onDrop={(event) => {
              event.preventDefault();
              const dragId = event.dataTransfer.getData('text/plain') || draggedId;
              handleDrop(dragId, node.id, 'inside');
            }}
            className="flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
                {depth === 0 ? 'Root' : `Level ${depth + 1}`}
              </span>
              <span className="text-sm font-semibold text-slate-800">{node.name}</span>
              <span className="text-[11px] text-slate-400">{node.slug}</span>
            </div>
            <span
              className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                dropInside ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {node.children.length} child
              {node.children.length === 1 ? '' : 'ren'}
            </span>
          </div>
          <div
            className={`mt-2 h-2 rounded-full ${dropBelow ? 'bg-emerald-400' : 'bg-transparent'}`}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
              setDropHint({ targetId: node.id, position: 'after' });
            }}
            onDrop={(event) => {
              event.preventDefault();
              const dragId = event.dataTransfer.getData('text/plain') || draggedId;
              handleDrop(dragId, node.id, 'after');
            }}
          />
        </div>

        {node.children.length > 0 && (
          <div className="ml-6 space-y-2 border-l border-dashed border-slate-200 pl-4">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="rounded-[32px] border border-slate-200 bg-gradient-to-r from-white via-slate-50 to-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
              Category Tree
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-slate-900">Categories</h1>
            <p className="mt-2 text-sm text-slate-500">
              Drag categories to nest or reorder them.
            </p>
          </div>
          <LoadingButton
            type="button"
            isLoading={isLoading}
            onClick={loadCategories}
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
          >
            Refresh tree
          </LoadingButton>
        </div>
        {error && <p className="mt-4 text-sm text-rose-500">{error}</p>}
        {saveError && <p className="mt-2 text-xs text-rose-500">{saveError}</p>}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Create category
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-800">
              Add a new category to the tree
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">
            {items.length} total
          </span>
        </div>

        <form onSubmit={handleCreate} className="mt-4 grid gap-4 md:grid-cols-[1.4fr_1fr]">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
              Category name
            </label>
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="New category name"
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
            <label className="mt-4 block text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
              parent category
            </label>
            <select
              value={form.parent_id}
              onChange={(event) => setForm((prev) => ({ ...prev, parent_id: event.target.value }))}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            >
              <option value="">No parent (root)</option>
              {parentOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
              description (optional)
            </label>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
              placeholder="Add a short description"
              className="mt-2 min-h-[140px] flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            />
            <LoadingButton
              type="submit"
              isLoading={isSaving}
              className="mt-4 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
            >
              Create category
            </LoadingButton>
            {saveError && <p className="mt-2 text-xs text-rose-500">{saveError}</p>}
          </div>
        </form>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Category tree
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-800">
              Drag to reorder, drop on a category to nest
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">
            {tree.length} roots
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {isLoading && (
            <div className="rounded-2xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-500">
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                Loading categories...
              </span>
            </div>
          )}
          {!isLoading && tree.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-500">
              No categories yet.
            </div>
          )}
          {!isLoading && tree.map((node) => renderNode(node))}
        </div>
      </div>
    </div>
  );
}

export default CategoryTreeManager;
