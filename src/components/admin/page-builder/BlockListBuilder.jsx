'use client';

import { useRef, useState } from 'react';

export const genBlockId = () => `block_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

// ─── Block row ──────────────────────────────────────────────────────────────

function BlockItem({
  block,
  typeMeta,
  isExpanded,
  onToggle,
  onDelete,
  onConfigChange,
  onDragStart,
  onDragOver,
  onDrop,
  renderEditor,
}) {
  const subtitle = typeMeta?.subtitle?.(block.config) ?? '';

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="group rounded-xl border border-slate-200 bg-white overflow-hidden transition-shadow hover:shadow-sm"
    >
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <svg className="h-3.5 w-3.5 text-slate-300 shrink-0 cursor-grab active:cursor-grabbing" fill="currentColor" viewBox="0 0 16 16">
          <circle cx="5" cy="4" r="1.2" /><circle cx="11" cy="4" r="1.2" />
          <circle cx="5" cy="8" r="1.2" /><circle cx="11" cy="8" r="1.2" />
          <circle cx="5" cy="12" r="1.2" /><circle cx="11" cy="12" r="1.2" />
        </svg>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 [&>svg]:h-4 [&>svg]:w-4">
          {typeMeta?.icon}
        </span>
        <button type="button" onClick={onToggle} className="flex-1 min-w-0 text-left">
          <span className="text-[13px] font-medium text-slate-800">{typeMeta?.label || block.type}</span>
          {subtitle && <span className="ml-2 text-[11px] text-slate-400">{subtitle}</span>}
        </button>
        <button type="button" onClick={onToggle}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition shrink-0">
          <svg className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
          </svg>
        </button>
        <button type="button" onClick={onDelete}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 opacity-0 group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-500 transition shrink-0">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      {isExpanded && (
        <div className="border-t border-slate-100 bg-white px-4 pb-6 pt-4">
          {renderEditor(block, { onConfigChange })}
        </div>
      )}
    </div>
  );
}

// ─── Block picker modal ────────────────────────────────────────────────────

function BlockPicker({ blockTypes, title, onAdd, onClose, footer }) {
  return (
    <div className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative z-10 w-full bg-white shadow-2xl sm:max-w-md sm:rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <button type="button" onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto max-h-[60vh] py-2">
          {blockTypes.map((t) => (
            <button key={t.key} type="button" onClick={() => { onAdd(t.key); onClose(); }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 [&>svg]:h-4 [&>svg]:w-4">
                {t.icon}
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-slate-800 leading-tight">{t.label}</p>
                <p className="text-[11px] text-slate-400 truncate leading-tight mt-0.5">{t.description}</p>
              </div>
            </button>
          ))}
          {footer}
        </div>
      </div>
    </div>
  );
}

// ─── Shell ──────────────────────────────────────────────────────────────────

export default function BlockListBuilder({
  blocks,
  onBlocksChange,
  blockTypes,
  renderEditor,
  expandedId,
  onExpandedIdChange,
  genId = genBlockId,
  groupBy,
  renderGroupHeader,
  renderEmptyGroup,        // optional ReactNode — rendered under the null/ungrouped header when that group has zero blocks but other groups exist (e.g. "no custom blocks yet" message)
  emptyState,
  pickerTitle = 'Add section',
  addButtonLabel = 'Add section',
  renderAddTrigger,        // optional (openPicker) => ReactNode — replaces the default bottom "Add section" button entirely, and (unlike the default) renders even when blocks.length === 0, for hosts with a standalone always-visible add button
  pickerFooter,
  className = '',
}) {
  const [showPicker, setShowPicker] = useState(false);
  const dragSrcRef = useRef(null);

  const handleAddBlock = (typeKey) => {
    const typeMeta = blockTypes.find((t) => t.key === typeKey);
    if (!typeMeta) return;
    const newBlock = { id: genId(typeKey), type: typeKey, config: typeMeta.defaultConfig() };
    onBlocksChange([...blocks, newBlock]);
    onExpandedIdChange(newBlock.id);
  };

  const handleDeleteBlock = (id) => {
    onBlocksChange(blocks.filter((b) => b.id !== id));
    if (expandedId === id) onExpandedIdChange(null);
  };

  const handleConfigChange = (id, config) => {
    onBlocksChange(blocks.map((b) => (b.id === id ? { ...b, config } : b)));
  };

  const toggleExpand = (id) => onExpandedIdChange(expandedId === id ? null : id);

  const handleDragStart = (e, id) => {
    dragSrcRef.current = id;
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const handleDrop = (e, targetId) => {
    e.preventDefault();
    const srcId = dragSrcRef.current;
    if (!srcId || srcId === targetId) return;
    const srcIdx = blocks.findIndex((b) => b.id === srcId);
    const tgtIdx = blocks.findIndex((b) => b.id === targetId);
    if (srcIdx < 0 || tgtIdx < 0) return;
    const next = [...blocks];
    const [moved] = next.splice(srcIdx, 1);
    next.splice(tgtIdx, 0, moved);
    onBlocksChange(next);
    dragSrcRef.current = null;
  };

  const renderBlockItem = (block) => (
    <BlockItem
      key={block.id}
      block={block}
      typeMeta={blockTypes.find((t) => t.key === block.type)}
      isExpanded={expandedId === block.id}
      onToggle={() => toggleExpand(block.id)}
      onDelete={() => handleDeleteBlock(block.id)}
      onConfigChange={(config) => handleConfigChange(block.id, config)}
      onDragStart={(e) => handleDragStart(e, block.id)}
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, block.id)}
      renderEditor={renderEditor}
    />
  );

  const renderList = () => {
    if (!groupBy) {
      return <div className="space-y-1.5">{blocks.map(renderBlockItem)}</div>;
    }
    const groups = [];
    const groupIndex = new Map();
    blocks.forEach((block) => {
      const key = groupBy(block) ?? null;
      if (!groupIndex.has(key)) {
        groupIndex.set(key, groups.length);
        groups.push({ key, blocks: [] });
      }
      groups[groupIndex.get(key)].blocks.push(block);
    });
    // If every block landed in a named group, still surface the ungrouped
    // header (e.g. "Your Blocks") with renderEmptyGroup content, so hosts can
    // show a "nothing here yet" message instead of silently omitting the section.
    if (renderEmptyGroup && !groupIndex.has(null) && groups.length > 0) {
      groups.push({ key: null, blocks: [] });
    }
    return (
      <div className="space-y-4">
        {groups.map(({ key, blocks: groupBlocks }) => (
          <div key={key ?? '__ungrouped'} className="space-y-2">
            {renderGroupHeader?.(key, groupBlocks)}
            {groupBlocks.length > 0 ? (
              <div className="space-y-1.5">{groupBlocks.map(renderBlockItem)}</div>
            ) : (
              key === null ? renderEmptyGroup : null
            )}
          </div>
        ))}
      </div>
    );
  };

  const openPicker = () => setShowPicker(true);

  return (
    <div className={className}>
      {blocks.length === 0 ? (
        typeof emptyState === 'function' ? emptyState(openPicker) : emptyState
      ) : (
        renderList()
      )}

      {renderAddTrigger ? (
        renderAddTrigger(openPicker)
      ) : blocks.length > 0 ? (
        <button
          type="button"
          onClick={openPicker}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-200 py-2.5 text-[11px] font-medium text-slate-400 hover:border-slate-300 hover:text-slate-600 transition mt-1.5"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {addButtonLabel}
        </button>
      ) : null}

      {showPicker && (
        <BlockPicker
          blockTypes={blockTypes}
          title={pickerTitle}
          onAdd={handleAddBlock}
          onClose={() => setShowPicker(false)}
          footer={pickerFooter}
        />
      )}
    </div>
  );
}
