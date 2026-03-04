'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { parseOrderInquiryMessage } from '@/lib/chat/inquiry-message';
import { buildThreadItemsWithDateSeparators } from '@/lib/chat/message-date.ts';
import {
  formatVoiceDurationLabel,
  parseVoiceMessageBody,
} from '@/lib/chat/voice-message';
import { useVoiceRecorder } from '@/lib/chat/use-voice-recorder';

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

const MessageStatusIcon = ({ status }) => {
  if (status === 'sending') {
    return (
      <span
        className="inline-block h-2.5 w-2.5 animate-spin rounded-full border border-current border-t-transparent"
        aria-label="Sending"
      />
    );
  }

  if (status === 'read') {
    return (
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-sky-500" fill="none" stroke="currentColor" strokeWidth="1.6" aria-label="Read">
        <path d="m1.8 8.6 2 2L8 5.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m6 8.6 2 2L13 5.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (status === 'delivered') {
    return (
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-label="Delivered">
        <path d="m1.8 8.6 2 2L8 5.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m6 8.6 2 2L13 5.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.6" aria-label="Sent">
      <path d="m3.5 8.5 2.2 2.2L12.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const SendMessageIcon = ({ className = "h-4 w-4" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
    <path
      d="M10.3009 13.6949L20.102 3.89742"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10.5795 14.1355L12.8019 18.5804C13.339 19.6545 13.6075 20.1916 13.9458 20.3356C14.2394 20.4606 14.575 20.4379 14.8492 20.2747C15.1651 20.0866 15.3591 19.5183 15.7472 18.3818L19.9463 6.08434C20.2845 5.09409 20.4535 4.59896 20.3378 4.27142C20.2371 3.98648 20.013 3.76234 19.7281 3.66167C19.4005 3.54595 18.9054 3.71502 17.9151 4.05315L5.61763 8.2523C4.48114 8.64037 3.91289 8.83441 3.72478 9.15032C3.56153 9.42447 3.53891 9.76007 3.66389 10.0536C3.80791 10.3919 4.34498 10.6605 5.41912 11.1975L9.86397 13.42C10.041 13.5085 10.1295 13.5527 10.2061 13.6118C10.2742 13.6643 10.3352 13.7253 10.3876 13.7933C10.4468 13.87 10.491 13.9585 10.5795 14.1355Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const MicIcon = ({ className = 'h-5 w-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <rect x="9" y="3.5" width="6" height="10" rx="3" />
    <path d="M6.5 10.5a5.5 5.5 0 1 0 11 0M12 16v4M9 20h6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function SellerConversationThread({
  conversation,
  draftMessage,
  onDraftMessageChange,
  onSendMessage,
  onSendVoiceMessage = async () => {},
  onLoadOlderMessages = async () => {},
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
  isSending = false,
  isInitialLoading = false,
  isLoadingOlder = false,
  hasMoreOlder = false,
}) {
  const bodyRef = useRef(null);
  const menuRef = useRef(null);
  const loadingOlderLockRef = useRef(false);
  const previousMessageCountRef = useRef(0);
  const nearBottomRef = useRef(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openingOrderMessageId, setOpeningOrderMessageId] = useState('');
  const [voiceError, setVoiceError] = useState('');

  useEffect(() => {
    const container = bodyRef.current;
    if (!container) return;
    previousMessageCountRef.current = Array.isArray(conversation?.messages)
      ? conversation.messages.length
      : 0;
    nearBottomRef.current = true;
    const rafId = window.requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [conversation?.id]);

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

  useEffect(() => {
    if (!bodyRef.current) return;
    const nextCount = Array.isArray(conversation?.messages) ? conversation.messages.length : 0;
    const previousCount = previousMessageCountRef.current;
    previousMessageCountRef.current = nextCount;
    if (nextCount <= previousCount) return;
    if (isLoadingOlder) return;
    if (!nearBottomRef.current) return;
    const container = bodyRef.current;
    const rafId = window.requestAnimationFrame(() => {
      if (!container) return;
      container.scrollTop = container.scrollHeight;
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [conversation?.messages, isLoadingOlder]);

  if (!conversation) return null;
  const isHelpCenterConversation =
    Boolean(conversation.isHelpCenter) ||
    String(conversation.id || '').trim() === HELP_CENTER_VIRTUAL_CONVERSATION_ID;
  const customerAvatar = getInitials(conversation.customerName);
  const effectiveBlockedNotice = String(blockedNotice || '').trim();
  const threadItems = useMemo(
    () => buildThreadItemsWithDateSeparators(conversation.messages),
    [conversation.messages],
  );
  const isComposerBlocked = isVendorTakeoverBlocked || Boolean(effectiveBlockedNotice);
  const handleBodyScroll = async () => {
    const container = bodyRef.current;
    if (!container) return;
    nearBottomRef.current =
      container.scrollHeight - container.scrollTop - container.clientHeight <= 140;
    if (!hasMoreOlder || isInitialLoading || isLoadingOlder || loadingOlderLockRef.current) return;
    if (container.scrollTop > 56) return;
    loadingOlderLockRef.current = true;
    const previousHeight = container.scrollHeight;
    const previousTop = container.scrollTop;
    try {
      await onLoadOlderMessages();
      window.requestAnimationFrame(() => {
        if (!bodyRef.current) return;
        const nextHeight = bodyRef.current.scrollHeight;
        bodyRef.current.scrollTop = Math.max(0, previousTop + (nextHeight - previousHeight));
      });
    } finally {
      loadingOlderLockRef.current = false;
    }
  };
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

  const {
    isSupported: canRecordVoice,
    isRecording,
    isProcessingStop,
    durationSeconds: recordingDurationSeconds,
    toggleRecording,
  } = useVoiceRecorder({
    maxDurationSeconds: 90,
    onError: (message) => {
      setVoiceError(String(message || 'Unable to start voice recording.'));
    },
    onRecorded: ({ blob, durationSeconds, mimeType }) => {
      setVoiceError('');
      Promise.resolve(onSendVoiceMessage({ blob, durationSeconds, mimeType })).catch(() => {
        setVoiceError('Unable to send voice message.');
      });
    },
  });

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
        onScroll={() => {
          void handleBodyScroll();
        }}
        className="thread-scrollbar min-h-0 flex-1 overflow-y-scroll overscroll-contain bg-slate-50 px-4 py-4"
      >
        {isLoadingOlder ? (
          <div className="mb-3 flex justify-center">
            <span className="inline-flex h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
          </div>
        ) : null}
        {isInitialLoading ? (
          <div className="flex min-h-[220px] items-center justify-center">
            <span className="inline-flex h-8 w-8 animate-spin rounded-full border-[3px] border-slate-300 border-t-slate-700" />
          </div>
        ) : null}
        <div className={`space-y-2.5 ${isInitialLoading ? 'hidden' : 'block'}`}>
          {threadItems.map((entry) => {
            if (entry.type === 'day') {
              return (
                <div key={entry.id} className="mb-3 flex justify-center">
                  <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-500">
                    {entry.label}
                  </span>
                </div>
              );
            }

            const message = entry.message;
            const isSellerMessage = message.sender === 'seller';
            const report = parseReportMessage(message.text);
            const orderInquiry = parseOrderInquiryMessage(message.text);
            const voiceMessage = parseVoiceMessageBody(message.text);

            return (
              <div
                key={message.id}
                className={`flex items-end gap-2 ${isSellerMessage ? 'justify-end' : 'justify-start'}`}
              >
                {!isSellerMessage ? (
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-300 text-[11px] font-semibold text-slate-700">
                    {isHelpCenterConversation ? (
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white">
                        <HelpCenterLogo className="h-4 w-4" />
                      </span>
                    ) : (
                      customerAvatar
                    )}
                  </span>
                ) : null}

                <div className="min-w-0 max-w-[78%]">
                  <div
                    className={`rounded-[18px] px-3.5 py-2.5 text-[15px] leading-relaxed ${
                      isSellerMessage
                        ? 'rounded-br-[6px] bg-[linear-gradient(135deg,#5f7cf7_0%,#7f63f4_100%)] text-white shadow-[0_8px_18px_rgba(99,102,241,0.34)]'
                        : 'rounded-bl-[6px] border border-white/90 bg-white text-slate-900 shadow-[0_8px_16px_rgba(15,23,42,0.08)]'
                    }`}
                  >
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
                      <div className="space-y-2.5">
                        <div
                          className={`overflow-hidden rounded-lg border ${
                            isSellerMessage
                              ? 'border-white/35 bg-white/10'
                              : 'border-emerald-200 bg-emerald-50/80 text-slate-900'
                          }`}
                        >
                          <div className={`border-b px-2.5 py-2 ${isSellerMessage ? 'border-white/20' : 'border-emerald-200/80'}`}>
                            <p
                              className={`text-[11px] font-semibold uppercase tracking-wide ${
                                isSellerMessage ? 'text-white/90' : 'text-emerald-700'
                              }`}
                            >
                              Order inquiry
                            </p>
                          </div>
                          <div className="space-y-1 px-2.5 py-2">
                            {orderInquiry.order ? (
                              <p className={`text-xs ${isSellerMessage ? 'text-white' : 'text-slate-700'}`}>
                                Order: {orderInquiry.order}
                              </p>
                            ) : null}
                            {orderInquiry.reference ? (
                              <p className={`text-xs ${isSellerMessage ? 'text-white/90' : 'text-slate-600'}`}>
                                Ref: {orderInquiry.reference}
                              </p>
                            ) : null}
                            {orderInquiry.status ? (
                              <p className={`text-xs ${isSellerMessage ? 'text-white/90' : 'text-slate-600'}`}>
                                Status: {orderInquiry.status}
                              </p>
                            ) : null}
                            {orderInquiry.reason ? (
                              <p className={`text-xs ${isSellerMessage ? 'text-white/90' : 'text-slate-600'}`}>
                                Reason: {orderInquiry.reason}
                              </p>
                            ) : null}
                            {orderInquiry.orderId || orderInquiry.order || orderInquiry.reference ? (
                              <button
                                type="button"
                                onClick={() => {
                                  void openOrderFromInquiry(orderInquiry, message.id);
                                }}
                                disabled={openingOrderMessageId === String(message.id || '')}
                                className={`mt-1 inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                                  isSellerMessage
                                    ? 'bg-white/20 text-white hover:bg-white/30'
                                    : 'bg-slate-900 text-white hover:bg-slate-800'
                                }`}
                              >
                                {openingOrderMessageId === String(message.id || '') ? 'Opening...' : 'View order'}
                              </button>
                            ) : null}
                          </div>
                        </div>
                        {orderInquiry.question ? (
                          <div
                            className={`rounded-md border px-2.5 py-2 ${
                              isSellerMessage ? 'border-white/25 bg-white/10 text-white' : 'border-slate-200 bg-slate-50 text-slate-800'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed">
                              {orderInquiry.question}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    ) : voiceMessage ? (
                      <div className="space-y-2">
                        <div
                          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold ${
                            isSellerMessage ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <MicIcon className="h-3.5 w-3.5" />
                          <span>Voice message</span>
                          <span>{formatVoiceDurationLabel(voiceMessage.durationSeconds)}</span>
                        </div>
                        <audio
                          controls
                          preload="metadata"
                          src={voiceMessage.url}
                          className="h-10 w-full min-w-[12rem] max-w-[18rem]"
                        />
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{message.text}</p>
                    )}
                  </div>
                  <div
                    className={`mt-1 flex items-center gap-1 px-1 text-[11px] ${
                      isSellerMessage ? 'justify-end text-indigo-300' : 'justify-start text-slate-500'
                    }`}
                  >
                    <span>{message.timeLabel}</span>
                    {isSellerMessage ? (
                      <MessageStatusIcon status={String(message.status || 'sent')} />
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <footer className="border-t border-slate-200 bg-white px-3 pb-[calc(env(safe-area-inset-bottom)+0.6rem)] pt-2">
        {voiceError ? (
          <p className="mb-1 px-2 text-xs font-medium text-rose-600">
            {voiceError}
          </p>
        ) : null}
        <div className="relative flex items-center gap-2 overflow-hidden rounded-[26px] border border-white/70 bg-white/55 px-2.5 py-2 shadow-[0_10px_26px_rgba(15,23,42,0.12)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/45">
          <button
            type="button"
            onClick={toggleRecording}
            disabled={isComposerBlocked || isSending || isProcessingStop || !canRecordVoice}
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition ${
              isRecording || isProcessingStop
                ? 'bg-rose-500 text-white shadow-[0_0_0_3px_rgba(244,63,94,0.18)]'
                : 'text-slate-500 hover:bg-slate-100'
            } disabled:cursor-not-allowed disabled:opacity-50`}
            aria-label={isRecording ? 'Stop voice recording' : isProcessingStop ? 'Processing voice recording' : 'Record voice message'}
          >
            <MicIcon />
          </button>
          {isRecording || isProcessingStop ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700">
              <span className={`h-1.5 w-1.5 rounded-full bg-rose-500 ${isProcessingStop ? 'animate-spin' : 'animate-pulse'}`} />
              {isProcessingStop ? 'Sending...' : formatVoiceDurationLabel(recordingDurationSeconds)}
            </span>
          ) : null}
          <div className="relative min-w-0 flex-1">
            <input
              value={draftMessage}
              onChange={(event) => onDraftMessageChange(event.target.value)}
              onKeyDown={(event) => {
                if (isComposerBlocked || isRecording || isProcessingStop) return;
                if (event.key !== "Enter") return;
                event.preventDefault();
                onSendMessage();
              }}
              placeholder={
                isProcessingStop
                  ? 'Sending voice message...'
                  : isRecording
                  ? 'Recording voice... tap mic to stop'
                  : isVendorTakeoverBlocked
                  ? "Admin has taken over this chat"
                  : isComposerBlocked
                    ? "Chat is closed"
                    : "Type a message"
              }
              disabled={isComposerBlocked || isSending || isRecording || isProcessingStop}
              className="h-10 w-full bg-transparent pl-1 pr-12 text-[15px] text-slate-700 placeholder:text-slate-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={onSendMessage}
              disabled={isComposerBlocked || isSending || isRecording || isProcessingStop || !String(draftMessage || "").trim()}
              className="absolute right-1 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-[#0b1734] text-white transition hover:bg-[#0a142d] disabled:cursor-not-allowed disabled:bg-slate-300"
              aria-label="Send message"
            >
              <SendMessageIcon />
            </button>
          </div>
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
