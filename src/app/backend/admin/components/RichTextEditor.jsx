'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';

const stripUnsafeHtml = (html) => {
  const raw = String(html || '');
  if (!raw) return '';
  return raw
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');
};

const normalizeUrl = (value) => {
  const next = String(value || '').trim();
  if (!next) return '';
  if (/^https?:\/\//i.test(next)) return next;
  return `https://${next}`;
};

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const TOOLBAR_BTN_BASE =
  'inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100';

const FLOATING_BTN_BASE = 'rounded-md px-2 py-1 text-xs font-semibold transition';

const RichTextEditor = forwardRef(function RichTextEditor({
  value = '',
  onChange = () => {},
  placeholder = 'Write description...',
  minHeight = 180,
  onExpand,
  expandLabel = 'Expand',
  showToolbar = true,
  showTopActionButtons = true,
  showPinnedFormatMenu = false,
  showFloatingFormatMenu = true,
  onRequestImage,
  mobileEdgeToEdge = false,
}, ref) {
  const safeInitialValue = useMemo(() => stripUnsafeHtml(value), [value]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Image.configure({
        allowBase64: false,
      }),
    ],
    content: safeInitialValue || '<p></p>',
    onUpdate: ({ editor: tiptapEditor }) => {
      onChange(stripUnsafeHtml(tiptapEditor.getHTML()));
    },
    editorProps: {
      attributes: {
        class:
          'w-full px-3 py-3 text-xs leading-relaxed text-slate-700 focus:outline-none [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:leading-tight [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:leading-tight [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:leading-tight [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1',
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const next = stripUnsafeHtml(value) || '<p></p>';
    const current = stripUnsafeHtml(editor.getHTML()) || '<p></p>';
    if (next !== current) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [editor, value]);

  const insertImageFromUrl = useCallback((sourceUrl) => {
    if (!editor) return;
    const src = normalizeUrl(sourceUrl);
    if (!src) return;
    editor.chain().focus().setImage({ src }).run();
  }, [editor]);

  const openImagePrompt = useCallback(() => {
    if (!editor) return;
    if (typeof onRequestImage === 'function') {
      onRequestImage();
      return;
    }
    const input = window.prompt('Enter image URL');
    insertImageFromUrl(input);
  }, [editor, insertImageFromUrl, onRequestImage]);

  const handleBulletListToggle = useCallback(() => {
    if (!editor) return;
    if (editor.isActive('bulletList')) {
      editor.chain().focus().toggleBulletList().run();
      return;
    }

    const { from, to, empty } = editor.state.selection;
    if (empty) {
      editor.chain().focus().toggleBulletList().run();
      return;
    }

    const selectedText = editor.state.doc.textBetween(from, to, '\n', '\n');
    const lines = selectedText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length <= 1) {
      editor.chain().focus().toggleBulletList().run();
      return;
    }

    const listHtml = `<ul>${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>`;
    editor.chain().focus().insertContentAt({ from, to }, listHtml).run();
  }, [editor]);

  useImperativeHandle(
    ref,
    () => ({
      undo: () => editor?.chain().focus().undo().run(),
      redo: () => editor?.chain().focus().redo().run(),
      insertImage: () => openImagePrompt(),
      insertImageFromUrl,
    }),
    [editor, openImagePrompt, insertImageFromUrl],
  );

  if (!editor) return null;

  const floatingBtnClass = (active) =>
    `${FLOATING_BTN_BASE} ${active ? 'bg-white/25 text-white' : 'text-white hover:bg-white/15'}`;
  const pinnedBtnClass = (active) =>
    `rounded-md px-2 py-1 text-xs font-semibold transition ${
      active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
    }`;

  return (
    <div
      className={`relative mt-2 overflow-visible bg-white ${
        mobileEdgeToEdge ? 'rounded-none border-none sm:rounded-2xl sm:border sm:border-slate-200' : 'rounded-2xl border border-slate-200'
      }`}
    >
      {showToolbar && (
        <div
          className={`bg-slate-50 px-2 py-2 ${
            mobileEdgeToEdge ? 'border-b-0 sm:border-b sm:border-slate-200' : 'border-b border-slate-200'
          } ${showPinnedFormatMenu ? 'sticky top-0 z-20' : ''}`}
        >
          <div className="flex items-center gap-2">
            {showTopActionButtons && (
              <>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().undo().run()}
                  className={TOOLBAR_BTN_BASE}
                  aria-label="Undo"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 7H4v5" />
                    <path d="M4 12a8 8 0 1 0 2.3-5.7L4 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().redo().run()}
                  className={TOOLBAR_BTN_BASE}
                  aria-label="Redo"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 7h5v5" />
                    <path d="M20 12a8 8 0 1 1-2.3-5.7L20 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={openImagePrompt}
                  className={TOOLBAR_BTN_BASE}
                  aria-label="Insert image"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <circle cx="9" cy="10" r="1.5" />
                    <path d="M21 15l-4.5-4.5L8 19" />
                  </svg>
                </button>
              </>
            )}
            {typeof onExpand === 'function' && (
              <button
                type="button"
                onClick={onExpand}
                className="ml-auto inline-flex h-7 items-center rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                {expandLabel}
              </button>
            )}
          </div>
          {showPinnedFormatMenu && (
            <div className="mt-2 flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={pinnedBtnClass(editor.isActive('bold'))}
              >
                B
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().setParagraph().run()}
                className={pinnedBtnClass(editor.isActive('paragraph'))}
              >
                P
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={pinnedBtnClass(editor.isActive('heading', { level: 1 }))}
              >
                H1
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={pinnedBtnClass(editor.isActive('heading', { level: 2 }))}
              >
                H2
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                className={pinnedBtnClass(editor.isActive('heading', { level: 3 }))}
              >
                H3
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={pinnedBtnClass(editor.isActive('underline'))}
              >
                U
              </button>
              <button
                type="button"
                onClick={handleBulletListToggle}
                className={pinnedBtnClass(editor.isActive('bulletList'))}
              >
                • List
              </button>
            </div>
          )}
        </div>
      )}

      <div className="relative" style={{ minHeight }}>
        {editor.isEmpty && (
          <div className="pointer-events-none absolute left-3 top-3 text-xs text-slate-400">{placeholder}</div>
        )}
        <EditorContent editor={editor} />
      </div>

      {showFloatingFormatMenu && (
        <BubbleMenu
          editor={editor}
          tippyOptions={{ placement: 'top', duration: 100 }}
          shouldShow={({ editor: tiptapEditor }) => {
            const { empty } = tiptapEditor.state.selection;
            return !empty && tiptapEditor.isFocused;
          }}
        >
          <div className="flex items-center gap-1 rounded-xl bg-slate-900 px-2 py-1 text-white shadow-2xl">
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={floatingBtnClass(editor.isActive('bold'))}
            >
              B
            </button>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor.chain().focus().setParagraph().run()}
              className={floatingBtnClass(editor.isActive('paragraph'))}
            >
              P
            </button>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={floatingBtnClass(editor.isActive('heading', { level: 1 }))}
            >
              H1
            </button>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={floatingBtnClass(editor.isActive('heading', { level: 2 }))}
            >
              H2
            </button>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={floatingBtnClass(editor.isActive('heading', { level: 3 }))}
            >
              H3
            </button>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={floatingBtnClass(editor.isActive('underline'))}
            >
              U
            </button>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={handleBulletListToggle}
              className={floatingBtnClass(editor.isActive('bulletList'))}
            >
              • List
            </button>
          </div>
        </BubbleMenu>
      )}
    </div>
  );
});

export default RichTextEditor;
