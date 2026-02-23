'use client';
import CustomSelect from '@/components/common/CustomSelect'
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import LoadingButton from '@/components/LoadingButton';
import { buildCategoryTree } from '@/lib/categories/tree.mjs';

const normalizeParentId = (value) => (value ? value : null);
const DRAFT_STORAGE_KEY = 'ocprimes_admin_category_tree_draft_v1';

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

const filterTree = (nodes, query) => {
  const q = query.trim().toLowerCase();
  if (!q) return nodes;
  return nodes
    .map((node) => {
      const children = filterTree(node.children || [], q);
      const matches = String(node.name || '').toLowerCase().includes(q);
      if (!matches && children.length === 0) return null;
      return { ...node, children };
    })
    .filter(Boolean);
};

const applyUpdatesToItems = (baseItems, updates) => {
  const map = new Map((Array.isArray(updates) ? updates : []).map((update) => [update.id, update]));
  return (Array.isArray(baseItems) ? baseItems : []).map((item) => {
    const update = map.get(item.id);
    if (!update) return item;
    return {
      ...item,
      parent_id: update.parent_id,
      sort_order: update.sort_order,
    };
  });
};

function Sheet({ open, title, onClose, children, forceBottom = false }) {
  if (!open) return null;
  return (
    <div
      className={`fixed inset-0 z-[90] bg-slate-900/40 [animation:cat-sheet-fade_220ms_ease-out] ${
        forceBottom ? 'p-0 sm:p-4' : 'p-3 sm:p-4'
      }`}
    >
      <div className={`mx-auto flex h-full w-full max-w-md items-end ${forceBottom ? '' : 'sm:items-center'}`}>
        <div
          className={`w-full overflow-hidden bg-white shadow-[0_30px_80px_rgba(15,23,42,0.26)] ${
            forceBottom
              ? 'h-[60dvh] rounded-t-3xl rounded-b-none [animation:cat-sheet-up_260ms_cubic-bezier(0.22,1,0.36,1)] sm:h-auto sm:rounded-3xl sm:[animation:cat-sheet-pop_220ms_ease-out]'
              : 'rounded-3xl [animation:cat-sheet-pop_220ms_ease-out]'
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
          <div
            className={`${
              forceBottom ? 'max-h-[calc(60dvh-57px)] sm:max-h-[70vh]' : 'max-h-[70vh]'
            } overflow-y-auto px-4 py-4`}
          >
            {children}
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes cat-sheet-fade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes cat-sheet-up {
          from {
            transform: translateY(44px);
            opacity: 0.9;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes cat-sheet-pop {
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
  );
}

function CategoryTreeManager() {
  const [items, setItems] = useState([]);
  const [categoryRequests, setCategoryRequests] = useState([]);
  const [isRequestsLoading, setIsRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState('');
  const [canReviewRequests, setCanReviewRequests] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingReorder, setIsSavingReorder] = useState(false);
  const [draggedId, setDraggedId] = useState('');
  const [touchDrag, setTouchDrag] = useState(null);
  const [pendingReorderUpdates, setPendingReorderUpdates] = useState([]);
  const [dropHint, setDropHint] = useState(null);
  const [uploadingId, setUploadingId] = useState('');
  const [toggleLoadingId, setToggleLoadingId] = useState('');
  const [removingId, setRemovingId] = useState('');
  const [editingId, setEditingId] = useState('');
  const [editingName, setEditingName] = useState('');
  const [renamingId, setRenamingId] = useState('');
  const [openRoots, setOpenRoots] = useState(new Set());
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    parent_id: '',
  });

  const tree = useMemo(() => buildCategoryTree(items), [items]);
  const filteredTree = useMemo(() => filterTree(tree, query), [tree, query]);
  const parentOptions = useMemo(() => buildOptionList(tree), [tree]);

  const loadCategories = useCallback(async ({ skipDraft = false } = {}) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/categories/tree?limit=2000', {
        credentials: 'include',
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to load categories.');
      }
      const serverItems = Array.isArray(payload?.items) ? payload.items : [];
      let draftUpdates = [];
      if (!skipDraft) {
        try {
          const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
          const parsed = raw ? JSON.parse(raw) : null;
          const updates = Array.isArray(parsed?.updates) ? parsed.updates : [];
          const idSet = new Set(serverItems.map((item) => item.id));
          draftUpdates = updates.filter(
            (update) =>
              update &&
              typeof update.id === 'string' &&
              idSet.has(update.id) &&
              (update.parent_id === null || typeof update.parent_id === 'string') &&
              Number.isInteger(update.sort_order),
          );
        } catch {
          draftUpdates = [];
        }
      }

      setPendingReorderUpdates(draftUpdates);
      setItems(draftUpdates.length > 0 ? applyUpdatesToItems(serverItems, draftUpdates) : serverItems);
    } catch (err) {
      setError(err?.message || 'Unable to load categories.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const loadCategoryRequests = useCallback(async () => {
    setIsRequestsLoading(true);
    setRequestsError('');
    try {
      const response = await fetch('/api/admin/categories/requests?status=pending&page=1&per_page=50', {
        credentials: 'include',
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to load category requests.');
      }
      const items = Array.isArray(payload?.items) ? payload.items : [];
      setCategoryRequests(items);
      setCanReviewRequests(Boolean(payload?.permissions?.can_review_request));
    } catch (err) {
      setRequestsError(err?.message || 'Unable to load category requests.');
    } finally {
      setIsRequestsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategoryRequests();
  }, [loadCategoryRequests]);

  const updateItem = useCallback((id, updates) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  }, []);

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
      setCreateOpen(false);
    } catch (err) {
      setSaveError(err?.message || 'Unable to create category.');
    } finally {
      setIsSaving(false);
    }
  };

  const onSearch = useCallback(() => {
    setQuery(search.trim());
  }, [search]);

  const handleToggleActive = async (node) => {
    if (!node?.id || toggleLoadingId) return;
    const nextActive = !node.is_active;
    setToggleLoadingId(node.id);
    setSaveError('');
    try {
      const response = await fetch('/api/admin/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: node.id, is_active: nextActive }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to update category.');
      }
      if (payload?.item) {
        updateItem(node.id, payload.item);
      } else {
        updateItem(node.id, { is_active: nextActive });
      }
    } catch (err) {
      setSaveError(err?.message || 'Unable to update category.');
    } finally {
      setToggleLoadingId('');
    }
  };

  const handleRemoveImage = async (node) => {
    if (!node?.id || removingId) return;
    setRemovingId(node.id);
    setSaveError('');
    try {
      const response = await fetch('/api/admin/categories/image/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: node.id }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to remove image.');
      }
      updateItem(node.id, { image_url: null, image_alt: null, image_key: null });
    } catch (err) {
      setSaveError(err?.message || 'Unable to remove image.');
    } finally {
      setRemovingId('');
    }
  };

  const handleImageUpload = async (node) => {
    if (!node?.id || uploadingId) return;
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      setUploadingId(node.id);
      setSaveError('');
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category_id', node.id);
        const uploadResponse = await fetch('/api/admin/categories/image/upload', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
        const uploadPayload = await uploadResponse.json().catch(() => null);
        if (!uploadResponse.ok) {
          throw new Error(uploadPayload?.error || 'Unable to upload image.');
        }
        const imageUrl = uploadPayload?.url;
        if (!imageUrl) {
          throw new Error('Upload did not return a URL.');
        }
        const imageKey = uploadPayload?.key || null;
        // Remove old image in parallel (best effort)
        if (node.image_url && node.image_key) {
          fetch('/api/admin/categories/image/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ id: node.id }),
          }).catch(() => null);
        }
        const updateResponse = await fetch('/api/admin/categories', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            id: node.id,
            image_url: imageUrl,
            image_key: imageKey,
            image_alt: node.name,
          }),
        });
        const updatePayload = await updateResponse.json().catch(() => null);
        if (!updateResponse.ok) {
          throw new Error(updatePayload?.error || 'Unable to save image.');
        }
        if (updatePayload?.item) {
          updateItem(node.id, updatePayload.item);
        } else {
          updateItem(node.id, { image_url: imageUrl, image_key: imageKey, image_alt: node.name });
        }
      } catch (err) {
        setSaveError(err?.message || 'Unable to upload image.');
      } finally {
        setUploadingId('');
      }
    };
    fileInput.click();
  };

  const handleRename = async (id, name) => {
    if (!id || !name.trim()) {
      setEditingId('');
      setEditingName('');
      return;
    }
    setSaveError('');
    setRenamingId(id);
    try {
      const response = await fetch('/api/admin/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, name }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to rename category.');
      }
      if (payload?.item) {
        updateItem(id, payload.item);
      } else {
        updateItem(id, { name });
      }
      setEditingId('');
      setEditingName('');
    } catch (err) {
      setSaveError(err?.message || 'Unable to rename category.');
    } finally {
      setRenamingId('');
    }
  };

  const applyReorder = useCallback((updates, nextItems) => {
    if (!updates.length) return;
    setItems(nextItems);
    setSaveError('');
    setPendingReorderUpdates((prev) => {
      const map = new Map(prev.map((update) => [update.id, update]));
      updates.forEach((update) => {
        map.set(update.id, update);
      });
      const merged = Array.from(map.values());
      try {
        window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ updates: merged }));
      } catch {
        // ignore storage failures
      }
      return merged;
    });
  }, []);

  const saveReorderChanges = useCallback(async () => {
    if (pendingReorderUpdates.length <= 0 || isSavingReorder) return;
    setIsSavingReorder(true);
    setSaveError('');
    try {
      const updates = [...pendingReorderUpdates];
      const batchSize = 200;

      for (let index = 0; index < updates.length; index += batchSize) {
        const chunk = updates.slice(index, index + batchSize);
        const response = await fetch('/api/admin/categories/order', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ updates: chunk }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error || 'Unable to save category structure.');
        }
      }

      try {
        window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {
        // ignore storage failures
      }
      setPendingReorderUpdates([]);
      await loadCategories({ skipDraft: true });
    } catch (err) {
      setSaveError(err?.message || 'Unable to save category structure.');
    } finally {
      setIsSavingReorder(false);
    }
  }, [isSavingReorder, pendingReorderUpdates, loadCategories]);

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
        setTouchDrag(null);
        return;
      }
      const result = buildReorderUpdates(dragId, targetId, position);
      if (!result) return;
      setDraggedId('');
      setTouchDrag(null);
      applyReorder(result.updates, result.nextItems);
    },
    [applyReorder, buildReorderUpdates],
  );

  useEffect(() => {
    if (!touchDrag?.id) return undefined;

    const resolveDropTarget = (clientX, clientY) => {
      const target = document
        .elementFromPoint(clientX, clientY)
        ?.closest('[data-drop-target-id][data-drop-position]');
      if (!target) return null;
      const targetId = target.getAttribute('data-drop-target-id');
      const position = target.getAttribute('data-drop-position');
      if (!targetId || !position) return null;
      if (position !== 'before' && position !== 'inside' && position !== 'after') return null;
      return { targetId, position };
    };

    const onPointerMove = (event) => {
      if (event.pointerId !== touchDrag.pointerId) return;
      const next = resolveDropTarget(event.clientX, event.clientY);
      if (!next) return;
      setDropHint(next);
      event.preventDefault();
    };

    const onPointerUp = (event) => {
      if (event.pointerId !== touchDrag.pointerId) return;
      const next = resolveDropTarget(event.clientX, event.clientY);
      if (!next) {
        setDropHint(null);
        setDraggedId('');
        setTouchDrag(null);
        return;
      }
      handleDrop(touchDrag.id, next.targetId, next.position);
    };

    const onPointerCancel = (event) => {
      if (event.pointerId !== touchDrag.pointerId) return;
      setDropHint(null);
      setDraggedId('');
      setTouchDrag(null);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
    };
  }, [handleDrop, touchDrag]);

  const renderNode = (node, depth = 0) => {
    const isDragged = node.id === draggedId;
    const isRoot = depth === 0;
    const isExpanded = !isRoot || openRoots.has(node.id);
    const dropAbove =
      dropHint?.targetId === node.id && dropHint?.position === 'before';
    const dropInside =
      dropHint?.targetId === node.id && dropHint?.position === 'inside';
    const dropBelow =
      dropHint?.targetId === node.id && dropHint?.position === 'after';

    return (
      <div key={node.id} className="space-y-2">
        <div
          className={`rounded-none border-x-0 border-b px-2 py-3 text-xs shadow-none transition sm:rounded-2xl sm:border sm:px-4 sm:shadow-sm ${
            isDragged
              ? 'border-emerald-300 bg-emerald-50/60 sm:border-emerald-400 sm:bg-emerald-50/70'
              : 'border-slate-200 bg-transparent sm:bg-white'
          }`}
        >
          <div
            className={`h-2 rounded-full ${dropAbove ? 'bg-emerald-400' : 'bg-transparent'}`}
            data-drop-target-id={node.id}
            data-drop-position="before"
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
            data-drop-target-id={node.id}
            data-drop-position="inside"
            className="flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                draggable
                onPointerDown={(event) => {
                  if (event.pointerType === 'mouse') return;
                  setDraggedId(node.id);
                  setTouchDrag({ id: node.id, pointerId: event.pointerId });
                }}
                onDragStart={(event) => {
                  event.dataTransfer.setData('text/plain', node.id);
                  event.dataTransfer.effectAllowed = 'move';
                  setDraggedId(node.id);
                }}
                onDragEnd={() => {
                  setDraggedId('');
                  setDropHint(null);
                }}
                className="inline-flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded-full border border-slate-200 text-slate-500 active:cursor-grabbing"
                aria-label={`Drag ${node.name}`}
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <circle cx="7" cy="6" r="1.2" />
                  <circle cx="13" cy="6" r="1.2" />
                  <circle cx="7" cy="10" r="1.2" />
                  <circle cx="13" cy="10" r="1.2" />
                  <circle cx="7" cy="14" r="1.2" />
                  <circle cx="13" cy="14" r="1.2" />
                </svg>
              </button>
              <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 group/image">
                {node.image_url ? (
                  <img
                    src={node.image_url}
                    alt={node.image_alt || node.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
                    No image
                  </div>
                )}
                <div
                  className={`absolute inset-0 ${
                    uploadingId === node.id || removingId === node.id ? 'flex' : 'hidden'
                  } items-center justify-center gap-2 bg-slate-900/80 text-white text-[11px] font-semibold`}
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                    {uploadingId === node.id ? 'Uploading...' : 'Removing...'}
                  </span>
                </div>
                <div className="absolute inset-0 hidden items-center justify-center gap-2 bg-slate-900/70 text-white text-[11px] font-semibold group-hover/image:flex">
                  <button
                    type="button"
                    onClick={() => handleImageUpload(node)}
                    disabled={uploadingId === node.id || removingId === node.id}
                    className="rounded-full bg-white/90 px-2 py-1 text-slate-800 hover:bg-white disabled:opacity-60"
                  >
                    ✎
                  </button>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  {isRoot && node.children.length > 0 && (
                    <button
                      type="button"
                      aria-label={isExpanded ? 'Collapse root' : 'Expand root'}
                      onClick={() =>
                        setOpenRoots((prev) => {
                          const next = new Set(prev);
                          if (next.has(node.id)) next.delete(node.id);
                          else next.add(node.id);
                          return next;
                        })
                      }
                      className="rounded-full border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-800"
                    >
                      {isExpanded ? 'Collapse' : 'Expand'}
                    </button>
                  )}
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
                    {depth === 0 ? 'Root' : `Level ${depth + 1}`}
                  </span>
                  {editingId === node.id ? (
                    <>
                      <input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                        autoFocus
                        onBlur={() => {
                          setEditingId('');
                          setEditingName('');
                        }}
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            await handleRename(node.id, editingName);
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="rounded-md bg-slate-800 px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-60"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleRename(node.id, editingName)}
                        disabled={renamingId === node.id}
                      >
                        {renamingId === node.id ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="h-3 w-3 animate-spin rounded-full border border-white/70 border-t-transparent" />
                            Saving...
                          </span>
                        ) : (
                          'Save'
                        )}
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href={`/backend/admin/categories/${node.id}`}
                        className="text-sm font-semibold text-slate-800 hover:text-blue-600"
                      >
                        {node.name}
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(node.id);
                          setEditingName(node.name);
                        }}
                        className="text-[11px] text-slate-500 hover:text-slate-700"
                      >
                        ✎
                      </button>
                      <span className="text-[11px] text-slate-400">{node.slug}</span>
                    </>
                  )}
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  {node.is_active ? 'Active in menu' : 'Hidden from menu'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleToggleActive(node)}
                disabled={toggleLoadingId === node.id}
                className={`flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold ${
                  node.is_active
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-slate-50 text-slate-500'
                }`}
                aria-label={node.is_active ? 'Hide category' : 'Show category'}
              >
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  {node.is_active ? (
                    <>
                      <path d="M1.5 12s4-7 10.5-7 10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  ) : (
                    <>
                      <path d="M2 12s4-7 10-7c2.7 0 5 1.1 6.8 2.6" />
                      <path d="M22 12s-4 7-10 7c-2.8 0-5.2-1.1-7-2.7" />
                      <path d="M3 3l18 18" />
                    </>
                  )}
                </svg>
                {toggleLoadingId === node.id ? 'Saving...' : node.is_active ? 'Visible' : 'Hidden'}
              </button>
              <span
                className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                  dropInside ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {node.children.length} child
                {node.children.length === 1 ? '' : 'ren'}
              </span>
            </div>
          </div>
          <div
            className={`mt-2 h-2 rounded-full ${dropBelow ? 'bg-emerald-400' : 'bg-transparent'}`}
            data-drop-target-id={node.id}
            data-drop-position="after"
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

        {isExpanded && node.children.length > 0 && (
          <div className="ml-6 space-y-2 border-l border-dashed border-slate-200 pl-4">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="flex items-center justify-between py-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Categories</h1>
          <p className="mt-1 text-sm text-slate-500">Organize category tree, nesting, visibility, and requests.</p>
          <p className="mt-1 text-xs text-slate-500">{items.length} total · {tree.length} roots</p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.24)] transition hover:brightness-110"
          aria-label="Add category"
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
            placeholder="Search categories"
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
        <LoadingButton
          type="button"
          isLoading={isLoading}
          onClick={loadCategories}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Refresh
        </LoadingButton>
      </div>

      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      {saveError ? <p className="mt-2 text-xs text-rose-500">{saveError}</p> : null}

      <div className="mt-4 rounded-none border-0 bg-transparent p-0 shadow-none sm:rounded-3xl sm:border sm:border-slate-200 sm:bg-white sm:p-5 sm:shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Category requests</p>
            <p className="mt-2 text-sm font-semibold text-slate-800">Seller requests waiting for admin review</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">
              {categoryRequests.length} pending
            </span>
            <LoadingButton
              type="button"
              isLoading={isRequestsLoading}
              onClick={loadCategoryRequests}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600"
            >
              Refresh
            </LoadingButton>
          </div>
        </div>
        {requestsError ? <p className="mt-3 text-xs text-rose-500">{requestsError}</p> : null}
        {!requestsError && canReviewRequests && (
          <div className="mt-4 space-y-2">
            {!isRequestsLoading && categoryRequests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-xs text-slate-500">
                No pending category requests.
              </div>
            ) : null}
            {categoryRequests.map((request) => {
              const requesterBrand = String(request?.requester_brand_name || '').trim();
              const requesterId = String(request?.requester_user_id || '').trim();
              const requesterLabel = requesterBrand || requesterId || 'Unknown requester';
              const requestedAt = request?.requested_at
                ? new Date(request.requested_at).toLocaleString()
                : 'Unknown date';
              return (
                <div
                  key={request.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{request.name}</p>
                    <p className="mt-1 text-xs text-slate-500">/{request.slug} · Requested by {requesterLabel}</p>
                    <p className="mt-1 text-[11px] text-slate-400">{requestedAt}</p>
                  </div>
                  <Link
                    href="/backend/admin/categories"
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600"
                  >
                    Review
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 rounded-none border-0 bg-transparent p-0 shadow-none sm:rounded-3xl sm:border sm:border-slate-200 sm:bg-white sm:p-5 sm:shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Category tree</p>
            <p className="mt-2 text-sm font-semibold text-slate-800">Drag to reorder, drop on a category to nest</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">
              {filteredTree.length} roots in view
            </span>
            {pendingReorderUpdates.length > 0 ? (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">
                Unsaved changes
              </span>
            ) : null}
            <LoadingButton
              type="button"
              isLoading={isSavingReorder}
              onClick={saveReorderChanges}
              disabled={pendingReorderUpdates.length <= 0}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 disabled:opacity-50"
            >
              Save structure
            </LoadingButton>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {isLoading ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-500">
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                Loading categories...
              </span>
            </div>
          ) : null}
          {!isLoading && filteredTree.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-500">
              {query ? 'No categories match your search.' : 'No categories yet.'}
            </div>
          ) : null}
          {!isLoading && filteredTree.map((node) => renderNode(node))}
        </div>
      </div>

      <Sheet open={createOpen} title="Create category" onClose={() => setCreateOpen(false)} forceBottom>
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">Category name</label>
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="New category name"
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
              required
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">Slug (optional)</label>
            <input
              value={form.slug}
              onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
              placeholder="auto-generated if empty"
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">Parent category</label>
            <CustomSelect
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
            </CustomSelect>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">Description (optional)</label>
            <textarea
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Add a short description"
              className="mt-2 min-h-[120px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            />
          </div>
          <LoadingButton
            type="submit"
            isLoading={isSaving}
            className="w-full rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
          >
            Create category
          </LoadingButton>
          {saveError ? <p className="text-xs text-rose-500">{saveError}</p> : null}
        </form>
      </Sheet>
    </div>
  );
}

export default CategoryTreeManager;
