'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';
import AdminDesktopHeader from '@/components/admin/AdminDesktopHeader';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';
import {
  formatConversationLastMessageLabel,
  formatMessageTimeLabel,
} from '@/lib/chat/time-label.ts';
import {
  buildVoiceMessageBody,
  toChatMessagePreview,
} from '@/lib/chat/voice-message';
import SellerConversationList from './messages/components/SellerConversationList';
import SellerConversationThread from './messages/components/SellerConversationThread';
import SellerConversationPlaceholder from './messages/components/SellerConversationPlaceholder';
import { useAlerts } from '@/context/AlertContext';

const FILTER_HANDLERS = {
  all: () => true,
  unread: (conversation) => conversation.unreadCount > 0,
  favorites: (conversation) => Boolean(conversation.isFavorite),
  groups: (conversation) => Boolean(conversation.isGroup),
};
const HELP_CENTER_VIRTUAL_CONVERSATION_ID = '__help_center__';
const HELP_CENTER_BODY_PROMPT = 'Ask your question and we will help you';
const ADMIN_EMAIL = 'ocprimes@gmail.com';
const MESSAGE_PAGE_SIZE = 10;

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
    closedAt: row?.closedAt || null,
    closedReason: String(row?.closedReason || '').trim(),
    canSend: row?.canSend !== false,
    participantNotice: String(row?.participantNotice || '').trim(),
    updatedAt: row?.updatedAt || lastMessageAt || new Date().toISOString(),
    lastMessageAtLabel: formatConversationLastMessageLabel(lastMessageAt),
    lastMessagePreview: toChatMessagePreview(row?.lastMessagePreview, 'No messages yet.'),
    messages: [],
    hasLoadedMessages: false,
    isHelpCenter: row?.isHelpCenter === true,
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
  const senderEmailNormalized = normalizeValue(senderEmail);
  const isSenderSuperAdmin = senderEmailNormalized === ADMIN_EMAIL;

  let isSeller = false;
  if (senderUserId && resolvedCurrentUserId) {
    isSeller = senderUserId === resolvedCurrentUserId;
  } else if (senderUserId && customerUserId) {
    isSeller = senderUserId !== customerUserId;
  } else if (row?.sender === 'self') {
    isSeller = true;
  } else if (senderEmail && customerName) {
    isSeller = senderEmail.toLowerCase() !== customerName.toLowerCase();
  }

  const sender = isSeller ? 'seller' : 'customer';
  const rawStatus = String(row?.status || '').trim().toLowerCase();
  const normalizedStatus =
    rawStatus === 'sending' || rawStatus === 'read' || rawStatus === 'delivered'
      ? rawStatus
      : 'sent';
  const isAdminMessage = isSeller && isSenderSuperAdmin;
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
    timeLabel: formatMessageTimeLabel(row?.createdAt),
    createdAt: row?.createdAt || null,
    status: sender === 'seller' ? normalizedStatus : undefined,
  };
};

export default function SellerMessagesPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const { confirmAlert } = useAlerts();
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState('');
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [draftMessage, setDraftMessage] = useState('');
  const [isMobileThreadOpen, setIsMobileThreadOpen] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [messageStateByConversation, setMessageStateByConversation] = useState({});
  const [isSending, setIsSending] = useState(false);
  const [isDeletingConversation, setIsDeletingConversation] = useState(false);
  const [isClearingConversation, setIsClearingConversation] = useState(false);
  const [isTogglingTakeover, setIsTogglingTakeover] = useState(false);
  const [isReopeningConversation, setIsReopeningConversation] = useState(false);
  const [pageError, setPageError] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentRole, setCurrentRole] = useState('');
  const [isHelpCenterOpen, setIsHelpCenterOpen] = useState(false);
  const [isConnectingHelpCenter, setIsConnectingHelpCenter] = useState(false);
  const [helpCenterConversationId, setHelpCenterConversationId] = useState('');
  const [hasAttemptedHelpCenterConnect, setHasAttemptedHelpCenterConnect] = useState(false);
  const requestedConversationId = useMemo(
    () => String(searchParams.get('conversation') || '').trim(),
    [searchParams],
  );
  const isHelpCenterEnabled = Boolean(currentRole) && currentRole !== 'admin';
  const helpCenterTargetConversation = useMemo(() => {
    const targetById =
      conversations.find((conversation) => conversation.id === helpCenterConversationId) || null;
    if (targetById) return targetById;
    return conversations.find((conversation) => conversation.isHelpCenter === true) || null;
  }, [conversations, helpCenterConversationId]);

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
    setConversations((previous) => {
      const previousById = new Map(
        previous.map((conversation) => [String(conversation.id || '').trim(), conversation]),
      );
      return mapped.map((conversation) => {
        const existing = previousById.get(String(conversation.id || '').trim());
        if (!existing) return conversation;
        return {
          ...conversation,
          hasLoadedMessages: existing.hasLoadedMessages === true,
          messages:
            Array.isArray(existing.messages) && existing.messages.length > 0
              ? existing.messages
              : [],
        };
      });
    });
    setMessageStateByConversation((previous) => {
      const next = {};
      mapped.forEach((conversation) => {
        const id = String(conversation.id || '').trim();
        if (!id) return;
        const existing = previous[id] || {};
        next[id] = {
          isLoadingInitial: Boolean(existing.isLoadingInitial),
          isLoadingOlder: Boolean(existing.isLoadingOlder),
          hasMore: typeof existing.hasMore === 'boolean' ? existing.hasMore : true,
          nextBefore: String(existing.nextBefore || '').trim(),
        };
      });
      return next;
    });
    if (nextRole === 'admin') {
      setIsHelpCenterOpen(false);
    }
    setActiveConversationId((previousId) => {
      if (previousId && mapped.some((item) => item.id === previousId)) return previousId;
      return '';
    });
    const payloadHelpCenterConversationId = String(payload?.helpCenterConversationId || '').trim();
    const mappedHelpCenterConversation = mapped.find((conversation) => conversation.isHelpCenter === true);
    setHelpCenterConversationId((previousId) => {
      if (mappedHelpCenterConversation?.id) return mappedHelpCenterConversation.id;
      if (
        payloadHelpCenterConversationId &&
        mapped.some((conversation) => conversation.id === payloadHelpCenterConversationId)
      ) {
        return payloadHelpCenterConversationId;
      }
      if (previousId && mapped.some((item) => item.id === previousId)) return previousId;
      return '';
    });
    if (mappedHelpCenterConversation?.id) {
      setHasAttemptedHelpCenterConnect(true);
    }
    setIsLoadingConversations(false);
  }, []);

  const connectHelpCenterConversation = useCallback(async ({ silent = false } = {}) => {
    if (!isHelpCenterEnabled) return null;
    if (helpCenterTargetConversation?.id) {
      setHelpCenterConversationId(helpCenterTargetConversation.id);
      setHasAttemptedHelpCenterConnect(true);
      return helpCenterTargetConversation;
    }
    if (isConnectingHelpCenter) return null;

    setIsConnectingHelpCenter(true);
    setHasAttemptedHelpCenterConnect(true);
    if (!silent) setPageError('');

    const response = await fetch('/api/chat/dashboard/help-center', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }).catch(() => null);

    if (!response) {
      if (!silent) setPageError('Unable to initialize Help Center chat right now.');
      setIsConnectingHelpCenter(false);
      return null;
    }

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      if (!silent) setPageError(String(payload?.error || 'Unable to initialize Help Center chat.'));
      setIsConnectingHelpCenter(false);
      return null;
    }

    const mappedConversation = payload?.conversation
      ? { ...mapConversation(payload.conversation), isHelpCenter: true }
      : null;
    if (mappedConversation?.id) {
      setConversations((previous) => {
        const exists = previous.some((conversation) => conversation.id === mappedConversation.id);
        if (exists) {
          return previous.map((conversation) =>
            conversation.id === mappedConversation.id
              ? { ...conversation, ...mappedConversation }
              : conversation,
          );
        }
        return [mappedConversation, ...previous];
      });
      setHelpCenterConversationId(mappedConversation.id);
      setIsConnectingHelpCenter(false);
      return mappedConversation;
    }

    setIsConnectingHelpCenter(false);
    return null;
  }, [helpCenterTargetConversation, isConnectingHelpCenter, isHelpCenterEnabled]);

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
    if (!isHelpCenterEnabled) return;
    if (isLoadingConversations || hasAttemptedHelpCenterConnect || isConnectingHelpCenter) return;
    void connectHelpCenterConversation({ silent: true });
  }, [
    connectHelpCenterConversation,
    hasAttemptedHelpCenterConnect,
    isConnectingHelpCenter,
    isHelpCenterEnabled,
    isLoadingConversations,
  ]);

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

              const conversationVendorUserId = String(conversation.vendorUserId || '').trim();
              const isSellerMessage = senderUserId === currentUserId;
              const isAdminMessage = isSellerMessage && conversationVendorUserId !== currentUserId;
              const insertedMessage = mapMessage(
                {
                  id: messageId,
                  senderUserId,
                  body,
                  createdAt,
                  status: isSellerMessage ? 'delivered' : undefined,
                },
                currentUserId,
                conversation,
              );
              const shouldAppendToLoadedThread =
                conversation.hasLoadedMessages === true &&
                (
                  activeConversationId === conversationId ||
                  (isHelpCenterOpen &&
                    String(helpCenterTargetConversation?.id || '').trim() === conversationId)
                );
              const alreadyExists = conversation.messages.some((message) => message.id === messageId);
              const nextMessages = Array.isArray(conversation.messages)
                ? shouldAppendToLoadedThread
                  ? alreadyExists
                    ? conversation.messages.map((message) =>
                        message.id === messageId
                          ? {
                              ...message,
                              ...insertedMessage,
                              senderLabel:
                                insertedMessage.sender === 'seller'
                                  ? isAdminMessage
                                    ? 'OCPRIMES'
                                    : conversation.sellerName || 'Seller'
                                  : insertedMessage.senderLabel || conversation.customerName,
                            }
                          : message,
                      )
                    : [...conversation.messages, insertedMessage]
                  : conversation.messages
                : [];
              const isActiveThreadConversation =
                activeConversationId === conversationId ||
                (isHelpCenterOpen &&
                  String(helpCenterTargetConversation?.id || '').trim() === conversationId);

              return {
                ...conversation,
                messages: nextMessages,
                updatedAt: createdAt || new Date().toISOString(),
                lastMessageAtLabel: formatConversationLastMessageLabel(
                  createdAt || new Date().toISOString(),
                ),
                lastMessagePreview: toChatMessagePreview(body),
                unreadCount:
                  isActiveThreadConversation || isSellerMessage
                    ? conversation.unreadCount
                    : conversation.unreadCount + 1,
              };
            });
          });
        },
      );

    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'chat_conversations' },
      (payload) => {
        const conversationId = String(payload.new?.id || '').trim();
        if (!conversationId) return;
        const closedAt = payload.new?.closed_at || null;
        const closedReason = String(payload.new?.closed_reason || '').trim();
        const participantNotice = closedAt
          ? closedReason === 'product_unavailable'
            ? 'This chat was closed because this product is unavailable and will disappear in 7 days.'
            : closedReason === 'inactive'
              ? 'This chat was closed due to inactivity and will disappear in 7 days.'
              : 'This chat is closed and will disappear in 7 days.'
          : '';

        setConversations((previous) =>
          previous.map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,
                  closedAt,
                  closedReason,
                  canSend: !closedAt,
                  participantNotice,
                  updatedAt: String(payload.new?.updated_at || '').trim() || conversation.updatedAt,
                }
              : conversation,
          ),
        );
      },
    );

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [
    activeConversationId,
    currentUserId,
    helpCenterTargetConversation,
    isHelpCenterOpen,
    loadConversations,
    supabase,
  ]);

  const filteredConversations = useMemo(() => {
    const safeFilterFn = FILTER_HANDLERS[activeFilter] || FILTER_HANDLERS.all;
    const normalizedQuery = searchText.trim().toLowerCase();
    const hiddenConversationId =
      isHelpCenterEnabled && helpCenterTargetConversation?.id
        ? String(helpCenterTargetConversation.id).trim()
        : '';
    return [...conversations]
      .filter((conversation) => (isHelpCenterEnabled ? conversation.isHelpCenter !== true : true))
      .filter((conversation) =>
        hiddenConversationId ? String(conversation.id || '').trim() !== hiddenConversationId : true,
      )
      .filter((conversation) => safeFilterFn(conversation))
      .filter((conversation) => {
        if (!normalizedQuery) return true;
        const haystack = `${conversation.customerName} ${conversation.customerHandle} ${conversation.lastMessagePreview}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      })
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
  }, [activeFilter, conversations, helpCenterTargetConversation, isHelpCenterEnabled, searchText]);

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
      presenceLabel: 'Available',
      unreadCount: 0,
      isFavorite: false,
      isGroup: false,
      productId: helpCenterTargetConversation?.productId || '',
      adminTakeoverEnabled: false,
      adminTakeoverBy: '',
      adminTakeoverAt: null,
      closedAt: helpCenterTargetConversation?.closedAt || null,
      canSend: helpCenterTargetConversation?.canSend !== false,
      participantNotice: String(helpCenterTargetConversation?.participantNotice || '').trim(),
      updatedAt: helpCenterTargetConversation?.updatedAt || new Date().toISOString(),
      lastMessageAtLabel: helpCenterTargetConversation?.lastMessageAtLabel || '',
      lastMessagePreview: helpCenterTargetConversation?.lastMessagePreview || HELP_CENTER_BODY_PROMPT,
      hasLoadedMessages: helpCenterTargetConversation?.hasLoadedMessages === true,
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

  const loadMessages = useCallback(
    async (conversationId, { loadOlder = false } = {}) => {
      const safeConversationId = String(conversationId || '').trim();
      if (!safeConversationId) return;

      const previousMeta = messageStateByConversation[safeConversationId] || {};
      if (loadOlder) {
        if (previousMeta.isLoadingOlder || previousMeta.isLoadingInitial) return;
      } else if (previousMeta.isLoadingInitial) {
        return;
      }

      setMessageStateByConversation((previous) => ({
        ...previous,
        [safeConversationId]: {
          isLoadingInitial: loadOlder ? Boolean(previous[safeConversationId]?.isLoadingInitial) : true,
          isLoadingOlder: loadOlder ? true : Boolean(previous[safeConversationId]?.isLoadingOlder),
          hasMore:
            typeof previous[safeConversationId]?.hasMore === 'boolean'
              ? previous[safeConversationId].hasMore
              : true,
          nextBefore: String(previous[safeConversationId]?.nextBefore || '').trim(),
        },
      }));
      setPageError('');

      const params = new URLSearchParams({
        limit: String(MESSAGE_PAGE_SIZE),
      });
      if (loadOlder) {
        const cursor = String(previousMeta.nextBefore || '').trim();
        if (!cursor) {
          setMessageStateByConversation((previous) => ({
            ...previous,
            [safeConversationId]: {
              ...(previous[safeConversationId] || {}),
              isLoadingOlder: false,
              hasMore: false,
            },
          }));
          return;
        }
        params.set('before', cursor);
      }

      const response = await fetch(
        `/api/chat/dashboard/conversations/${encodeURIComponent(safeConversationId)}/messages?${params.toString()}`,
        {
          method: 'GET',
          cache: 'no-store',
        },
      ).catch(() => null);

      if (!response) {
        setPageError('Unable to load messages right now.');
        setMessageStateByConversation((previous) => ({
          ...previous,
          [safeConversationId]: {
            ...(previous[safeConversationId] || {}),
            isLoadingInitial: false,
            isLoadingOlder: false,
          },
        }));
        return;
      }

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setPageError(String(payload?.error || 'Unable to load messages.'));
        setMessageStateByConversation((previous) => ({
          ...previous,
          [safeConversationId]: {
            ...(previous[safeConversationId] || {}),
            isLoadingInitial: false,
            isLoadingOlder: false,
          },
        }));
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
        conversations.find((conversation) => conversation.id === safeConversationId) || null;

      const pageMessages = Array.isArray(payload?.messages)
        ? payload.messages
            .map((row) => mapMessage(row, resolvedCurrentUserId, selectedConversation))
            .filter((item) => item.id && item.text)
        : [];

      setConversations((previous) =>
        previous.map((conversation) => {
          if (conversation.id !== safeConversationId) return conversation;
          const existingMessages = Array.isArray(conversation.messages) ? conversation.messages : [];
          const mergedMessages = loadOlder
            ? [...pageMessages, ...existingMessages]
            : pageMessages;
          const deduped = Array.from(
            new Map(mergedMessages.map((message) => [String(message.id || ''), message])).values(),
          );
          deduped.sort(
            (left, right) => new Date(left.createdAt || 0).getTime() - new Date(right.createdAt || 0).getTime(),
          );

          return {
            ...conversation,
            adminTakeoverEnabled: Boolean(payload?.conversation?.adminTakeoverEnabled),
            adminTakeoverBy: String(payload?.conversation?.adminTakeoverBy || '').trim(),
            adminTakeoverAt: payload?.conversation?.adminTakeoverAt || null,
            closedAt: payload?.conversation?.closedAt || conversation.closedAt || null,
            canSend: payload?.conversation?.canSend !== false,
            participantNotice: String(payload?.conversation?.participantNotice || '').trim(),
            messages: deduped,
            hasLoadedMessages: true,
            unreadCount: 0,
          };
        }),
      );

      const nextBefore = String(payload?.pagination?.nextBefore || '').trim();
      const hasMore = Boolean(payload?.pagination?.hasMore);
      setMessageStateByConversation((previous) => ({
        ...previous,
        [safeConversationId]: {
          ...(previous[safeConversationId] || {}),
          isLoadingInitial: false,
          isLoadingOlder: false,
          hasMore,
          nextBefore,
        },
      }));
    },
    [conversations, currentRole, currentUserId, messageStateByConversation],
  );

  useEffect(() => {
    if (!activeConversationId) return;
    const selected = conversations.find((conversation) => conversation.id === activeConversationId);
    if (!selected) return;
    if (selected.hasLoadedMessages === true) return;
    void loadMessages(activeConversationId, { loadOlder: false });
  }, [activeConversationId, conversations, loadMessages]);

  useEffect(() => {
    if (!isHelpCenterOpen) return;
    if (!helpCenterTargetConversation?.id) {
      if (!hasAttemptedHelpCenterConnect && !isConnectingHelpCenter) {
        void connectHelpCenterConversation();
      }
      return;
    }
    if (
      Array.isArray(helpCenterTargetConversation.messages) &&
      helpCenterTargetConversation.messages.length > 0 &&
      helpCenterTargetConversation.hasLoadedMessages === true
    ) {
      return;
    }
    void loadMessages(helpCenterTargetConversation.id, { loadOlder: false });
  }, [
    connectHelpCenterConversation,
    hasAttemptedHelpCenterConnect,
    helpCenterTargetConversation,
    isConnectingHelpCenter,
    isHelpCenterOpen,
    loadMessages,
  ]);

  const selectConversation = (conversationId) => {
    if (conversationId === HELP_CENTER_VIRTUAL_CONVERSATION_ID && isHelpCenterEnabled) {
      setIsHelpCenterOpen(true);
      setActiveConversationId('');
      setIsMobileThreadOpen(true);
      if (!hasAttemptedHelpCenterConnect) {
        setHasAttemptedHelpCenterConnect(true);
      }
      if (!helpCenterTargetConversation?.id) {
        void connectHelpCenterConversation();
      }
      return;
    }
    setIsHelpCenterOpen(false);
    setHasAttemptedHelpCenterConnect(false);
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
    const confirmed = await confirmAlert({
      type: 'warning',
      title: 'End chat',
      message: `End this conversation with ${label}? Customer and seller will no longer be able to send messages.`,
      confirmLabel: 'End chat',
      cancelLabel: 'Cancel',
    });
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
      setPageError('Unable to end conversation right now.');
      setIsDeletingConversation(false);
      return;
    }

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setPageError(String(payload?.error || 'Unable to end conversation.'));
      setIsDeletingConversation(false);
      return;
    }

    const updatedConversationId = String(
      payload?.conversation?.id || activeConversationId,
    ).trim();
    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id === updatedConversationId
          ? {
              ...conversation,
              closedAt: payload?.conversation?.closedAt || conversation.closedAt || new Date().toISOString(),
              canSend: payload?.conversation?.canSend !== false,
              participantNotice: String(payload?.conversation?.participantNotice || '').trim(),
            }
          : conversation,
      ),
    );
    setDraftMessage('');
    setIsDeletingConversation(false);
  };

  const clearActiveConversation = async () => {
    if (!activeConversationId || isClearingConversation) return;
    const selectedConversation = conversations.find(
      (conversation) => conversation.id === activeConversationId,
    );
    const label = String(selectedConversation?.customerName || '').trim() || 'this customer';
    const confirmed = await confirmAlert({
      type: 'warning',
      title: 'Clear chat',
      message: `Clear this chat with ${label}? This permanently deletes all messages for this conversation and cannot be undone.`,
      confirmLabel: 'Clear chat',
      cancelLabel: 'Cancel',
    });
    if (!confirmed) return;

    setIsClearingConversation(true);
    setPageError('');

    const response = await fetch(
      `/api/chat/dashboard/conversations/${encodeURIComponent(activeConversationId)}/clear`,
      {
        method: 'DELETE',
      },
    ).catch(() => null);

    if (!response) {
      setPageError('Unable to clear chat right now.');
      setIsClearingConversation(false);
      return;
    }

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setPageError(String(payload?.error || 'Unable to clear chat.'));
      setIsClearingConversation(false);
      return;
    }

    const removedConversationId = String(
      payload?.conversationId || activeConversationId,
    ).trim();
    setConversations((previous) =>
      previous.filter((conversation) => conversation.id !== removedConversationId),
    );
    setActiveConversationId((previous) =>
      previous === removedConversationId ? '' : previous,
    );
    setDraftMessage('');
    setIsMobileThreadOpen(false);
    if (helpCenterConversationId && removedConversationId === helpCenterConversationId) {
      setHelpCenterConversationId('');
    }
    setIsClearingConversation(false);
  };

  const toggleAdminTakeover = async () => {
    if (!activeConversationId || currentRole !== 'admin' || isTogglingTakeover) return;
    const nextTakeoverState = !Boolean(activeConversation?.adminTakeoverEnabled);
    const confirmText = nextTakeoverState
      ? 'Take over this chat? Seller will no longer be able to send messages.'
      : 'Return access to the seller for this chat?';
    const confirmed = await confirmAlert({
      type: 'warning',
      title: nextTakeoverState ? 'Take over chat' : 'Return seller access',
      message: confirmText,
      confirmLabel: nextTakeoverState ? 'Take over' : 'Return access',
      cancelLabel: 'Cancel',
    });
    if (!confirmed) return;

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

  const reopenActiveConversation = async () => {
    if (!activeConversationId || currentRole !== 'admin' || isReopeningConversation) return;
    setIsReopeningConversation(true);
    setPageError('');

    const response = await fetch(
      `/api/chat/dashboard/conversations/${encodeURIComponent(activeConversationId)}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reopenChat: true }),
      },
    ).catch(() => null);

    if (!response) {
      setPageError('Unable to reopen chat right now.');
      setIsReopeningConversation(false);
      return;
    }

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setPageError(String(payload?.error || 'Unable to reopen chat.'));
      setIsReopeningConversation(false);
      return;
    }

    const updatedConversationId = String(payload?.conversation?.id || activeConversationId).trim();
    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id === updatedConversationId
          ? {
              ...conversation,
              closedAt: payload?.conversation?.closedAt || null,
              canSend: payload?.conversation?.canSend !== false,
              participantNotice: String(payload?.conversation?.participantNotice || '').trim(),
            }
          : conversation,
      ),
    );
    setIsReopeningConversation(false);
  };

  const sendMessage = async () => {
    const text = draftMessage.trim();
    const isVendorTakeoverBlocked =
      !isHelpCenterOpen && currentRole === 'vendor' && Boolean(activeConversation?.adminTakeoverEnabled);
    const isConversationClosedBlocked =
      currentRole !== 'admin' &&
      (
        (isHelpCenterOpen && helpCenterTargetConversation && helpCenterTargetConversation.canSend === false) ||
        (!isHelpCenterOpen && activeConversation && activeConversation.canSend === false)
      );
    let resolvedHelpCenterConversation = helpCenterTargetConversation;
    if (isHelpCenterOpen && !resolvedHelpCenterConversation?.id) {
      resolvedHelpCenterConversation = await connectHelpCenterConversation();
    }
    const destinationConversationId = isHelpCenterOpen
      ? String(resolvedHelpCenterConversation?.id || '').trim()
      : String(activeConversationId || '').trim();
    const destinationConversation = isHelpCenterOpen
      ? resolvedHelpCenterConversation
      : activeConversation;
    if (
      !text ||
      !destinationConversationId ||
      isSending ||
      isDeletingConversation ||
      isClearingConversation ||
      isVendorTakeoverBlocked ||
      isConversationClosedBlocked
    ) {
      if (text && isHelpCenterOpen && !destinationConversationId) {
        setPageError('Unable to connect Help Center chat. Please try again.');
      }
      return;
    }
    const optimisticId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimisticSenderLabel =
      currentRole === 'admin'
        ? 'OCPRIMES'
        : String(destinationConversation?.sellerName || '').trim() || 'Seller';
    const optimisticMessage = {
      id: optimisticId,
      sender: 'seller',
      senderLabel: optimisticSenderLabel,
      text,
      timeLabel: formatMessageTimeLabel(new Date().toISOString()),
      createdAt: new Date().toISOString(),
      status: 'sending',
    };

    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id !== destinationConversationId
          ? conversation
          : {
              ...conversation,
              messages: [...conversation.messages, optimisticMessage],
              hasLoadedMessages: true,
              updatedAt: new Date().toISOString(),
              lastMessageAtLabel: formatConversationLastMessageLabel(new Date().toISOString()),
              lastMessagePreview: toChatMessagePreview(text),
            },
      ),
    );
    setDraftMessage('');

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
      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.id !== destinationConversationId
            ? conversation
            : {
                ...conversation,
                messages: conversation.messages.filter((message) => message.id !== optimisticId),
              },
        ),
      );
      setDraftMessage(text);
      setIsSending(false);
      return;
    }

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setPageError(String(payload?.error || 'Unable to send message.'));
      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.id !== destinationConversationId
            ? conversation
            : {
                ...conversation,
                messages: conversation.messages.filter((message) => message.id !== optimisticId),
              },
        ),
      );
      setDraftMessage(text);
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
      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.id !== destinationConversationId
            ? conversation
            : {
                ...conversation,
                messages: conversation.messages.filter((message) => message.id !== optimisticId),
              },
        ),
      );
      setDraftMessage(text);
      setIsSending(false);
      return;
    }

    setConversations((previous) =>
      previous.map((conversation) => {
        if (conversation.id !== destinationConversationId) return conversation;
        const alreadyExists = conversation.messages.some((message) => message.id === inserted.id);
        const nextMessages = alreadyExists
          ? conversation.messages.filter((message) => message.id !== optimisticId)
          : conversation.messages.map((message) =>
              message.id === optimisticId
                ? {
                    ...inserted,
                    status: inserted.sender === 'seller' ? 'sent' : inserted.status,
                  }
                : message,
            );
        return {
          ...conversation,
          adminTakeoverEnabled: Boolean(payload?.conversation?.adminTakeoverEnabled),
          adminTakeoverBy: String(payload?.conversation?.adminTakeoverBy || '').trim(),
          adminTakeoverAt: payload?.conversation?.adminTakeoverAt || null,
          closedAt: payload?.conversation?.closedAt || conversation.closedAt || null,
          canSend: payload?.conversation?.canSend !== false,
          participantNotice: String(payload?.conversation?.participantNotice || '').trim(),
          messages: nextMessages,
          hasLoadedMessages: true,
          updatedAt: payload?.message?.createdAt || new Date().toISOString(),
          lastMessageAtLabel: formatConversationLastMessageLabel(
            payload?.message?.createdAt || new Date().toISOString(),
          ),
          lastMessagePreview: toChatMessagePreview(inserted.text),
        };
      }),
    );

    setIsSending(false);
  };

  const sendVoiceMessage = async ({ blob, durationSeconds, mimeType }) => {
    if (!(blob instanceof Blob) || blob.size <= 0 || isSending) return;

    const isVendorTakeoverBlocked =
      !isHelpCenterOpen && currentRole === 'vendor' && Boolean(activeConversation?.adminTakeoverEnabled);
    const isConversationClosedBlocked =
      currentRole !== 'admin' &&
      (
        (isHelpCenterOpen && helpCenterTargetConversation && helpCenterTargetConversation.canSend === false) ||
        (!isHelpCenterOpen && activeConversation && activeConversation.canSend === false)
      );

    let resolvedHelpCenterConversation = helpCenterTargetConversation;
    if (isHelpCenterOpen && !resolvedHelpCenterConversation?.id) {
      resolvedHelpCenterConversation = await connectHelpCenterConversation();
    }

    const destinationConversationId = isHelpCenterOpen
      ? String(resolvedHelpCenterConversation?.id || '').trim()
      : String(activeConversationId || '').trim();
    const destinationConversation = isHelpCenterOpen
      ? resolvedHelpCenterConversation
      : activeConversation;

    if (
      !destinationConversationId ||
      isDeletingConversation ||
      isClearingConversation ||
      isVendorTakeoverBlocked ||
      isConversationClosedBlocked
    ) {
      if (isHelpCenterOpen && !destinationConversationId) {
        setPageError('Unable to connect Help Center chat. Please try again.');
      }
      return;
    }

    setIsSending(true);
    setPageError('');

    const optimisticId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const localVoiceUrl = URL.createObjectURL(blob);
    const optimisticVoiceBody = buildVoiceMessageBody({
      url: localVoiceUrl,
      durationSeconds: Math.max(1, Number(durationSeconds) || 0),
    });
    if (!optimisticVoiceBody) {
      URL.revokeObjectURL(localVoiceUrl);
      setPageError('Unable to send voice message.');
      setIsSending(false);
      return;
    }
    const optimisticSenderLabel =
      currentRole === 'admin'
        ? 'OCPRIMES'
        : String(destinationConversation?.sellerName || '').trim() || 'Seller';
    const optimisticMessage = {
      id: optimisticId,
      sender: 'seller',
      senderLabel: optimisticSenderLabel,
      text: optimisticVoiceBody,
      timeLabel: formatMessageTimeLabel(new Date().toISOString()),
      createdAt: new Date().toISOString(),
      status: 'sending',
    };

    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id !== destinationConversationId
          ? conversation
          : {
              ...conversation,
              messages: [...conversation.messages, optimisticMessage],
              hasLoadedMessages: true,
              updatedAt: new Date().toISOString(),
              lastMessageAtLabel: formatConversationLastMessageLabel(new Date().toISOString()),
              lastMessagePreview: toChatMessagePreview(optimisticVoiceBody),
            },
      ),
    );

    const fallbackType = String(mimeType || blob.type || 'audio/webm').trim().toLowerCase();
    const fileExt =
      fallbackType.includes('ogg')
        ? 'ogg'
        : fallbackType.includes('mp4')
          ? 'mp4'
          : fallbackType.includes('mpeg')
            ? 'mp3'
            : fallbackType.includes('wav')
              ? 'wav'
              : 'webm';
    const voiceFile = new File([blob], `voice-${Date.now()}.${fileExt}`, {
      type: fallbackType || 'audio/webm',
    });
    const uploadFormData = new FormData();
    uploadFormData.set('audio', voiceFile);
    uploadFormData.set('durationSeconds', String(Math.max(1, Number(durationSeconds) || 0)));

    const uploadResponse = await fetch(
      `/api/chat/dashboard/conversations/${encodeURIComponent(destinationConversationId)}/voice`,
      {
        method: 'POST',
        body: uploadFormData,
      },
    ).catch(() => null);

    if (!uploadResponse) {
      setPageError('Unable to upload voice message right now.');
      URL.revokeObjectURL(localVoiceUrl);
      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.id !== destinationConversationId
            ? conversation
            : {
                ...conversation,
                messages: conversation.messages.filter((message) => message.id !== optimisticId),
              },
        ),
      );
      setIsSending(false);
      return;
    }

    const uploadPayload = await uploadResponse.json().catch(() => null);
    if (!uploadResponse.ok) {
      setPageError(String(uploadPayload?.error || 'Unable to upload voice message.'));
      URL.revokeObjectURL(localVoiceUrl);
      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.id !== destinationConversationId
            ? conversation
            : {
                ...conversation,
                messages: conversation.messages.filter((message) => message.id !== optimisticId),
              },
        ),
      );
      setIsSending(false);
      return;
    }

    const voiceBody = buildVoiceMessageBody({
      url: String(uploadPayload?.url || '').trim(),
      durationSeconds: Number(uploadPayload?.durationSeconds || durationSeconds || 0),
    });
    if (!voiceBody) {
      setPageError('Unable to send voice message.');
      URL.revokeObjectURL(localVoiceUrl);
      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.id !== destinationConversationId
            ? conversation
            : {
                ...conversation,
                messages: conversation.messages.filter((message) => message.id !== optimisticId),
              },
        ),
      );
      setIsSending(false);
      return;
    }

    const response = await fetch(
      `/api/chat/dashboard/conversations/${encodeURIComponent(destinationConversationId)}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body: voiceBody }),
      },
    ).catch(() => null);

    if (!response) {
      setPageError('Unable to send voice message right now.');
      URL.revokeObjectURL(localVoiceUrl);
      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.id !== destinationConversationId
            ? conversation
            : {
                ...conversation,
                messages: conversation.messages.filter((message) => message.id !== optimisticId),
              },
        ),
      );
      setIsSending(false);
      return;
    }

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setPageError(String(payload?.error || 'Unable to send voice message.'));
      URL.revokeObjectURL(localVoiceUrl);
      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.id !== destinationConversationId
            ? conversation
            : {
                ...conversation,
                messages: conversation.messages.filter((message) => message.id !== optimisticId),
              },
        ),
      );
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
      URL.revokeObjectURL(localVoiceUrl);
      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.id !== destinationConversationId
            ? conversation
            : {
                ...conversation,
                messages: conversation.messages.filter((message) => message.id !== optimisticId),
              },
        ),
      );
      setIsSending(false);
      return;
    }

    setConversations((previous) =>
      previous.map((conversation) => {
        if (conversation.id !== destinationConversationId) return conversation;
        const alreadyExists = conversation.messages.some((message) => message.id === inserted.id);
        const nextMessages = alreadyExists
          ? conversation.messages.filter((message) => message.id !== optimisticId)
          : conversation.messages.map((message) =>
              message.id === optimisticId
                ? {
                    ...inserted,
                    status: inserted.sender === 'seller' ? 'sent' : inserted.status,
                  }
                : message,
            );
        return {
          ...conversation,
          adminTakeoverEnabled: Boolean(payload?.conversation?.adminTakeoverEnabled),
          adminTakeoverBy: String(payload?.conversation?.adminTakeoverBy || '').trim(),
          adminTakeoverAt: payload?.conversation?.adminTakeoverAt || null,
          closedAt: payload?.conversation?.closedAt || conversation.closedAt || null,
          canSend: payload?.conversation?.canSend !== false,
          participantNotice: String(payload?.conversation?.participantNotice || '').trim(),
          messages: nextMessages,
          hasLoadedMessages: true,
          updatedAt: payload?.message?.createdAt || new Date().toISOString(),
          lastMessageAtLabel: formatConversationLastMessageLabel(
            payload?.message?.createdAt || new Date().toISOString(),
          ),
          lastMessagePreview: toChatMessagePreview(inserted.text),
        };
      }),
    );
    URL.revokeObjectURL(localVoiceUrl);

    setIsSending(false);
  };

  const showThreadOnMobile = Boolean(isMobileThreadOpen && selectedConversation);
  const activeThreadConversationId = useMemo(() => {
    if (isHelpCenterOpen) {
      return String(helpCenterTargetConversation?.id || '').trim();
    }
    return String(activeConversationId || '').trim();
  }, [activeConversationId, helpCenterTargetConversation, isHelpCenterOpen]);
  const activeThreadMessageState = activeThreadConversationId
    ? messageStateByConversation[activeThreadConversationId] || {}
    : {};
  const isInitialLoadingThread =
    Boolean(activeThreadMessageState?.isLoadingInitial) &&
    (!selectedConversation || selectedConversation.hasLoadedMessages !== true);
  const isLoadingOlderThread = Boolean(activeThreadMessageState?.isLoadingOlder);
  const hasMoreOlderThread = Boolean(activeThreadMessageState?.hasMore);

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
                    helpCenterConversation={helpCenterTargetConversation}
                    isLoading={isLoadingConversations}
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
                      conversation={selectedConversation}
                      draftMessage={draftMessage}
                      onDraftMessageChange={setDraftMessage}
                      onSendMessage={sendMessage}
                      onSendVoiceMessage={sendVoiceMessage}
                      onLoadOlderMessages={async () => {
                        if (!activeThreadConversationId) return;
                        await loadMessages(activeThreadConversationId, { loadOlder: true });
                      }}
                      onBack={() => setIsMobileThreadOpen(false)}
                      onDeleteConversation={deleteActiveConversation}
                      isDeletingConversation={isDeletingConversation}
                      onClearConversation={clearActiveConversation}
                      isClearingConversation={isClearingConversation}
                      isVendorTakeoverBlocked={
                        isHelpCenterOpen
                          ? false
                          : currentRole === 'vendor' && Boolean(activeConversation?.adminTakeoverEnabled)
                      }
                      blockedNotice={
                        currentRole !== 'admin'
                          ? (
                              isHelpCenterOpen
                                ? (helpCenterTargetConversation?.canSend === false
                                  ? helpCenterTargetConversation?.participantNotice || 'This chat is closed.'
                                  : '')
                                : (activeConversation?.canSend === false
                                  ? activeConversation?.participantNotice || 'This chat is closed.'
                                  : '')
                            )
                          : ''
                      }
                      isAdmin={currentRole === 'admin'}
                      onToggleTakeover={toggleAdminTakeover}
                      isTogglingTakeover={isTogglingTakeover}
                      onReopenConversation={reopenActiveConversation}
                      isReopeningConversation={isReopeningConversation}
                      isInitialLoading={isInitialLoadingThread}
                      isLoadingOlder={isLoadingOlderThread}
                      hasMoreOlder={hasMoreOlderThread}
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
            <div className="flex items-center px-2 py-2">
              <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
            </div>
          ) : null}
          {isSending ? (
            <div className="flex items-center px-2 py-2">
              <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
            </div>
          ) : null}
          {isDeletingConversation ? (
            <div className="px-2 py-2 text-xs text-slate-400">Ending conversation...</div>
          ) : null}
          {isClearingConversation ? (
            <div className="px-2 py-2 text-xs text-slate-400">Clearing chat...</div>
          ) : null}
          {isTogglingTakeover ? (
            <div className="px-2 py-2 text-xs text-slate-400">Updating chat access...</div>
          ) : null}
          {isReopeningConversation ? (
            <div className="px-2 py-2 text-xs text-slate-400">Reopening chat...</div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
