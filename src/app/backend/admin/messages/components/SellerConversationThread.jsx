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

const REPORT_TITLE = 'Support Report';

const parseReportMessage = (rawText) => {
  const text = String(rawText || '').trim();
  if (!text) return null;
  const lines = text.split('\n').map((line) => String(line || '').trim()).filter(Boolean);
  if (!lines.length || lines[0] !== REPORT_TITLE) return null;

  const getField = (prefix) =>
    lines.find((line) => line.toLowerCase().startsWith(`${prefix.toLowerCase()}:`))?.slice(prefix.length + 1).trim() || '';

  const reason = getField('Reason');
  const reportedSeller = getField('Reported seller');
  const productId = getField('Product ID');
  const sourceChatId = getField('Source chat ID');
  const conversationUrl = getField('Conversation URL');
  const productUrl = getField('Product URL');
  const details = getField('Details');

  return {
    reason,
    reportedSeller,
    productId,
    sourceChatId,
    conversationUrl,
    productUrl,
    details,
  };
};

const parseOrderInquiryMessage = (rawText) => {
  const text = String(rawText || '').trim();
  if (!text.startsWith('[Order Inquiry]')) return null;
  const lines = text
    .split('\n')
    .map((line) => String(line || '').trim())
    .filter(Boolean);

  const getField = (prefix) =>
    lines.find((line) => line.toLowerCase().startsWith(`${prefix.toLowerCase()}:`))?.slice(prefix.length + 1).trim() || '';

  const orderId = getField('Order ID');
  const order = getField('Order');
  const reference = getField('Reference');
  const status = getField('Status');
  const question = getField('Question');

  return {
    orderId,
    order,
    reference,
    status,
    question,
  };
};

export default function SellerConversationThread({
  conversation,
  draftMessage,
  onDraftMessageChange,
  onSendMessage,
  onBack,
  onDeleteConversation,
  onClearConversation,
  isDeletingConversation = false,
  isClearingConversation = false,
  isVendorTakeoverBlocked = false,
  blockedNotice = '',
  isAdmin = false,
  onToggleTakeover,
  isTogglingTakeover = false,
  onReopenConversation,
  isReopeningConversation = false,
}) {
  const bodyRef = useRef(null);
  const menuRef = useRef(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openingOrderMessageId, setOpeningOrderMessageId] = useState('');

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
  const effectiveBlockedNotice = String(blockedNotice || '').trim();
  const isComposerBlocked = isVendorTakeoverBlocked || Boolean(effectiveBlockedNotice);
  const openOrderFromInquiry = async (inquiry, messageId) => {
    if (!inquiry) return;
    const orderId = String(inquiry.orderId || '').trim();
    const orderRef = String(inquiry.order || inquiry.reference || '').trim();
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (orderId && uuidPattern.test(orderId)) {
      window.location.href = `/backend/admin/orders/${encodeURIComponent(orderId)}`;
      return;
    }

    setOpeningOrderMessageId(String(messageId || ''));
    try {
      const searchTarget = orderRef || orderId;
      if (!searchTarget) {
        window.location.href = '/backend/admin/orders';
        return;
      }
      const response = await fetch(
        `/api/admin/orders?page=1&per_page=1&search=${encodeURIComponent(searchTarget)}`,
        { method: 'GET', cache: 'no-store' },
      ).catch(() => null);
      if (!response?.ok) {
        window.location.href = '/backend/admin/orders';
        return;
      }
      const payload = await response.json().catch(() => null);
      const resolvedId = String(payload?.items?.[0]?.id || '').trim();
      if (resolvedId) {
        window.location.href = `/backend/admin/orders/${encodeURIComponent(resolvedId)}`;
        return;
      }
      window.location.href = '/backend/admin/orders';
    } finally {
      setOpeningOrderMessageId('');
    }
  };

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
                <>
                  {conversation.closedAt ? (
                    <button
                      type="button"
                      disabled={isReopeningConversation}
                      onClick={() => {
                        setIsMenuOpen(false);
                        onReopenConversation?.();
                      }}
                      className="flex w-full items-center px-3 py-2 text-left text-sm text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Reopen chat
                    </button>
                  ) : (
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
                  )}
                </>
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
                End chat
              </button>
              <button
                type="button"
                disabled={isClearingConversation}
                onClick={() => {
                  setIsMenuOpen(false);
                  onClearConversation?.();
                }}
                className="flex w-full items-center px-3 py-2 text-left text-sm text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Clear chat
              </button>
            </div>
          ) : null}
        </div>
      </header>
      {isComposerBlocked ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-800">
          {effectiveBlockedNotice || 'Admin has taken over this chat. You can no longer send messages in this conversation.'}
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
            const report = parseReportMessage(message.text);
            const orderInquiry = parseOrderInquiryMessage(message.text);

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
                  {report ? (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">Support Report</p>
                      {report.reason ? (
                        <p>
                          <span className="font-medium">Reason:</span> {report.reason}
                        </p>
                      ) : null}
                      {report.reportedSeller ? (
                        <p>
                          <span className="font-medium">Reported seller:</span> {report.reportedSeller}
                        </p>
                      ) : null}
                      {report.details ? (
                        <p>
                          <span className="font-medium">Details:</span> {report.details}
                        </p>
                      ) : null}
                      <div className="flex flex-wrap gap-2">
                        {(report.conversationUrl || report.sourceChatId) ? (
                          <a
                            href={report.conversationUrl || `/backend/admin/messages?conversation=${encodeURIComponent(report.sourceChatId)}`}
                            className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                              isSellerMessage
                                ? 'bg-white/20 text-white hover:bg-white/30'
                                : 'bg-slate-900 text-white hover:bg-slate-800'
                            }`}
                          >
                            Open conversation
                          </a>
                        ) : null}
                        {(report.productUrl || report.productId) ? (
                          <a
                            href={report.productUrl || `/product/${encodeURIComponent(report.productId)}`}
                            className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                              isSellerMessage
                                ? 'bg-white/20 text-white hover:bg-white/30'
                                : 'bg-slate-900 text-white hover:bg-slate-800'
                            }`}
                          >
                            Open product
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ) : orderInquiry ? (
                    <div className="space-y-2">
                      <div
                        className={`rounded-md border p-2 ${
                          isSellerMessage
                            ? 'border-emerald-300 bg-emerald-700/25'
                            : 'border-emerald-200 bg-emerald-50 text-slate-900'
                        }`}
                      >
                        <p className={`text-sm font-semibold ${isSellerMessage ? 'text-emerald-100' : 'text-emerald-700'}`}>
                          Order Inquiry
                        </p>
                        {orderInquiry.order ? (
                          <p className={`mt-1 text-xs ${isSellerMessage ? 'text-emerald-50' : 'text-slate-700'}`}>
                            Order: {orderInquiry.order}
                          </p>
                        ) : null}
                        {orderInquiry.reference ? (
                          <p className={`text-xs ${isSellerMessage ? 'text-emerald-50' : 'text-slate-600'}`}>
                            Ref: {orderInquiry.reference}
                          </p>
                        ) : null}
                        {orderInquiry.status ? (
                          <p className={`text-xs ${isSellerMessage ? 'text-emerald-50' : 'text-slate-600'}`}>
                            Status: {orderInquiry.status}
                          </p>
                        ) : null}
                        {orderInquiry.orderId || orderInquiry.order || orderInquiry.reference ? (
                          <button
                            type="button"
                            onClick={() => {
                              void openOrderFromInquiry(orderInquiry, message.id);
                            }}
                            disabled={openingOrderMessageId === String(message.id || '')}
                            className={`mt-2 inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                              isSellerMessage
                                ? 'bg-white/20 text-white hover:bg-white/30'
                                : 'bg-slate-900 text-white hover:bg-slate-800'
                            }`}
                          >
                            {openingOrderMessageId === String(message.id || '') ? 'Opening...' : 'View order'}
                          </button>
                        ) : null}
                      </div>
                      {orderInquiry.question ? <p className="whitespace-pre-wrap break-words">{orderInquiry.question}</p> : null}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap break-words">{message.text}</p>
                  )}
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
              if (isComposerBlocked) return;
              if (event.key !== 'Enter') return;
              event.preventDefault();
              onSendMessage();
            }}
            placeholder={
              isVendorTakeoverBlocked
                ? 'Admin has taken over this chat'
                : isComposerBlocked
                  ? 'Chat is closed'
                  : 'Type a message'
            }
            disabled={isComposerBlocked}
            className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={onSendMessage}
            disabled={isComposerBlocked}
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
