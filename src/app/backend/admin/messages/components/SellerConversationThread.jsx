'use client';

import { useEffect, useRef } from 'react';

const getInitials = (name) =>
  String(name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'C';

export default function SellerConversationThread({
  conversation,
  draftMessage,
  onDraftMessageChange,
  onSendMessage,
  onBack,
}) {
  const bodyRef = useRef(null);

  useEffect(() => {
    const container = bodyRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [conversation?.messages]);

  if (!conversation) return null;
  const customerAvatar = getInitials(conversation.customerName);
  const sellerAvatar = 'OC';
  const sellerName = 'OCPRIMES';

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
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
            {getInitials(conversation.customerName)}
          </span>
          <span>
            <p className="text-sm font-semibold text-slate-900">{conversation.customerName}</p>
            <p className="text-xs text-slate-400">{conversation.online ? 'Online' : 'Last seen recently'}</p>
          </span>
        </div>
        <button
          type="button"
          aria-label="Conversation actions"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 5v.01M12 12v.01M12 19v.01" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-4 py-4">
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
                    {customerAvatar}
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
              if (event.key !== 'Enter') return;
              event.preventDefault();
              onSendMessage();
            }}
            placeholder="Type a message"
            className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={onSendMessage}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white transition hover:bg-slate-800"
            aria-label="Send message"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <path d="M21 3 3 10.5l6.8 2.2L12 20l9-17Z" />
            </svg>
          </button>
        </div>
      </footer>
    </section>
  );
}
