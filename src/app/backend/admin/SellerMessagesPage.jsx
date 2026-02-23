'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import AdminDesktopHeader from '@/components/admin/AdminDesktopHeader';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';
import SellerConversationList from './messages/components/SellerConversationList';
import SellerConversationThread from './messages/components/SellerConversationThread';
import SellerConversationPlaceholder from './messages/components/SellerConversationPlaceholder';

const FILTER_HANDLERS = {
  all: () => true,
  unread: (conversation) => conversation.unreadCount > 0,
  favorites: (conversation) => Boolean(conversation.isFavorite),
  groups: (conversation) => Boolean(conversation.isGroup),
};

const formatTimeLabel = (value) => {
  if (!value) return '--:--';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '--:--';
  return parsed.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const mapConversation = (row) => {
  const customerName = String(row?.customerEmail || '').trim() || 'Customer';
  const vendorEmail = String(row?.vendorEmail || '').trim();
  const productId = String(row?.productId || '').trim();
  const lastMessageAt = row?.lastMessageAt || row?.updatedAt || null;

  return {
    id: String(row?.id || ''),
    customerName,
    customerHandle: vendorEmail ? `Vendor: ${vendorEmail}` : 'Vendor chat',
    online: false,
    unreadCount: Math.max(0, Number(row?.unreadCount || 0)),
    isFavorite: false,
    isGroup: false,
    productId,
    updatedAt: row?.updatedAt || lastMessageAt || new Date().toISOString(),
    lastMessageAtLabel: formatTimeLabel(lastMessageAt),
    lastMessagePreview: String(row?.lastMessagePreview || '').trim() || 'No messages yet.',
    messages: [],
  };
};

const mapMessage = (row, currentUserId, conversation) => {
  const senderUserId = String(row?.senderUserId || '').trim();
  const senderEmail = String(row?.senderEmail || '').trim();
  const customerName = String(conversation?.customerName || '').trim();
  const resolvedCurrentUserId = String(currentUserId || '').trim();

  let isSeller = false;
  if (senderUserId && resolvedCurrentUserId) {
    isSeller = senderUserId === resolvedCurrentUserId;
  } else if (row?.sender === 'self') {
    isSeller = true;
  } else if (senderEmail && customerName) {
    isSeller = senderEmail.toLowerCase() !== customerName.toLowerCase();
  }

  const sender = isSeller ? 'seller' : 'customer';
  const senderLabel = isSeller ? 'OCPRIMES' : customerName || senderEmail || 'Customer';

  return {
    id: String(row?.id || ''),
    sender,
    senderLabel,
    text: String(row?.body || '').trim(),
    timeLabel: formatTimeLabel(row?.createdAt),
  };
};

export default function SellerMessagesPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState('');
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [draftMessage, setDraftMessage] = useState('');
  const [isMobileThreadOpen, setIsMobileThreadOpen] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [pageError, setPageError] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');

  const loadConversations = useCallback(async () => {
    setIsLoadingConversations(true);
    setPageError('');

    const response = await fetch('/api/chat/dashboard/conversations', {
      method: 'GET',
      cache: 'no-store',
    }).catch(() => null);

    if (!response) {
      setPageError('Unable to load conversations right now.');
      setIsLoadingConversations(false);
      return;
    }

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setPageError(String(payload?.error || 'Unable to load conversations.'));
      setIsLoadingConversations(false);
      return;
    }

    const nextUserId = String(payload?.currentUserId || '').trim();
    const mapped = Array.isArray(payload?.conversations)
      ? payload.conversations.map(mapConversation).filter((item) => item.id)
      : [];

    setCurrentUserId(nextUserId);
    setConversations(mapped);
    setActiveConversationId((previousId) => {
      if (previousId && mapped.some((item) => item.id === previousId)) return previousId;
      return mapped[0]?.id || '';
    });
    setIsLoadingConversations(false);
  }, []);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadInitial = async () => {
      await loadConversations();
      if (cancelled) return;
    };

    void loadInitial();

    return () => {
      cancelled = true;
    };
  }, [loadConversations]);

  useEffect(() => {
    const channel = supabase
      .channel('dashboard-chat-stream')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const conversationId = String(payload.new?.conversation_id || '').trim();
          const senderUserId = String(payload.new?.sender_user_id || '').trim();
          const body = String(payload.new?.body || '').trim();
          const createdAt = String(payload.new?.created_at || '').trim();
          const messageId = String(payload.new?.id || '').trim();

          if (!conversationId || !messageId || !body) return;

          setConversations((previous) => {
            const exists = previous.some((conversation) => conversation.id === conversationId);
            if (!exists) {
              void loadConversations();
              return previous;
            }

            return previous.map((conversation) => {
              if (conversation.id !== conversationId) return conversation;

              const isSelf = senderUserId === currentUserId;
              const nextMessages = Array.isArray(conversation.messages)
                ? conversation.messages.some((message) => message.id === messageId)
                  ? conversation.messages
                  : [
                      ...conversation.messages,
                      {
                        id: messageId,
                        sender: isSelf ? 'seller' : 'customer',
                        senderLabel: isSelf ? 'OCPRIMES' : conversation.customerName,
                        text: body,
                        timeLabel: formatTimeLabel(createdAt),
                      },
                    ]
                : [];

              return {
                ...conversation,
                messages: nextMessages,
                updatedAt: createdAt || new Date().toISOString(),
                lastMessageAtLabel: formatTimeLabel(createdAt || new Date().toISOString()),
                lastMessagePreview: body,
                unreadCount:
                  activeConversationId === conversationId || isSelf
                    ? conversation.unreadCount
                    : conversation.unreadCount + 1,
              };
            });
          });
        },
      );

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeConversationId, currentUserId, loadConversations, supabase]);

  const filteredConversations = useMemo(() => {
    const safeFilterFn = FILTER_HANDLERS[activeFilter] || FILTER_HANDLERS.all;
    const normalizedQuery = searchText.trim().toLowerCase();
    return [...conversations]
      .filter((conversation) => safeFilterFn(conversation))
      .filter((conversation) => {
        if (!normalizedQuery) return true;
        const haystack = `${conversation.customerName} ${conversation.customerHandle} ${conversation.lastMessagePreview}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      })
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
  }, [activeFilter, conversations, searchText]);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) || null,
    [activeConversationId, conversations],
  );

  const loadMessages = async (conversationId) => {
    if (!conversationId) return;

    setIsLoadingMessages(true);
    setPageError('');

    const response = await fetch(
      `/api/chat/dashboard/conversations/${encodeURIComponent(conversationId)}/messages?limit=200`,
      {
        method: 'GET',
        cache: 'no-store',
      },
    ).catch(() => null);

    if (!response) {
      setPageError('Unable to load messages right now.');
      setIsLoadingMessages(false);
      return;
    }

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setPageError(String(payload?.error || 'Unable to load messages.'));
      setIsLoadingMessages(false);
      return;
    }

    const resolvedCurrentUserId = String(payload?.currentUserId || currentUserId || '').trim();
    if (resolvedCurrentUserId && resolvedCurrentUserId !== currentUserId) {
      setCurrentUserId(resolvedCurrentUserId);
    }

    const selectedConversation =
      conversations.find((conversation) => conversation.id === conversationId) || null;

    const messages = Array.isArray(payload?.messages)
      ? payload.messages
          .map((row) => mapMessage(row, resolvedCurrentUserId, selectedConversation))
          .filter((item) => item.id && item.text)
      : [];

    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              messages,
            }
          : conversation,
      ),
    );

    setIsLoadingMessages(false);
  };

  useEffect(() => {
    if (!activeConversationId) return;
    const selected = conversations.find((conversation) => conversation.id === activeConversationId);
    if (!selected) return;
    if (Array.isArray(selected.messages) && selected.messages.length > 0) return;
    void loadMessages(activeConversationId);
  }, [activeConversationId, conversations]);

  const selectConversation = (conversationId) => {
    setActiveConversationId(conversationId);
    setIsMobileThreadOpen(true);
    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation,
      ),
    );
  };

  const sendMessage = async () => {
    const text = draftMessage.trim();
    if (!text || !activeConversationId || isSending) return;

    setIsSending(true);
    setPageError('');

    const response = await fetch(
      `/api/chat/dashboard/conversations/${encodeURIComponent(activeConversationId)}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body: text }),
      },
    ).catch(() => null);

    if (!response) {
      setPageError('Unable to send message right now.');
      setIsSending(false);
      return;
    }

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setPageError(String(payload?.error || 'Unable to send message.'));
      setIsSending(false);
      return;
    }

    const resolvedCurrentUserId = String(payload?.currentUserId || currentUserId || '').trim();
    if (resolvedCurrentUserId && resolvedCurrentUserId !== currentUserId) {
      setCurrentUserId(resolvedCurrentUserId);
    }

    const inserted = mapMessage(payload?.message, resolvedCurrentUserId, activeConversation);
    if (!inserted.id || !inserted.text) {
      setIsSending(false);
      setDraftMessage('');
      return;
    }

    setConversations((previous) =>
      previous.map((conversation) => {
        if (conversation.id !== activeConversationId) return conversation;
        const alreadyExists = conversation.messages.some((message) => message.id === inserted.id);
        const nextMessages = alreadyExists
          ? conversation.messages
          : [...conversation.messages, inserted];
        return {
          ...conversation,
          messages: nextMessages,
          updatedAt: payload?.message?.createdAt || new Date().toISOString(),
          lastMessageAtLabel: formatTimeLabel(payload?.message?.createdAt || new Date().toISOString()),
          lastMessagePreview: inserted.text,
        };
      }),
    );

    setDraftMessage('');
    setIsSending(false);
  };

  const showThreadOnMobile = Boolean(isMobileThreadOpen && activeConversation);

  return (
    <div className="h-[calc(100dvh-4rem)] overflow-hidden bg-white text-slate-900 lg:h-[100dvh]">
      <div className="flex h-full overflow-hidden">
        <AdminSidebar />
        <main className="flex-1 overflow-hidden px-4 sm:px-6 lg:px-10">
          <AdminDesktopHeader />
          <div className="-mx-4 h-full w-auto overflow-hidden sm:-mx-6 lg:-mx-10 lg:h-[calc(100dvh-6.5rem)]">
            <div className="grid h-full min-h-0 lg:overflow-hidden lg:rounded-2xl">
              {pageError ? (
                <div className="mx-4 mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 sm:mx-6 lg:mx-10">
                  {pageError}
                </div>
              ) : null}
              <div className="grid h-full min-h-0 lg:grid-cols-[360px_1fr]">
                <div className={showThreadOnMobile ? 'hidden lg:block' : 'block'}>
                  <SellerConversationList
                    conversations={filteredConversations}
                    selectedConversationId={activeConversationId}
                    onSelectConversation={selectConversation}
                    searchValue={searchText}
                    onSearchChange={setSearchText}
                    activeFilter={activeFilter}
                    onFilterChange={setActiveFilter}
                  />
                </div>

                {activeConversation ? (
                  <div className={showThreadOnMobile ? 'block' : 'hidden lg:block'}>
                    <SellerConversationThread
                      conversation={
                        isLoadingMessages && activeConversation.messages.length === 0
                          ? {
                              ...activeConversation,
                              messages: [
                                {
                                  id: 'loading-message',
                                  sender: 'customer',
                                  senderLabel: activeConversation.customerName,
                                  text: 'Loading messages...',
                                  timeLabel: '--:--',
                                },
                              ],
                            }
                          : activeConversation
                      }
                      draftMessage={draftMessage}
                      onDraftMessageChange={setDraftMessage}
                      onSendMessage={sendMessage}
                      onBack={() => setIsMobileThreadOpen(false)}
                    />
                  </div>
                ) : (
                  <SellerConversationPlaceholder />
                )}
              </div>
            </div>
          </div>

          {isLoadingConversations ? (
            <div className="px-2 py-2 text-xs text-slate-400">Loading conversations...</div>
          ) : null}
          {isSending ? (
            <div className="px-2 py-2 text-xs text-slate-400">Sending message...</div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
