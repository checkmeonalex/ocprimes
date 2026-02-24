'use client';

import { useEffect, useRef, useState } from 'react';

const HELP_CENTER_VIRTUAL_CONVERSATION_ID = '__help_center__';

const getInitials = (name) =>
  String(name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'C';

const HelpCenterLogo = ({ className = 'h-5 w-5' }) => (
  <svg className={`${className} text-[#f5d10b]`} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="12" cy="3.2" r="2.2" />
    <circle cx="12" cy="20.8" r="2.2" />
    <circle cx="3.2" cy="12" r="2.2" />
    <circle cx="20.8" cy="12" r="2.2" />
    <circle cx="6.3" cy="6.3" r="2.2" />
    <circle cx="17.7" cy="17.7" r="2.2" />
    <circle cx="17.7" cy="6.3" r="2.2" />
    <circle cx="6.3" cy="17.7" r="2.2" />
  </svg>
);

const VerifiedBadge = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" aria-hidden="true">
    <path
      d="M12 2.8l2.2 1.3 2.6-.2 1.3 2.2 2.2 1.3-.2 2.6 1.3 2.2-1.3 2.2.2 2.6-2.2 1.3-1.3 2.2-2.6-.2L12 21.2l-2.2-1.3-2.6.2-1.3-2.2-2.2-1.3.2-2.6L2.8 12l1.3-2.2-.2-2.6 2.2-1.3 1.3-2.2 2.6.2L12 2.8Z"
      fill="#c4b5fd"
      stroke="#60a5fa"
      strokeWidth="0.8"
    />
    <path d="m8.4 12.1 2.1 2.1 5-5" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function SellerConversationThread({
  conversation,
  draftMessage,
  onDraftMessageChange,
  onSendMessage,
  onBack,
  onDeleteConversation,
  isDeletingConversation = false,
  isVendorTakeoverBlocked = false,
  isAdmin = false,
  onToggleTakeover,
  isTogglingTakeover = false,
}) {
  const bodyRef = useRef(null);
  const menuRef = useRef(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const container = bodyRef.current;
    if (!container) return;
    const rafId = window.requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [conversation?.id, conversation?.messages]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const onPointerDown = (event) => {
      if (!menuRef.current) return;
      if (menuRef.current.contains(event.target)) return;
      setIsMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [isMenuOpen]);

  if (!conversation) return null;
  const isHelpCenterConversation =
    Boolean(conversation.isHelpCenter) ||
    String(conversation.id || '').trim() === HELP_CENTER_VIRTUAL_CONVERSATION_ID;
  const customerAvatar = getInitials(conversation.customerName);
  const sellerAvatar = 'OC';
  const sellerName = String(conversation.sellerName || '').trim() || 'Seller';

  return (
    <section className="flex h-full min-h-0 flex-col bg-white">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 lg:hidden"
            aria-label="Back to chats"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="m15 6-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
            {isHelpCenterConversation ? (
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white">
                <HelpCenterLogo className="h-6 w-6" />
              </span>
            ) : (
              getInitials(conversation.customerName)
            )}
          </span>
          <span>
            <p className="flex items-center gap-1 text-sm font-semibold text-slate-900">
              <span>{conversation.customerName}</span>
              {isHelpCenterConversation ? <VerifiedBadge /> : null}
            </p>
            <p className="text-xs text-slate-400">
              {String(conversation.presenceLabel || '').trim() || (conversation.online ? 'Online' : 'Last seen recently')}
            </p>
          </span>
        </div>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen((previous) => !previous)}
            aria-label="Conversation actions"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 5v.01M12 12v.01M12 19v.01" strokeLinecap="round" />
            </svg>
          </button>
          {isMenuOpen ? (
            <div className="absolute right-0 top-9 z-30 min-w-[180px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              {isAdmin ? (
                <button
                  type="button"
                  disabled={isTogglingTakeover}
                  onClick={() => {
                    setIsMenuOpen(false);
                    onToggleTakeover?.();
                  }}
                  className="flex w-full items-center px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {conversation.adminTakeoverEnabled ? 'Return access to seller' : 'Take over chat'}
                </button>
              ) : null}
              <button
                type="button"
                disabled={isDeletingConversation}
                onClick={() => {
                  setIsMenuOpen(false);
                  onDeleteConversation?.();
                }}
                className="flex w-full items-center px-3 py-2 text-left text-sm text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Delete chat
              </button>
            </div>
          ) : null}
        </div>
      </header>
      {isVendorTakeoverBlocked ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-800">
          Admin has taken over this chat. You can no longer send messages in this conversation.
        </div>
      ) : null}

      <div
        ref={bodyRef}
        className="thread-scrollbar min-h-0 flex-1 overflow-y-scroll overscroll-contain bg-slate-50 px-4 py-4"
      >
        <div className="mb-3 flex justify-center">
          <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-500">
            Today
          </span>
        </div>
        <div className="space-y-2.5">
          {conversation.messages.map((message) => {
            const isSellerMessage = message.sender === 'seller';
            const senderLabel =
              String(message.senderLabel || '').trim() ||
              (isSellerMessage ? sellerName : conversation.customerName);

            return (
              <div
                key={message.id}
                className={`flex items-end gap-2 ${isSellerMessage ? 'justify-end' : 'justify-start'}`}
              >
                {!isSellerMessage ? (
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-300 text-[11px] font-semibold text-slate-700">
                    {isHelpCenterConversation ? (
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white">
                        <HelpCenterLogo className="h-4 w-4" />
                      </span>
                    ) : (
                      customerAvatar
                    )}
                  </span>
                ) : null}

                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 text-sm leading-relaxed shadow-sm ${
                    isSellerMessage
                      ? 'rounded-br-sm bg-[#005c4b] text-white'
                      : 'rounded-bl-sm border border-slate-200 bg-white text-slate-900'
                  }`}
                >
                  <p
                    className={`mb-1 text-[10px] font-semibold uppercase tracking-wide ${
                      isSellerMessage ? 'text-emerald-100/90' : 'text-slate-500'
                    }`}
                  >
                    {senderLabel}
                  </p>
                  <p>{message.text}</p>
                  <p
                    className={`mt-1 text-right text-[10px] ${
                      isSellerMessage ? 'text-slate-100/80' : 'text-slate-400'
                    }`}
                  >
                    {message.timeLabel}
                  </p>
                </div>

                {isSellerMessage ? (
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#005c4b] text-[11px] font-semibold text-white">
                    {sellerAvatar}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <footer className="border-t border-slate-200 bg-white px-3 py-3">
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-200"
            aria-label="Attach item"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
          </button>
          <input
            value={draftMessage}
            onChange={(event) => onDraftMessageChange(event.target.value)}
            onKeyDown={(event) => {
              if (isVendorTakeoverBlocked) return;
              if (event.key !== 'Enter') return;
              event.preventDefault();
              onSendMessage();
            }}
            placeholder={isVendorTakeoverBlocked ? 'Admin has taken over this chat' : 'Type a message'}
            disabled={isVendorTakeoverBlocked}
            className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={onSendMessage}
            disabled={isVendorTakeoverBlocked}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white transition hover:bg-slate-800"
            aria-label="Send message"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <path d="M21 3 3 10.5l6.8 2.2L12 20l9-17Z" />
            </svg>
          </button>
        </div>
      </footer>
      <style jsx>{`
        .thread-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(148, 163, 184, 0.9) transparent;
        }
        .thread-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .thread-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .thread-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.9);
          border-radius: 9999px;
        }
      `}</style>
    </section>
  );
}
