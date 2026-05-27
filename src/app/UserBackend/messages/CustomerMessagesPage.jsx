'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'
import { useAlerts } from '@/context/AlertContext'
import { composeInquiryMessageBody } from '@/lib/chat/inquiry-message'
import {
  formatConversationLastMessageLabel,
  formatMessageTimeLabel,
} from '@/lib/chat/time-label.ts'
import {
  buildVoiceMessageBody,
  toChatMessagePreview,
} from '@/lib/chat/voice-message'
import CustomerConversationList from './components/CustomerConversationList'
import CustomerConversationThread from './components/CustomerConversationThread'
import CustomerConversationPlaceholder from './components/CustomerConversationPlaceholder'

const FILTER_HANDLERS = {
  all: () => true,
  unread: (conversation) => conversation.unreadCount > 0,
}
const HELP_CENTER_VIRTUAL_CONVERSATION_ID = '__help_center__'
const HELP_CENTER_BODY_PROMPT = 'Ask your question and we will help you'
const MESSAGE_PAGE_SIZE = 10

const mapConversation = (row) => {
  const lastMessageAt = row?.lastMessageAt || row?.updatedAt || null
  const sellerName = String(row?.vendorName || '').trim() || 'Seller'
  return {
    id: String(row?.id || '').trim(),
    vendorUserId: String(row?.vendorUserId || '').trim(),
    sellerName,
    productId: String(row?.productId || '').trim(),
    updatedAt: row?.updatedAt || lastMessageAt || new Date().toISOString(),
    lastMessageAtLabel: formatConversationLastMessageLabel(lastMessageAt),
    lastMessagePreview: toChatMessagePreview(row?.lastMessagePreview, 'No messages yet.'),
    closedAt: row?.closedAt || null,
    canSend: row?.canSend !== false,
    participantNotice: String(row?.participantNotice || '').trim(),
    sellerStatusLabel: '',
    unreadCount: Math.max(0, Number(row?.unreadCount || 0)),
    messages: [],
    hasLoadedMessages: false,
    isHelpCenter: row?.isHelpCenter === true,
  }
}

const mapMessage = (row, currentUserId) => {
  const senderUserId = String(row?.senderUserId || '').trim()
  const safeCurrentUserId = String(currentUserId || '').trim()
  const isCustomerMessage =
    senderUserId && safeCurrentUserId && senderUserId === safeCurrentUserId
  const vendorReadAt = String(row?.vendorReadAt || '').trim()
  const vendorReceivedAt = String(row?.vendorReceivedAt || '').trim()

  let messageStatus = undefined
  if (isCustomerMessage) {
    if (vendorReadAt) {
      messageStatus = 'read'
    } else if (vendorReceivedAt) {
      messageStatus = 'delivered'
    } else {
      messageStatus = 'sent'
    }
  }

  return {
    id: String(row?.id || '').trim(),
    sender: isCustomerMessage ? 'customer' : 'seller',
    text: String(row?.body || '').trim(),
    timeLabel: formatMessageTimeLabel(row?.createdAt),
    createdAt: row?.createdAt || null,
    status: messageStatus,
  }
}

export default function CustomerMessagesPage() {
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createBrowserSupabaseClient(), [])
  const { confirmAlert, pushAlert } = useAlerts()
  const [conversations, setConversations] = useState([])
  const [activeConversationId, setActiveConversationId] = useState('')
  const [searchText, setSearchText] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [draftMessage, setDraftMessage] = useState('')
  const [isMobileThreadOpen, setIsMobileThreadOpen] = useState(false)
  const [isLoadingConversations, setIsLoadingConversations] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isEndingChat, setIsEndingChat] = useState(false)
  const [pageError, setPageError] = useState('')
  const [currentUserId, setCurrentUserId] = useState('')
  const [messageStateByConversation, setMessageStateByConversation] = useState({})
  const [panelHeight, setPanelHeight] = useState(0)
  const [isHelpCenterOpen, setIsHelpCenterOpen] = useState(false)
  const [helpCenterConversationId, setHelpCenterConversationId] = useState('')
  const [isConnectingHelpCenter, setIsConnectingHelpCenter] = useState(false)
  const [hasAttemptedHelpCenterConnect, setHasAttemptedHelpCenterConnect] = useState(false)
  const [inquiryContext, setInquiryContext] = useState(null)
  const [autoInquiryContext, setAutoInquiryContext] = useState(null)
  const [pendingAutoMessage, setPendingAutoMessage] = useState('')
  const [hideInquiryContextChip, setHideInquiryContextChip] = useState(false)
  const [isStartingNewHelpCenterChat, setIsStartingNewHelpCenterChat] = useState(false)
  const pageContainerRef = useRef(null)
  const hasAppliedInquiryIntentRef = useRef(false)
  const hasTriggeredAutoInquiryRef = useRef(false)

  const helpCenterTargetConversation = useMemo(() => {
    const targetById =
      conversations.find((conversation) => conversation.id === helpCenterConversationId) || null
    if (targetById) return targetById
    return conversations.find((conversation) => conversation.isHelpCenter === true) || null
  }, [conversations, helpCenterConversationId])

  const loadConversations = useCallback(async () => {
    setIsLoadingConversations(true)
    setPageError('')

    const response = await fetch('/api/chat/conversations', {
      method: 'GET',
      cache: 'no-store',
    }).catch(() => null)

    if (!response) {
      setPageError('Unable to load conversations right now.')
      setIsLoadingConversations(false)
      return
    }

    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      setPageError(String(payload?.error || 'Unable to load conversations.'))
      setIsLoadingConversations(false)
      return
    }

    const nextUserId = String(payload?.currentUserId || '').trim()
    const mapped = Array.isArray(payload?.conversations)
      ? payload.conversations.map(mapConversation).filter((conversation) => conversation.id)
      : []

    setCurrentUserId(nextUserId)
    setConversations((previous) => {
      const previousById = new Map(previous.map((conversation) => [conversation.id, conversation]))
      return mapped.map((conversation) => {
        const existing = previousById.get(conversation.id)
        if (!existing) return conversation
        return {
          ...conversation,
          sellerStatusLabel: existing.sellerStatusLabel || '',
          hasLoadedMessages: existing.hasLoadedMessages === true,
          messages:
            Array.isArray(existing.messages) && existing.messages.length > 0
              ? existing.messages
              : [],
        }
      })
    })
    setMessageStateByConversation((previous) => {
      const next = {}
      mapped.forEach((conversation) => {
        const id = String(conversation.id || '').trim()
        if (!id) return
        const existing = previous[id] || {}
        next[id] = {
          isLoadingInitial: Boolean(existing.isLoadingInitial),
          isLoadingOlder: Boolean(existing.isLoadingOlder),
          hasMore: typeof existing.hasMore === 'boolean' ? existing.hasMore : true,
          nextBefore: String(existing.nextBefore || '').trim(),
        }
      })
      return next
    })
    setActiveConversationId((previous) =>
      previous && mapped.some((conversation) => conversation.id === previous) ? previous : '',
    )
    const payloadHelpCenterConversationId = String(payload?.helpCenterConversationId || '').trim()
    const mappedHelpCenterConversation = mapped.find((conversation) => conversation.isHelpCenter === true)
    setHelpCenterConversationId((previous) => {
      if (mappedHelpCenterConversation?.id) return mappedHelpCenterConversation.id
      if (
        payloadHelpCenterConversationId &&
        mapped.some((conversation) => conversation.id === payloadHelpCenterConversationId)
      ) {
        return payloadHelpCenterConversationId
      }
      if (previous && mapped.some((conversation) => conversation.id === previous)) return previous
      return ''
    })
    if (mappedHelpCenterConversation?.id) {
      setHasAttemptedHelpCenterConnect(true)
    }
    setIsLoadingConversations(false)
  }, [])

  const connectHelpCenterConversation = useCallback(
    async ({ silent = false, forceRefresh = false } = {}) => {
    if (!forceRefresh && helpCenterTargetConversation?.id) {
      setHelpCenterConversationId(helpCenterTargetConversation.id)
      setHasAttemptedHelpCenterConnect(true)
      return helpCenterTargetConversation
    }
    if (isConnectingHelpCenter) return null

    setIsConnectingHelpCenter(true)
    setHasAttemptedHelpCenterConnect(true)
    if (!silent) setPageError('')

    const response = await fetch('/api/chat/help-center', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }).catch(() => null)

    if (!response) {
      if (!silent) setPageError('Unable to initialize Help Center chat right now.')
      setIsConnectingHelpCenter(false)
      return null
    }

    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      if (!silent) setPageError(String(payload?.error || 'Unable to initialize Help Center chat.'))
      setIsConnectingHelpCenter(false)
      return null
    }

    const mappedConversation = payload?.conversation
      ? { ...mapConversation(payload.conversation), isHelpCenter: true }
      : null
    if (mappedConversation?.id) {
      setConversations((previous) => {
        const exists = previous.some((conversation) => conversation.id === mappedConversation.id)
        if (exists) {
          return previous.map((conversation) =>
            conversation.id === mappedConversation.id
              ? { ...conversation, ...mappedConversation }
              : conversation,
          )
        }
        return [mappedConversation, ...previous]
      })
      setHelpCenterConversationId(mappedConversation.id)
      setIsConnectingHelpCenter(false)
      return mappedConversation
    }

    setIsConnectingHelpCenter(false)
    return null
  }, [helpCenterTargetConversation, isConnectingHelpCenter])

  useEffect(() => {
    if (isLoadingConversations || hasAttemptedHelpCenterConnect || isConnectingHelpCenter) return
    void connectHelpCenterConversation({ silent: true })
  }, [connectHelpCenterConversation, hasAttemptedHelpCenterConnect, isConnectingHelpCenter, isLoadingConversations])

  useEffect(() => {
    void loadConversations()
  }, [loadConversations])

  useEffect(() => {
    if (hasAppliedInquiryIntentRef.current) return
    const shouldOpenHelpCenter =
      String(searchParams?.get('help_center') || '').trim() === '1' ||
      String(searchParams?.get('intent') || '').trim().toLowerCase() === 'order_inquiry'
    if (!shouldOpenHelpCenter) return
    hasAppliedInquiryIntentRef.current = true

    const orderNumber = String(searchParams?.get('order_number') || '').trim()
    const orderId = String(searchParams?.get('order_id') || '').trim()
    const trackId = String(searchParams?.get('track_id') || '').trim()
    const orderStatus = String(searchParams?.get('order_status') || '').trim()
    const reportReasonLabel = String(searchParams?.get('report_reason_label') || '').trim()
    const prefillText = String(searchParams?.get('prefill') || '').trim()
    const shouldAutoSendPrefill = String(searchParams?.get('auto_send') || '').trim() === '1'
    setHideInquiryContextChip(shouldAutoSendPrefill)

    const nextInquiryContext = {
      orderId,
      orderNumber,
      trackId,
      orderStatus,
      reportReasonLabel,
    }

    setIsHelpCenterOpen(true)
    setActiveConversationId('')
    setIsMobileThreadOpen(true)
    if (shouldAutoSendPrefill && prefillText) {
      setInquiryContext(null)
      setAutoInquiryContext(nextInquiryContext)
      hasTriggeredAutoInquiryRef.current = false
      setPendingAutoMessage(prefillText)
      setDraftMessage('')
      return
    }
    setAutoInquiryContext(null)
    setInquiryContext(nextInquiryContext)
    setPendingAutoMessage('')
    if (prefillText) {
      setDraftMessage(prefillText)
    }
  }, [searchParams])

  useEffect(() => {
    let rafId = 0
    const updatePanelHeight = () => {
      if (!pageContainerRef.current) return
      const rect = pageContainerRef.current.getBoundingClientRect()
      const viewportHeight = window.visualViewport?.height || window.innerHeight
      const nextHeight = Math.max(360, Math.floor(viewportHeight - rect.top))
      setPanelHeight((previous) => (previous === nextHeight ? previous : nextHeight))
    }
    const scheduleUpdatePanelHeight = () => {
      window.cancelAnimationFrame(rafId)
      rafId = window.requestAnimationFrame(updatePanelHeight)
    }
    const resizeObserver = new ResizeObserver(() => {
      scheduleUpdatePanelHeight()
    })
    const visualViewport = window.visualViewport

    scheduleUpdatePanelHeight()
    window.addEventListener('resize', scheduleUpdatePanelHeight)
    window.addEventListener('scroll', scheduleUpdatePanelHeight, { passive: true })
    visualViewport?.addEventListener('resize', scheduleUpdatePanelHeight)
    visualViewport?.addEventListener('scroll', scheduleUpdatePanelHeight)
    if (pageContainerRef.current?.parentElement) {
      resizeObserver.observe(pageContainerRef.current.parentElement)
    }
    resizeObserver.observe(document.body)

    return () => {
      window.cancelAnimationFrame(rafId)
      resizeObserver.disconnect()
      window.removeEventListener('resize', scheduleUpdatePanelHeight)
      window.removeEventListener('scroll', scheduleUpdatePanelHeight)
      visualViewport?.removeEventListener('resize', scheduleUpdatePanelHeight)
      visualViewport?.removeEventListener('scroll', scheduleUpdatePanelHeight)
    }
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('customer-dashboard-chat-stream')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const conversationId = String(payload.new?.conversation_id || '').trim()
          const senderUserId = String(payload.new?.sender_user_id || '').trim()
          const body = String(payload.new?.body || '').trim()
          const createdAt = String(payload.new?.created_at || '').trim()
          const messageId = String(payload.new?.id || '').trim()
          if (!conversationId || !messageId || !body) return
          const insertedMessage = mapMessage(
            {
              id: messageId,
              senderUserId,
              body,
              createdAt,
              vendorReceivedAt: String(payload.new?.vendor_received_at || ''),
              vendorReadAt: String(payload.new?.vendor_read_at || ''),
            },
            currentUserId,
          )

          setConversations((previous) => {
            const exists = previous.some((conversation) => conversation.id === conversationId)
            if (!exists) {
              void loadConversations()
              return previous
            }
            return previous.map((conversation) => {
              if (conversation.id !== conversationId) return conversation
              const isConversationVisible =
                activeConversationId === conversationId ||
                (isHelpCenterOpen &&
                  String(helpCenterTargetConversation?.id || '').trim() === conversationId)
              const shouldAppendToLoadedThread =
                conversation.hasLoadedMessages === true &&
                isConversationVisible
              const alreadyExists = conversation.messages.some((message) => message.id === messageId)
              const nextMessages = shouldAppendToLoadedThread
                ? alreadyExists
                  ? conversation.messages.map((message) =>
                      message.id === messageId ? { ...message, ...insertedMessage } : message,
                    )
                  : [...conversation.messages, insertedMessage]
                : conversation.messages
              return {
                ...conversation,
                messages: nextMessages,
                updatedAt: createdAt || new Date().toISOString(),
                lastMessageAtLabel: formatConversationLastMessageLabel(
                  createdAt || new Date().toISOString(),
                ),
                lastMessagePreview: toChatMessagePreview(body),
                unreadCount:
                  isConversationVisible || senderUserId === currentUserId
                    ? conversation.unreadCount
                    : conversation.unreadCount + 1,
              }
            })
          })
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const conversationId = String(payload.new?.conversation_id || '').trim()
          const messageId = String(payload.new?.id || '').trim()
          if (!conversationId || !messageId) return
          const updatedMessage = mapMessage(
            {
              id: messageId,
              senderUserId: String(payload.new?.sender_user_id || ''),
              body: String(payload.new?.body || ''),
              createdAt: String(payload.new?.created_at || ''),
              vendorReceivedAt: String(payload.new?.vendor_received_at || ''),
              vendorReadAt: String(payload.new?.vendor_read_at || ''),
            },
            currentUserId,
          )
          setConversations((previous) =>
            previous.map((conversation) =>
              conversation.id !== conversationId
                ? conversation
                : {
                    ...conversation,
                    messages: conversation.messages.map((message) =>
                      message.id === messageId
                        ? { ...message, status: updatedMessage.status || message.status }
                        : message,
                    ),
                  },
            ),
          )
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_conversations' },
        (payload) => {
          const conversationId = String(payload.new?.id || '').trim()
          if (!conversationId) return
          setConversations((previous) =>
            previous.map((conversation) =>
              conversation.id === conversationId
                ? {
                    ...conversation,
                    closedAt: payload.new?.closed_at || null,
                    canSend: payload.new?.closed_at ? false : true,
                    participantNotice: payload.new?.closed_at
                      ? 'This chat is closed and will disappear in 7 days.'
                      : '',
                  }
                : conversation,
            ),
          )
        },
      )

    channel.subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [activeConversationId, currentUserId, helpCenterTargetConversation, isHelpCenterOpen, loadConversations, supabase])

  const filteredConversations = useMemo(() => {
    const safeFilterFn = FILTER_HANDLERS[activeFilter] || FILTER_HANDLERS.all
    const normalized = searchText.trim().toLowerCase()
    const hiddenConversationId = helpCenterTargetConversation?.id
      ? String(helpCenterTargetConversation.id).trim()
      : ''
    return [...conversations]
      .filter((conversation) => conversation.isHelpCenter !== true)
      .filter((conversation) =>
        hiddenConversationId ? String(conversation.id || '').trim() !== hiddenConversationId : true,
      )
      .filter((conversation) => safeFilterFn(conversation))
      .filter((conversation) => {
        if (!normalized) return true
        const haystack = `${conversation.sellerName} ${conversation.lastMessagePreview}`.toLowerCase()
        return haystack.includes(normalized)
      })
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
  }, [activeFilter, conversations, helpCenterTargetConversation, searchText])

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) || null,
    [activeConversationId, conversations],
  )
  const helpCenterConversation = useMemo(
    () => ({
      id: HELP_CENTER_VIRTUAL_CONVERSATION_ID,
      vendorUserId: helpCenterTargetConversation?.vendorUserId || '',
      sellerName: 'Help Center',
      productId: helpCenterTargetConversation?.productId || '',
      updatedAt: helpCenterTargetConversation?.updatedAt || new Date().toISOString(),
      lastMessageAtLabel: helpCenterTargetConversation?.lastMessageAtLabel || '',
      lastMessagePreview:
        helpCenterTargetConversation?.lastMessagePreview || HELP_CENTER_BODY_PROMPT,
      closedAt: helpCenterTargetConversation?.closedAt || null,
      canSend: helpCenterTargetConversation?.canSend !== false,
      participantNotice: String(helpCenterTargetConversation?.participantNotice || '').trim(),
      sellerStatusLabel: 'Available',
      unreadCount: Number(helpCenterTargetConversation?.unreadCount || 0),
      hasLoadedMessages: helpCenterTargetConversation?.hasLoadedMessages === true,
      messages:
        Array.isArray(helpCenterTargetConversation?.messages) &&
        helpCenterTargetConversation.messages.length > 0
          ? helpCenterTargetConversation.messages
          : [
              {
                id: 'help-center-intro',
                sender: 'seller',
                text: HELP_CENTER_BODY_PROMPT,
                timeLabel: '',
              },
            ],
      isHelpCenter: true,
      linkedConversationId: helpCenterTargetConversation?.id || '',
    }),
    [helpCenterTargetConversation],
  )
  const selectedConversation = isHelpCenterOpen ? helpCenterConversation : activeConversation

  const loadMessages = useCallback(
    async (conversationId, { loadOlder = false } = {}) => {
      const safeConversationId = String(conversationId || '').trim()
      if (!safeConversationId) return

      const previousMeta = messageStateByConversation[safeConversationId] || {}
      if (loadOlder) {
        if (previousMeta.isLoadingOlder || previousMeta.isLoadingInitial) return
      } else if (previousMeta.isLoadingInitial) {
        return
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
      }))
      setPageError('')

      const params = new URLSearchParams({
        limit: String(MESSAGE_PAGE_SIZE),
      })
      if (loadOlder) {
        const cursor = String(previousMeta.nextBefore || '').trim()
        if (!cursor) {
          setMessageStateByConversation((previous) => ({
            ...previous,
            [safeConversationId]: {
              ...(previous[safeConversationId] || {}),
              isLoadingOlder: false,
              hasMore: false,
            },
          }))
          return
        }
        params.set('before', cursor)
      }

      const response = await fetch(
        `/api/chat/conversations/${encodeURIComponent(safeConversationId)}/messages?${params.toString()}`,
        {
          method: 'GET',
          cache: 'no-store',
        },
      ).catch(() => null)

      if (!response) {
        setPageError('Unable to load messages right now.')
        setMessageStateByConversation((previous) => ({
          ...previous,
          [safeConversationId]: {
            ...(previous[safeConversationId] || {}),
            isLoadingInitial: false,
            isLoadingOlder: false,
          },
        }))
        return
      }

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        setPageError(String(payload?.error || 'Unable to load messages.'))
        setMessageStateByConversation((previous) => ({
          ...previous,
          [safeConversationId]: {
            ...(previous[safeConversationId] || {}),
            isLoadingInitial: false,
            isLoadingOlder: false,
          },
        }))
        return
      }

      const nextCurrentUserId = String(payload?.currentUserId || currentUserId || '').trim()
      if (nextCurrentUserId && nextCurrentUserId !== currentUserId) {
        setCurrentUserId(nextCurrentUserId)
      }

      const pageMessages = Array.isArray(payload?.messages)
        ? payload.messages
            .map((row) => mapMessage(row, nextCurrentUserId))
            .filter((message) => message.id && message.text)
        : []

      setConversations((previous) =>
        previous.map((conversation) => {
          if (conversation.id !== safeConversationId) return conversation
          const existingMessages = Array.isArray(conversation.messages) ? conversation.messages : []
          const mergedMessages = loadOlder
            ? [...pageMessages, ...existingMessages]
            : pageMessages
          const deduped = Array.from(
            new Map(mergedMessages.map((message) => [String(message.id || ''), message])).values(),
          )
          deduped.sort((left, right) => new Date(left.createdAt || 0).getTime() - new Date(right.createdAt || 0).getTime())

          return {
            ...conversation,
            sellerName:
              String(payload?.conversation?.vendorName || '').trim() || conversation.sellerName,
            canSend: payload?.conversation?.canSend !== false,
            participantNotice: String(payload?.conversation?.participantNotice || '').trim(),
            closedAt: payload?.conversation?.closedAt || conversation.closedAt || null,
            messages: deduped,
            hasLoadedMessages: true,
            unreadCount: 0,
          }
        }),
      )

      const nextBefore = String(payload?.pagination?.nextBefore || '').trim()
      const hasMore = Boolean(payload?.pagination?.hasMore)
      setMessageStateByConversation((previous) => ({
        ...previous,
        [safeConversationId]: {
          ...(previous[safeConversationId] || {}),
          isLoadingInitial: false,
          isLoadingOlder: false,
          hasMore,
          nextBefore,
        },
      }))
    },
    [currentUserId, messageStateByConversation],
  )

  const startNewHelpCenterChat = useCallback(async () => {
    if (isStartingNewHelpCenterChat || isConnectingHelpCenter) return
    setIsStartingNewHelpCenterChat(true)
    setPageError('')
    try {
      const connected = await connectHelpCenterConversation({ forceRefresh: true })
      const conversationId = String(connected?.id || helpCenterConversationId || '').trim()
      if (!conversationId) {
        setPageError('Unable to start a new Help Center chat right now.')
        return
      }
      await loadMessages(conversationId, { loadOlder: false })
      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                canSend: true,
                closedAt: null,
                participantNotice: '',
              }
            : conversation,
        ),
      )
    } finally {
      setIsStartingNewHelpCenterChat(false)
    }
  }, [
    connectHelpCenterConversation,
    helpCenterConversationId,
    isConnectingHelpCenter,
    isStartingNewHelpCenterChat,
    loadMessages,
  ])

  useEffect(() => {
    if (!activeConversationId) return
    const selected = conversations.find((conversation) => conversation.id === activeConversationId)
    if (!selected) return
    if (selected.hasLoadedMessages === true) return
    void loadMessages(activeConversationId, { loadOlder: false })
  }, [activeConversationId, conversations, loadMessages])

  useEffect(() => {
    if (!isHelpCenterOpen) return
    if (!helpCenterTargetConversation?.id) {
      if (!hasAttemptedHelpCenterConnect && !isConnectingHelpCenter) {
        void connectHelpCenterConversation()
      }
      return
    }
    if (
      Array.isArray(helpCenterTargetConversation.messages) &&
      helpCenterTargetConversation.messages.length > 0 &&
      helpCenterTargetConversation.hasLoadedMessages === true
    ) {
      return
    }
    void loadMessages(helpCenterTargetConversation.id, { loadOlder: false })
  }, [
    connectHelpCenterConversation,
    hasAttemptedHelpCenterConnect,
    helpCenterTargetConversation,
    isConnectingHelpCenter,
    isHelpCenterOpen,
    loadMessages,
  ])

  useEffect(() => {
    const text = pendingAutoMessage.trim()
    if (!isHelpCenterOpen || !text || hasTriggeredAutoInquiryRef.current) return

    let cancelled = false
    const sendAutoInquiry = async () => {
      let destinationConversationId = String(helpCenterTargetConversation?.id || helpCenterConversationId || '').trim()
      if (!destinationConversationId && !isConnectingHelpCenter) {
        const connected = await connectHelpCenterConversation()
        destinationConversationId = String(connected?.id || helpCenterConversationId || '').trim()
      }
      if (!destinationConversationId || cancelled) return

      hasTriggeredAutoInquiryRef.current = true
      setIsSending(true)
      setPageError('')

      const bodyText = composeInquiryMessageBody({
        text,
        inquiryContext: autoInquiryContext || inquiryContext,
        detailLabel: 'Question',
      })

      const response = await fetch(
        `/api/chat/conversations/${encodeURIComponent(destinationConversationId)}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: bodyText }),
        },
      ).catch(() => null)

      if (cancelled) return

      if (!response) {
        setPageError('Unable to send message right now.')
        setDraftMessage(text)
        setPendingAutoMessage('')
        hasTriggeredAutoInquiryRef.current = false
        setIsSending(false)
        return
      }

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        setPageError(String(payload?.error || 'Unable to send message.'))
        setDraftMessage(text)
        setPendingAutoMessage('')
        hasTriggeredAutoInquiryRef.current = false
        setIsSending(false)
        return
      }

      const inserted = mapMessage(payload?.message, currentUserId)
      if (inserted.id && inserted.text) {
        setConversations((previous) =>
          previous.map((conversation) => {
            if (conversation.id !== destinationConversationId) return conversation
            const alreadyExists = conversation.messages.some((message) => message.id === inserted.id)
            return {
              ...conversation,
              messages: alreadyExists ? conversation.messages : [...conversation.messages, inserted],
              hasLoadedMessages: true,
              updatedAt: payload?.message?.createdAt || new Date().toISOString(),
              lastMessageAtLabel: formatConversationLastMessageLabel(
                payload?.message?.createdAt || new Date().toISOString(),
              ),
              lastMessagePreview: toChatMessagePreview(inserted.text),
            }
          }),
        )
      }

      await loadMessages(destinationConversationId, { loadOlder: false })

      setPendingAutoMessage('')
      setAutoInquiryContext(null)
      setInquiryContext(null)
      setDraftMessage('')
      setIsSending(false)
    }

    void sendAutoInquiry()
    return () => {
      cancelled = true
    }
  }, [
    connectHelpCenterConversation,
    currentUserId,
    autoInquiryContext,
    helpCenterConversationId,
    helpCenterTargetConversation,
    inquiryContext,
    isConnectingHelpCenter,
    isHelpCenterOpen,
    loadMessages,
    pendingAutoMessage,
  ])

  useEffect(() => {
    const targetConversationId = isHelpCenterOpen
      ? String(helpCenterTargetConversation?.id || '').trim()
      : String(activeConversationId || '').trim()
    if (!targetConversationId) return

    let cancelled = false
    const refreshPresence = async () => {
      const response = await fetch(
        `/api/chat/conversations/${encodeURIComponent(targetConversationId)}/presence`,
        { method: 'GET', cache: 'no-store' },
      ).catch(() => null)
      if (!response) return
      const payload = await response.json().catch(() => null)
      if (cancelled || !response.ok) return
      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.id === targetConversationId
            ? {
                ...conversation,
                sellerStatusLabel: String(payload?.sellerStatusLabel || '').trim(),
                canSend: payload?.conversation?.canSend !== false,
                participantNotice: String(payload?.conversation?.participantNotice || '').trim(),
                closedAt: payload?.conversation?.closedAt || conversation.closedAt || null,
              }
            : conversation,
        ),
      )
    }

    void refreshPresence()
    const intervalId = window.setInterval(() => void refreshPresence(), 15000)
    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [activeConversationId, helpCenterTargetConversation, isHelpCenterOpen])

  const selectConversation = (conversationId) => {
    if (conversationId === HELP_CENTER_VIRTUAL_CONVERSATION_ID) {
      setIsHelpCenterOpen(true)
      setActiveConversationId('')
      setIsMobileThreadOpen(true)
      if (!hasAttemptedHelpCenterConnect) {
        setHasAttemptedHelpCenterConnect(true)
      }
      if (!helpCenterTargetConversation?.id) {
        void connectHelpCenterConversation()
      }
      return
    }
    setIsHelpCenterOpen(false)
    setHasAttemptedHelpCenterConnect(false)
    setActiveConversationId(conversationId)
    setIsMobileThreadOpen(true)
    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation,
      ),
    )
  }

  const sendMessage = async () => {
    const text = draftMessage.trim()
    let resolvedHelpCenterConversation = helpCenterTargetConversation
    if (isHelpCenterOpen && !resolvedHelpCenterConversation?.id) {
      resolvedHelpCenterConversation = await connectHelpCenterConversation()
    }
    const destinationConversationId = isHelpCenterOpen
      ? String(resolvedHelpCenterConversation?.id || '').trim()
      : String(activeConversationId || '').trim()
    const selected = conversations.find((conversation) => conversation.id === destinationConversationId)
    if (!text || !destinationConversationId || isSending) return
    if (selected?.canSend === false) return

    const hasInquiryContext = Boolean(
      String(inquiryContext?.orderNumber || inquiryContext?.orderId || '').trim() ||
      String(inquiryContext?.trackId || '').trim() ||
      String(inquiryContext?.orderStatus || '').trim() ||
      String(inquiryContext?.reportReasonLabel || '').trim(),
    )
    const bodyText = composeInquiryMessageBody({
      text,
      inquiryContext,
      detailLabel: 'Question',
    })
    const optimisticId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const optimisticMessage = {
      id: optimisticId,
      sender: 'customer',
      text: bodyText,
      timeLabel: formatMessageTimeLabel(new Date().toISOString()),
      createdAt: new Date().toISOString(),
      status: 'sending',
    }

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
              lastMessagePreview: toChatMessagePreview(optimisticMessage.text),
            },
      ),
    )
    setDraftMessage('')

    setIsSending(true)
    setPageError('')

    const response = await fetch(
      `/api/chat/conversations/${encodeURIComponent(destinationConversationId)}/messages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: bodyText }),
      },
    ).catch(() => null)

    if (!response) {
      setPageError('Unable to send message right now.')
      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.id !== destinationConversationId
            ? conversation
            : {
                ...conversation,
                messages: conversation.messages.filter((message) => message.id !== optimisticId),
              },
        ),
      )
      setDraftMessage(text)
      setIsSending(false)
      return
    }

    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      setPageError(String(payload?.error || 'Unable to send message.'))
      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.id !== destinationConversationId
            ? conversation
            : {
                ...conversation,
                messages: conversation.messages.filter((message) => message.id !== optimisticId),
              },
        ),
      )
      setDraftMessage(text)
      setIsSending(false)
      return
    }

    const inserted = mapMessage(payload?.message, currentUserId)
    if (inserted.id && inserted.text) {
      setConversations((previous) =>
        previous.map((conversation) => {
          if (conversation.id !== destinationConversationId) return conversation
          const alreadyExists = conversation.messages.some((message) => message.id === inserted.id)
          return {
            ...conversation,
            messages: alreadyExists
              ? conversation.messages.filter((message) => message.id !== optimisticId)
              : conversation.messages.map((message) =>
                  message.id === optimisticId
                    ? {
                        ...inserted,
                        status: inserted.sender === 'customer' ? 'sent' : inserted.status,
                      }
                    : message,
                ),
            hasLoadedMessages: true,
            updatedAt: payload?.message?.createdAt || new Date().toISOString(),
            lastMessageAtLabel: formatConversationLastMessageLabel(
              payload?.message?.createdAt || new Date().toISOString(),
            ),
            lastMessagePreview: toChatMessagePreview(inserted.text),
          }
        }),
      )
    } else {
      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.id !== destinationConversationId
            ? conversation
            : {
                ...conversation,
                messages: conversation.messages.filter((message) => message.id !== optimisticId),
              },
        ),
      )
      setDraftMessage(text)
    }

    if (hasInquiryContext) {
      setInquiryContext(null)
    }
    setIsSending(false)
  }

  const sendVoiceMessage = async ({ blob, durationSeconds, mimeType }) => {
    if (!(blob instanceof Blob) || blob.size <= 0 || isSending) return

    let resolvedHelpCenterConversation = helpCenterTargetConversation
    if (isHelpCenterOpen && !resolvedHelpCenterConversation?.id) {
      resolvedHelpCenterConversation = await connectHelpCenterConversation()
    }

    const destinationConversationId = isHelpCenterOpen
      ? String(resolvedHelpCenterConversation?.id || '').trim()
      : String(activeConversationId || '').trim()
    const selected = conversations.find((conversation) => conversation.id === destinationConversationId)
    if (!destinationConversationId) return
    if (selected?.canSend === false) return

    setIsSending(true)
    setPageError('')

    const optimisticId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const localVoiceUrl = URL.createObjectURL(blob)
    const optimisticVoiceBody = buildVoiceMessageBody({
      url: localVoiceUrl,
      durationSeconds: Math.max(1, Number(durationSeconds) || 0),
    })
    if (!optimisticVoiceBody) {
      URL.revokeObjectURL(localVoiceUrl)
      setPageError('Unable to send voice message.')
      setIsSending(false)
      return
    }
    const optimisticMessage = {
      id: optimisticId,
      sender: 'customer',
      text: optimisticVoiceBody,
      timeLabel: formatMessageTimeLabel(new Date().toISOString()),
      createdAt: new Date().toISOString(),
      status: 'sending',
    }

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
    )

    const fallbackType = String(mimeType || blob.type || 'audio/webm').trim().toLowerCase()
    const fileExt =
      fallbackType.includes('ogg')
        ? 'ogg'
        : fallbackType.includes('mp4')
          ? 'mp4'
          : fallbackType.includes('mpeg')
            ? 'mp3'
            : fallbackType.includes('wav')
              ? 'wav'
              : 'webm'
    const voiceFile = new File([blob], `voice-${Date.now()}.${fileExt}`, {
      type: fallbackType || 'audio/webm',
    })
    const uploadFormData = new FormData()
    uploadFormData.set('audio', voiceFile)
    uploadFormData.set('durationSeconds', String(Math.max(1, Number(durationSeconds) || 0)))

    const uploadResponse = await fetch(
      `/api/chat/conversations/${encodeURIComponent(destinationConversationId)}/voice`,
      {
        method: 'POST',
        body: uploadFormData,
      },
    ).catch(() => null)

    if (!uploadResponse) {
      setPageError('Unable to upload voice message right now.')
      URL.revokeObjectURL(localVoiceUrl)
      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.id !== destinationConversationId
            ? conversation
            : {
                ...conversation,
                messages: conversation.messages.filter((message) => message.id !== optimisticId),
              },
        ),
      )
      setIsSending(false)
      return
    }

    const uploadPayload = await uploadResponse.json().catch(() => null)
    if (!uploadResponse.ok) {
      setPageError(String(uploadPayload?.error || 'Unable to upload voice message.'))
      URL.revokeObjectURL(localVoiceUrl)
      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.id !== destinationConversationId
            ? conversation
            : {
                ...conversation,
                messages: conversation.messages.filter((message) => message.id !== optimisticId),
              },
        ),
      )
      setIsSending(false)
      return
    }

    const voiceBody = buildVoiceMessageBody({
      url: String(uploadPayload?.url || '').trim(),
      durationSeconds: Number(uploadPayload?.durationSeconds || durationSeconds || 0),
    })
    if (!voiceBody) {
      setPageError('Unable to send voice message.')
      URL.revokeObjectURL(localVoiceUrl)
      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.id !== destinationConversationId
            ? conversation
            : {
                ...conversation,
                messages: conversation.messages.filter((message) => message.id !== optimisticId),
              },
        ),
      )
      setIsSending(false)
      return
    }

    const sendResponse = await fetch(
      `/api/chat/conversations/${encodeURIComponent(destinationConversationId)}/messages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: voiceBody }),
      },
    ).catch(() => null)

    if (!sendResponse) {
      setPageError('Unable to send voice message right now.')
      URL.revokeObjectURL(localVoiceUrl)
      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.id !== destinationConversationId
            ? conversation
            : {
                ...conversation,
                messages: conversation.messages.filter((message) => message.id !== optimisticId),
              },
        ),
      )
      setIsSending(false)
      return
    }

    const sendPayload = await sendResponse.json().catch(() => null)
    if (!sendResponse.ok) {
      setPageError(String(sendPayload?.error || 'Unable to send voice message.'))
      URL.revokeObjectURL(localVoiceUrl)
      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.id !== destinationConversationId
            ? conversation
            : {
                ...conversation,
                messages: conversation.messages.filter((message) => message.id !== optimisticId),
              },
        ),
      )
      setIsSending(false)
      return
    }

    const inserted = mapMessage(sendPayload?.message, currentUserId)
    if (inserted.id && inserted.text) {
      URL.revokeObjectURL(localVoiceUrl)
      setConversations((previous) =>
        previous.map((conversation) => {
          if (conversation.id !== destinationConversationId) return conversation
          const alreadyExists = conversation.messages.some((message) => message.id === inserted.id)
          return {
            ...conversation,
            messages: alreadyExists
              ? conversation.messages.filter((message) => message.id !== optimisticId)
              : conversation.messages.map((message) =>
                  message.id === optimisticId
                    ? {
                        ...inserted,
                        status: inserted.sender === 'customer' ? 'sent' : inserted.status,
                      }
                    : message,
                ),
            hasLoadedMessages: true,
            updatedAt: sendPayload?.message?.createdAt || new Date().toISOString(),
            lastMessageAtLabel: formatConversationLastMessageLabel(
              sendPayload?.message?.createdAt || new Date().toISOString(),
            ),
            lastMessagePreview: toChatMessagePreview(inserted.text),
          }
        }),
      )
    } else {
      URL.revokeObjectURL(localVoiceUrl)
      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.id !== destinationConversationId
            ? conversation
            : {
                ...conversation,
                messages: conversation.messages.filter((message) => message.id !== optimisticId),
              },
        ),
      )
    }

    setIsSending(false)
  }

  const endActiveConversation = async () => {
    if (isHelpCenterOpen) return
    if (!activeConversationId || isEndingChat) return
    const selected = conversations.find((conversation) => conversation.id === activeConversationId)
    const label = String(selected?.sellerName || '').trim() || 'this seller'
    const confirmed = await confirmAlert({
      type: 'warning',
      title: 'End chat',
      message: `End this conversation with ${label}? You will no longer be able to send messages in this chat.`,
      confirmLabel: 'End chat',
      cancelLabel: 'Cancel',
    })
    if (!confirmed) return

    setIsEndingChat(true)
    setPageError('')
    const response = await fetch(
      `/api/chat/conversations/${encodeURIComponent(activeConversationId)}/close`,
      { method: 'POST' },
    ).catch(() => null)

    if (!response) {
      setPageError('Unable to end chat right now.')
      setIsEndingChat(false)
      return
    }
    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      setPageError(String(payload?.error || 'Unable to end chat.'))
      setIsEndingChat(false)
      return
    }

    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id === activeConversationId
          ? {
              ...conversation,
              canSend: payload?.conversation?.canSend !== false,
              participantNotice: String(payload?.conversation?.participantNotice || '').trim(),
              closedAt:
                payload?.conversation?.closedAt ||
                conversation.closedAt ||
                new Date().toISOString(),
            }
          : conversation,
      ),
    )
    pushAlert({
      type: 'info',
      title: 'Chat ended',
      message: 'This conversation has been ended.',
    })
    setIsEndingChat(false)
  }

  const activeThreadConversationId = useMemo(() => {
    if (isHelpCenterOpen) {
      return String(helpCenterTargetConversation?.id || '').trim()
    }
    return String(activeConversationId || '').trim()
  }, [activeConversationId, helpCenterTargetConversation, isHelpCenterOpen])
  const activeThreadMessageState = activeThreadConversationId
    ? messageStateByConversation[activeThreadConversationId] || {}
    : {}
  const isInitialLoadingThread =
    Boolean(activeThreadMessageState?.isLoadingInitial) &&
    (!selectedConversation || selectedConversation.hasLoadedMessages !== true)
  const isLoadingOlderThread = Boolean(activeThreadMessageState?.isLoadingOlder)
  const hasMoreOlderThread = Boolean(activeThreadMessageState?.hasMore)

  const showThreadOnMobile = Boolean(isMobileThreadOpen && selectedConversation)

  return (
    <div
      ref={pageContainerRef}
      className='overflow-hidden bg-white text-slate-900'
      style={{ height: panelHeight ? `${panelHeight}px` : 'calc(100dvh - 8rem)' }}
    >
      <div className='grid h-full min-h-0 lg:grid-cols-[360px_minmax(0,1fr)]'>
        {pageError ? (
          <div className='absolute left-4 right-4 top-3 z-20 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 lg:left-[24rem]'>
            {pageError}
          </div>
        ) : null}

        <div className={`${showThreadOnMobile ? 'hidden lg:block' : 'block'} h-full min-h-0 overflow-hidden`}>
          <CustomerConversationList
            conversations={filteredConversations}
            selectedConversationId={
              isHelpCenterOpen ? HELP_CENTER_VIRTUAL_CONVERSATION_ID : activeConversationId
            }
            onSelectConversation={selectConversation}
            showHelpCenter
            helpCenterConversation={helpCenterTargetConversation}
            isLoading={isLoadingConversations}
            searchValue={searchText}
            onSearchChange={setSearchText}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
          />
        </div>

        {selectedConversation ? (
          <div className={`${showThreadOnMobile ? 'block' : 'hidden lg:block'} h-full min-h-0 overflow-hidden`}>
            <CustomerConversationThread
              conversation={selectedConversation}
              draftMessage={draftMessage}
              onDraftMessageChange={setDraftMessage}
              onSendMessage={sendMessage}
              onSendVoiceMessage={sendVoiceMessage}
              onLoadOlderMessages={async () => {
                if (!activeThreadConversationId) return
                await loadMessages(activeThreadConversationId, { loadOlder: true })
              }}
              inquiryContext={isHelpCenterOpen && !hideInquiryContextChip ? inquiryContext : null}
              onClearInquiryContext={() => {
                setInquiryContext(null)
                setAutoInquiryContext(null)
                setHideInquiryContextChip(false)
              }}
              onBack={() => setIsMobileThreadOpen(false)}
              onEndChat={endActiveConversation}
              onStartNewChat={startNewHelpCenterChat}
              allowEndChat={!isHelpCenterOpen}
              isEndingChat={isEndingChat}
              isStartingNewChat={isStartingNewHelpCenterChat}
              isSending={isSending}
              isInitialLoading={isInitialLoadingThread}
              isLoadingOlder={isLoadingOlderThread}
              hasMoreOlder={hasMoreOlderThread}
            />
          </div>
        ) : (
          <div className='h-full min-h-0'>
            <CustomerConversationPlaceholder />
          </div>
        )}
      </div>

      {isLoadingConversations ? (
        <div className='flex items-center px-2 py-2'>
          <span className='inline-flex h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600' />
        </div>
      ) : null}
      {isSending ? (
        <div className='flex items-center px-2 py-2'>
          <span className='inline-flex h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600' />
        </div>
      ) : null}
    </div>
  )
}
