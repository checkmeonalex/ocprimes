'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
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
const HELP_CENTER_VIRTUAL_CONVERSATION_ID = '__help_center__';
const HELP_CENTER_BODY_PROMPT = 'Ask your question and we will help you';
const ADMIN_EMAIL = 'ocprimes@gmail.com';

const formatTimeLabel = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const toEmailAlias = (email) => {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return '';
  const [localPart] = normalized.split('@');
  if (localPart) return localPart;
  return normalized.replace(/@/g, '');
};

const normalizeValue = (value) => String(value || '').trim().toLowerCase();

const mapConversation = (row) => {
  const customerEmail = String(row?.customerEmail || '').trim();
  const customerName =
    String(row?.customerName || '').trim() ||
    toEmailAlias(customerEmail) ||
    'Customer';
  const sellerName =
    String(row?.vendorName || '').trim() ||
    'Seller';
  const vendorEmail = String(row?.vendorEmail || '').trim();
  const productId = String(row?.productId || '').trim();
  const customerUserId = String(row?.customerUserId || '').trim();
  const vendorUserId = String(row?.vendorUserId || '').trim();
  const lastMessageAt = row?.lastMessageAt || row?.updatedAt || null;

  return {
    id: String(row?.id || ''),
    customerUserId,
    vendorUserId,
    customerEmail,
    vendorEmail,
    customerName,
    sellerName,
    customerHandle: vendorEmail ? `Vendor: ${vendorEmail}` : 'Vendor chat',
    online: Boolean(row?.customerOnline),
    presenceLabel: String(row?.customerPresenceLabel || '').trim() || 'Last seen recently',
    unreadCount: Math.max(0, Number(row?.unreadCount || 0)),
    isFavorite: false,
    isGroup: false,
    productId,
    adminTakeoverEnabled: Boolean(row?.adminTakeoverEnabled),
    adminTakeoverBy: String(row?.adminTakeoverBy || '').trim(),
    adminTakeoverAt: row?.adminTakeoverAt || null,
    updatedAt: row?.updatedAt || lastMessageAt || new Date().toISOString(),
    lastMessageAtLabel: formatTimeLabel(lastMessageAt),
    lastMessagePreview: String(row?.lastMessagePreview || '').trim() || 'No messages yet.',
    messages: [],
  };
};

const mapMessage = (row, currentUserId, conversation) => {
  const senderUserId = String(row?.senderUserId || '').trim();
  const senderEmail = String(row?.senderEmail || '').trim();
  const senderName = String(row?.senderName || '').trim();
  const customerName = String(conversation?.customerName || '').trim();
  const sellerName = String(conversation?.sellerName || '').trim();
  const customerUserId = String(conversation?.customerUserId || '').trim();
  const vendorUserId = String(conversation?.vendorUserId || '').trim();
  const resolvedCurrentUserId = String(currentUserId || '').trim();

  let isSeller = false;
  if (senderUserId && customerUserId) {
    isSeller = senderUserId !== customerUserId;
  } else if (senderUserId && resolvedCurrentUserId) {
    isSeller = senderUserId === resolvedCurrentUserId;
  } else if (row?.sender === 'self') {
    isSeller = true;
  } else if (senderEmail && customerName) {
    isSeller = senderEmail.toLowerCase() !== customerName.toLowerCase();
  }

  const sender = isSeller ? 'seller' : 'customer';
  const isAdminMessage =
    isSeller && vendorUserId && senderUserId && senderUserId !== vendorUserId;
  const customerFallback = toEmailAlias(senderEmail) || 'Customer';
  const senderLabel = isSeller
    ? isAdminMessage
      ? 'OCPRIMES'
      : sellerName || senderEmail || 'Seller'
    : customerName || senderName || customerFallback;

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
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState('');
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [draftMessage, setDraftMessage] = useState('');
  const [isMobileThreadOpen, setIsMobileThreadOpen] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isDeletingConversation, setIsDeletingConversation] = useState(false);
  const [isTogglingTakeover, setIsTogglingTakeover] = useState(false);
  const [pageError, setPageError] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentRole, setCurrentRole] = useState('');
  const [isHelpCenterOpen, setIsHelpCenterOpen] = useState(false);
  const requestedConversationId = useMemo(
    () => String(searchParams.get('conversation') || '').trim(),
    [searchParams],
  );
  const isHelpCenterEnabled = Boolean(currentRole) && currentRole !== 'admin';
  const helpCenterTargetConversation = useMemo(
    () =>
      conversations.find((conversation) => {
        const customerEmail = normalizeValue(conversation.customerEmail);
        const vendorEmail = normalizeValue(conversation.vendorEmail);
        const customerAlias = normalizeValue(toEmailAlias(conversation.customerEmail));
        const customerName = normalizeValue(conversation.customerName);
        return (
          customerEmail === ADMIN_EMAIL ||
          vendorEmail === ADMIN_EMAIL ||
          customerAlias === 'ocprimes' ||
          customerName === 'ocprimes'
        );
      }) || null,
    [conversations],
  );

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
    const nextRole = String(payload?.role || '').trim();
    const mapped = Array.isArray(payload?.conversations)
      ? payload.conversations.map(mapConversation).filter((item) => item.id)
      : [];

    setCurrentUserId(nextUserId);
    setCurrentRole(nextRole);
    setConversations(mapped);
    if (nextRole === 'admin') {
      setIsHelpCenterOpen(false);
    }
    setActiveConversationId((previousId) => {
      if (previousId && mapped.some((item) => item.id === previousId)) return previousId;
      return '';
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

              const conversationCustomerUserId = String(conversation.customerUserId || '').trim();
              const conversationVendorUserId = String(conversation.vendorUserId || '').trim();
              const isSellerMessage = conversationCustomerUserId
                ? senderUserId !== conversationCustomerUserId
                : senderUserId === currentUserId;
              const isAdminMessage =
                conversationVendorUserId && senderUserId && senderUserId !== conversationVendorUserId;
              const nextMessages = Array.isArray(conversation.messages)
                ? conversation.messages.some((message) => message.id === messageId)
                  ? conversation.messages
                  : [
                      ...conversation.messages,
                      {
                        id: messageId,
                        sender: isSellerMessage ? 'seller' : 'customer',
                        senderLabel: isSellerMessage
                          ? isAdminMessage
                            ? 'OCPRIMES'
                            : conversation.sellerName || 'Seller'
                          : conversation.customerName,
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
                  activeConversationId === conversationId || isSellerMessage
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
  const helpCenterConversation = useMemo(
    () => ({
      id: HELP_CENTER_VIRTUAL_CONVERSATION_ID,
      customerUserId: helpCenterTargetConversation?.customerUserId || '',
      vendorUserId: helpCenterTargetConversation?.vendorUserId || '',
      customerEmail: helpCenterTargetConversation?.customerEmail || '',
      vendorEmail: helpCenterTargetConversation?.vendorEmail || '',
      customerName: 'Help Center',
      sellerName: 'OCPRIMES',
      customerHandle: 'ocprimes',
      online: false,
      presenceLabel: helpCenterTargetConversation ? 'Available' : 'Connecting...',
      unreadCount: 0,
      isFavorite: false,
      isGroup: false,
      productId: helpCenterTargetConversation?.productId || '',
      adminTakeoverEnabled: false,
      adminTakeoverBy: '',
      adminTakeoverAt: null,
      updatedAt: helpCenterTargetConversation?.updatedAt || new Date().toISOString(),
      lastMessageAtLabel: helpCenterTargetConversation?.lastMessageAtLabel || '',
      lastMessagePreview: helpCenterTargetConversation?.lastMessagePreview || HELP_CENTER_BODY_PROMPT,
      messages:
        Array.isArray(helpCenterTargetConversation?.messages) &&
        helpCenterTargetConversation.messages.length > 0
          ? helpCenterTargetConversation.messages
          : [
              {
                id: 'help-center-intro',
                sender: 'customer',
                senderLabel: 'Help Center',
                text: HELP_CENTER_BODY_PROMPT,
                timeLabel: '',
              },
            ],
      isHelpCenter: true,
      linkedConversationId: helpCenterTargetConversation?.id || '',
    }),
    [helpCenterTargetConversation],
  );
  const selectedConversation = isHelpCenterOpen ? helpCenterConversation : activeConversation;

  useEffect(() => {
    if (!requestedConversationId) return;
    if (activeConversationId === requestedConversationId) return;
    const exists = conversations.some((conversation) => conversation.id === requestedConversationId);
    if (!exists) return;

    setActiveConversationId(requestedConversationId);
    setIsMobileThreadOpen(true);
    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id === requestedConversationId
          ? { ...conversation, unreadCount: 0 }
          : conversation,
      ),
    );
  }, [activeConversationId, conversations, requestedConversationId]);

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
    const resolvedRole = String(payload?.role || currentRole || '').trim();
    if (resolvedCurrentUserId && resolvedCurrentUserId !== currentUserId) {
      setCurrentUserId(resolvedCurrentUserId);
    }
    if (resolvedRole && resolvedRole !== currentRole) {
      setCurrentRole(resolvedRole);
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
              adminTakeoverEnabled: Boolean(payload?.conversation?.adminTakeoverEnabled),
              adminTakeoverBy: String(payload?.conversation?.adminTakeoverBy || '').trim(),
              adminTakeoverAt: payload?.conversation?.adminTakeoverAt || null,
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

  useEffect(() => {
    if (!isHelpCenterOpen) return;
    if (!helpCenterTargetConversation?.id) return;
    if (
      Array.isArray(helpCenterTargetConversation.messages) &&
      helpCenterTargetConversation.messages.length > 0
    ) {
      return;
    }
    void loadMessages(helpCenterTargetConversation.id);
  }, [helpCenterTargetConversation, isHelpCenterOpen]);

  const selectConversation = (conversationId) => {
    if (conversationId === HELP_CENTER_VIRTUAL_CONVERSATION_ID && isHelpCenterEnabled) {
      setIsHelpCenterOpen(true);
      setActiveConversationId('');
      setIsMobileThreadOpen(true);
      return;
    }
    setIsHelpCenterOpen(false);
    setActiveConversationId(conversationId);
    setIsMobileThreadOpen(true);
    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation,
      ),
    );
  };

  const deleteActiveConversation = async () => {
    if (!activeConversationId || isDeletingConversation) return;
    const selectedConversation = conversations.find(
      (conversation) => conversation.id === activeConversationId,
    );
    const label = String(selectedConversation?.customerName || '').trim() || 'this customer';
    const confirmed = window.confirm(
      `Delete this conversation with ${label}? This will remove all messages permanently.`,
    );
    if (!confirmed) return;

    setIsDeletingConversation(true);
    setPageError('');

    const response = await fetch(
      `/api/chat/dashboard/conversations/${encodeURIComponent(activeConversationId)}`,
      {
        method: 'DELETE',
      },
    ).catch(() => null);

    if (!response) {
      setPageError('Unable to delete conversation right now.');
      setIsDeletingConversation(false);
      return;
    }

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setPageError(String(payload?.error || 'Unable to delete conversation.'));
      setIsDeletingConversation(false);
      return;
    }

    const deletedConversationId = String(
      payload?.deletedConversationId || activeConversationId,
    ).trim();

    setConversations((previous) =>
      previous.filter((conversation) => conversation.id !== deletedConversationId),
    );
    setActiveConversationId('');
    setDraftMessage('');
    setIsMobileThreadOpen(false);
    setIsDeletingConversation(false);
  };

  const toggleAdminTakeover = async () => {
    if (!activeConversationId || currentRole !== 'admin' || isTogglingTakeover) return;
    const nextTakeoverState = !Boolean(activeConversation?.adminTakeoverEnabled);
    const confirmText = nextTakeoverState
      ? 'Take over this chat? Seller will no longer be able to send messages.'
      : 'Return access to the seller for this chat?';
    if (!window.confirm(confirmText)) return;

    setIsTogglingTakeover(true);
    setPageError('');

    const response = await fetch(
      `/api/chat/dashboard/conversations/${encodeURIComponent(activeConversationId)}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminTakeoverEnabled: nextTakeoverState }),
      },
    ).catch(() => null);

    if (!response) {
      setPageError('Unable to update takeover status right now.');
      setIsTogglingTakeover(false);
      return;
    }

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setPageError(String(payload?.error || 'Unable to update takeover status.'));
      setIsTogglingTakeover(false);
      return;
    }

    const updatedConversationId = String(payload?.conversation?.id || activeConversationId).trim();
    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id === updatedConversationId
          ? {
              ...conversation,
              adminTakeoverEnabled: Boolean(payload?.conversation?.adminTakeoverEnabled),
              adminTakeoverBy: String(payload?.conversation?.adminTakeoverBy || '').trim(),
              adminTakeoverAt: payload?.conversation?.adminTakeoverAt || null,
            }
          : conversation,
      ),
    );
    setIsTogglingTakeover(false);
  };

  const sendMessage = async () => {
    const text = draftMessage.trim();
    const isVendorTakeoverBlocked =
      !isHelpCenterOpen && currentRole === 'vendor' && Boolean(activeConversation?.adminTakeoverEnabled);
    const destinationConversationId = isHelpCenterOpen
      ? String(helpCenterTargetConversation?.id || '').trim()
      : String(activeConversationId || '').trim();
    const destinationConversation = isHelpCenterOpen ? helpCenterTargetConversation : activeConversation;
    if (!text || !destinationConversationId || isSending || isDeletingConversation || isVendorTakeoverBlocked) {
      if (text && isHelpCenterOpen && !destinationConversationId) {
        setPageError('Help Center chat is still connecting. Try again in a moment.');
      }
      return;
    }

    setIsSending(true);
    setPageError('');

    const response = await fetch(
      `/api/chat/dashboard/conversations/${encodeURIComponent(destinationConversationId)}/messages`,
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
    const resolvedRole = String(payload?.role || currentRole || '').trim();
    if (resolvedCurrentUserId && resolvedCurrentUserId !== currentUserId) {
      setCurrentUserId(resolvedCurrentUserId);
    }
    if (resolvedRole && resolvedRole !== currentRole) {
      setCurrentRole(resolvedRole);
    }

    const inserted = mapMessage(payload?.message, resolvedCurrentUserId, destinationConversation);
    if (!inserted.id || !inserted.text) {
      setIsSending(false);
      setDraftMessage('');
      return;
    }

    setConversations((previous) =>
      previous.map((conversation) => {
        if (conversation.id !== destinationConversationId) return conversation;
        const alreadyExists = conversation.messages.some((message) => message.id === inserted.id);
        const nextMessages = alreadyExists
          ? conversation.messages
          : [...conversation.messages, inserted];
        return {
          ...conversation,
          adminTakeoverEnabled: Boolean(payload?.conversation?.adminTakeoverEnabled),
          adminTakeoverBy: String(payload?.conversation?.adminTakeoverBy || '').trim(),
          adminTakeoverAt: payload?.conversation?.adminTakeoverAt || null,
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

  const showThreadOnMobile = Boolean(isMobileThreadOpen && selectedConversation);

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
              <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)] lg:grid-cols-[360px_minmax(0,1fr)]">
                <div
                  className={`${showThreadOnMobile ? 'hidden lg:block' : 'block'} h-full min-h-0 overflow-hidden`}
                >
                  <SellerConversationList
                    conversations={filteredConversations}
                    selectedConversationId={
                      isHelpCenterOpen ? HELP_CENTER_VIRTUAL_CONVERSATION_ID : activeConversationId
                    }
                    onSelectConversation={selectConversation}
                    showHelpCenter={isHelpCenterEnabled}
                    searchValue={searchText}
                    onSearchChange={setSearchText}
                    activeFilter={activeFilter}
                    onFilterChange={setActiveFilter}
                  />
                </div>

                {selectedConversation ? (
                  <div
                    className={`${showThreadOnMobile ? 'block' : 'hidden lg:block'} h-full min-h-0 overflow-hidden`}
                  >
                    <SellerConversationThread
                      conversation={
                        isLoadingMessages && !isHelpCenterOpen && activeConversation?.messages.length === 0
                          ? {
                              ...activeConversation,
                              messages: [
                                {
                                  id: 'loading-message',
                                  sender: 'customer',
                                  senderLabel: activeConversation.customerName,
                                  text: 'Loading messages...',
                                  timeLabel: '',
                                },
                              ],
                            }
                          : selectedConversation
                      }
                      draftMessage={draftMessage}
                      onDraftMessageChange={setDraftMessage}
                      onSendMessage={sendMessage}
                      onBack={() => setIsMobileThreadOpen(false)}
                      onDeleteConversation={deleteActiveConversation}
                      isDeletingConversation={isDeletingConversation}
                      isVendorTakeoverBlocked={
                        isHelpCenterOpen
                          ? false
                          : currentRole === 'vendor' && Boolean(activeConversation?.adminTakeoverEnabled)
                      }
                      isAdmin={currentRole === 'admin'}
                      onToggleTakeover={toggleAdminTakeover}
                      isTogglingTakeover={isTogglingTakeover}
                    />
                  </div>
                ) : (
                  <div className="h-full min-h-0">
                    <SellerConversationPlaceholder />
                  </div>
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
          {isDeletingConversation ? (
            <div className="px-2 py-2 text-xs text-slate-400">Deleting conversation...</div>
          ) : null}
          {isTogglingTakeover ? (
            <div className="px-2 py-2 text-xs text-slate-400">Updating chat access...</div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
