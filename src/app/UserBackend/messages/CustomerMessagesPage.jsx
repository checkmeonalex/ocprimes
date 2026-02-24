'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'
import { useAlerts } from '@/context/AlertContext'
import CustomerConversationList from './components/CustomerConversationList'
import CustomerConversationThread from './components/CustomerConversationThread'
import CustomerConversationPlaceholder from './components/CustomerConversationPlaceholder'

const FILTER_HANDLERS = {
  all: () => true,
  unread: (conversation) => conversation.unreadCount > 0,
}
const HELP_CENTER_VIRTUAL_CONVERSATION_ID = '__help_center__'
const HELP_CENTER_BODY_PROMPT = 'Ask your question and we will help you'

const formatTimeLabel = (value) => {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const normalizeValue = (value) => String(value || '').trim().toLowerCase()

const mapConversation = (row) => {
  const lastMessageAt = row?.lastMessageAt || row?.updatedAt || null
  const sellerName = String(row?.vendorName || '').trim() || 'Seller'
  return {
    id: String(row?.id || '').trim(),
    vendorUserId: String(row?.vendorUserId || '').trim(),
    sellerName,
    productId: String(row?.productId || '').trim(),
    updatedAt: row?.updatedAt || lastMessageAt || new Date().toISOString(),
    lastMessageAtLabel: formatTimeLabel(lastMessageAt),
    lastMessagePreview: String(row?.lastMessagePreview || '').trim() || 'No messages yet.',
    closedAt: row?.closedAt || null,
    canSend: row?.canSend !== false,
    participantNotice: String(row?.participantNotice || '').trim(),
    sellerStatusLabel: '',
    unreadCount: 0,
    messages: [],
  }
}

const mapMessage = (row, currentUserId) => {
  const senderUserId = String(row?.senderUserId || '').trim()
  const safeCurrentUserId = String(currentUserId || '').trim()
  return {
    id: String(row?.id || '').trim(),
    sender:
      senderUserId && safeCurrentUserId && senderUserId === safeCurrentUserId
        ? 'customer'
        : 'seller',
    text: String(row?.body || '').trim(),
    timeLabel: formatTimeLabel(row?.createdAt),
  }
}

export default function CustomerMessagesPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), [])
  const { confirmAlert, pushAlert } = useAlerts()
  const [conversations, setConversations] = useState([])
  const [activeConversationId, setActiveConversationId] = useState('')
  const [searchText, setSearchText] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [draftMessage, setDraftMessage] = useState('')
  const [isMobileThreadOpen, setIsMobileThreadOpen] = useState(false)
  const [isLoadingConversations, setIsLoadingConversations] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isEndingChat, setIsEndingChat] = useState(false)
  const [pageError, setPageError] = useState('')
  const [currentUserId, setCurrentUserId] = useState('')
  const [panelHeight, setPanelHeight] = useState(0)
  const [isHelpCenterOpen, setIsHelpCenterOpen] = useState(false)
  const [helpCenterConversationId, setHelpCenterConversationId] = useState('')
  const [isConnectingHelpCenter, setIsConnectingHelpCenter] = useState(false)
  const [hasAttemptedHelpCenterConnect, setHasAttemptedHelpCenterConnect] = useState(false)
  const pageContainerRef = useRef(null)

  const helpCenterTargetConversation = useMemo(
    () =>
      conversations.find((conversation) => {
        if (helpCenterConversationId && conversation.id === helpCenterConversationId) return true
        const sellerName = normalizeValue(conversation.sellerName)
        return sellerName === 'ocprimes'
      }) || null,
    [conversations, helpCenterConversationId],
  )

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
          unreadCount: existing.unreadCount || 0,
          sellerStatusLabel: existing.sellerStatusLabel || '',
          messages:
            Array.isArray(existing.messages) && existing.messages.length > 0
              ? existing.messages
              : [],
        }
      })
    })
    setActiveConversationId((previous) =>
      previous && mapped.some((conversation) => conversation.id === previous) ? previous : '',
    )
    setHelpCenterConversationId((previous) =>
      previous && mapped.some((conversation) => conversation.id === previous) ? previous : '',
    )
    setIsLoadingConversations(false)
  }, [])

  const connectHelpCenterConversation = useCallback(async () => {
    if (helpCenterTargetConversation?.id) {
      setHelpCenterConversationId(helpCenterTargetConversation.id)
      setHasAttemptedHelpCenterConnect(true)
      return helpCenterTargetConversation
    }
    if (isConnectingHelpCenter) return null

    setIsConnectingHelpCenter(true)
    setHasAttemptedHelpCenterConnect(true)
    setPageError('')

    const response = await fetch('/api/chat/help-center', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }).catch(() => null)

    if (!response) {
      setPageError('Unable to initialize Help Center chat right now.')
      setIsConnectingHelpCenter(false)
      return null
    }

    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      setPageError(String(payload?.error || 'Unable to initialize Help Center chat.'))
      setIsConnectingHelpCenter(false)
      return null
    }

    const mappedConversation = payload?.conversation ? mapConversation(payload.conversation) : null
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
    void loadConversations()
  }, [loadConversations])

  useEffect(() => {
    const updatePanelHeight = () => {
      if (!pageContainerRef.current) return
      const rect = pageContainerRef.current.getBoundingClientRect()
      const nextHeight = Math.max(360, Math.floor(window.innerHeight - rect.top - 8))
      setPanelHeight((previous) => (previous === nextHeight ? previous : nextHeight))
    }

    updatePanelHeight()
    window.addEventListener('resize', updatePanelHeight)
    return () => window.removeEventListener('resize', updatePanelHeight)
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

          setConversations((previous) => {
            const exists = previous.some((conversation) => conversation.id === conversationId)
            if (!exists) {
              void loadConversations()
              return previous
            }
            return previous.map((conversation) => {
              if (conversation.id !== conversationId) return conversation
              const alreadyExists = conversation.messages.some((message) => message.id === messageId)
              const nextMessages = alreadyExists
                ? conversation.messages
                : [
                    ...conversation.messages,
                    {
                      id: messageId,
                      sender: senderUserId === currentUserId ? 'customer' : 'seller',
                      text: body,
                      timeLabel: formatTimeLabel(createdAt),
                    },
                  ]
              return {
                ...conversation,
                messages: nextMessages,
                updatedAt: createdAt || new Date().toISOString(),
                lastMessageAtLabel: formatTimeLabel(createdAt || new Date().toISOString()),
                lastMessagePreview: body,
                unreadCount:
                  activeConversationId === conversationId || senderUserId === currentUserId
                    ? conversation.unreadCount
                    : conversation.unreadCount + 1,
              }
            })
          })
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
  }, [activeConversationId, currentUserId, loadConversations, supabase])

  const filteredConversations = useMemo(() => {
    const safeFilterFn = FILTER_HANDLERS[activeFilter] || FILTER_HANDLERS.all
    const normalized = searchText.trim().toLowerCase()
    const hiddenConversationId = helpCenterTargetConversation?.id
      ? String(helpCenterTargetConversation.id).trim()
      : ''
    return [...conversations]
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

  const loadMessages = async (conversationId) => {
    if (!conversationId) return
    setIsLoadingMessages(true)
    setPageError('')

    const response = await fetch(
      `/api/chat/conversations/${encodeURIComponent(conversationId)}/messages?limit=200`,
      {
        method: 'GET',
        cache: 'no-store',
      },
    ).catch(() => null)

    if (!response) {
      setPageError('Unable to load messages right now.')
      setIsLoadingMessages(false)
      return
    }

    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      setPageError(String(payload?.error || 'Unable to load messages.'))
      setIsLoadingMessages(false)
      return
    }

    const nextCurrentUserId = String(payload?.currentUserId || currentUserId || '').trim()
    if (nextCurrentUserId && nextCurrentUserId !== currentUserId) {
      setCurrentUserId(nextCurrentUserId)
    }

    const messages = Array.isArray(payload?.messages)
      ? payload.messages
          .map((row) => mapMessage(row, nextCurrentUserId))
          .filter((message) => message.id && message.text)
      : []

    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              sellerName:
                String(payload?.conversation?.vendorName || '').trim() || conversation.sellerName,
              canSend: payload?.conversation?.canSend !== false,
              participantNotice: String(payload?.conversation?.participantNotice || '').trim(),
              closedAt: payload?.conversation?.closedAt || conversation.closedAt || null,
              messages,
              unreadCount: 0,
            }
          : conversation,
      ),
    )

    setIsLoadingMessages(false)
  }

  useEffect(() => {
    if (!activeConversationId) return
    const selected = conversations.find((conversation) => conversation.id === activeConversationId)
    if (!selected) return
    if (Array.isArray(selected.messages) && selected.messages.length > 0) return
    void loadMessages(activeConversationId)
  }, [activeConversationId, conversations])

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
      helpCenterTargetConversation.messages.length > 0
    ) {
      return
    }
    void loadMessages(helpCenterTargetConversation.id)
  }, [
    connectHelpCenterConversation,
    hasAttemptedHelpCenterConnect,
    helpCenterTargetConversation,
    isConnectingHelpCenter,
    isHelpCenterOpen,
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

    setIsSending(true)
    setPageError('')

    const response = await fetch(
      `/api/chat/conversations/${encodeURIComponent(destinationConversationId)}/messages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text }),
      },
    ).catch(() => null)

    if (!response) {
      setPageError('Unable to send message right now.')
      setIsSending(false)
      return
    }

    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      setPageError(String(payload?.error || 'Unable to send message.'))
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
            updatedAt: payload?.message?.createdAt || new Date().toISOString(),
            lastMessageAtLabel: formatTimeLabel(payload?.message?.createdAt || new Date().toISOString()),
            lastMessagePreview: inserted.text,
          }
        }),
      )
    }

    setDraftMessage('')
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

  const displayConversation = useMemo(() => {
    if (!selectedConversation) return null
    if (!isLoadingMessages || selectedConversation.messages.length > 0) return selectedConversation
    return {
      ...selectedConversation,
      messages: [
        {
          id: 'loading-message',
          sender: 'seller',
          text: 'Loading messages...',
          timeLabel: '',
        },
      ],
    }
  }, [selectedConversation, isLoadingMessages])

  const showThreadOnMobile = Boolean(isMobileThreadOpen && displayConversation)

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
            searchValue={searchText}
            onSearchChange={setSearchText}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
          />
        </div>

        {displayConversation ? (
          <div className={`${showThreadOnMobile ? 'block' : 'hidden lg:block'} h-full min-h-0 overflow-hidden`}>
            <CustomerConversationThread
              conversation={displayConversation}
              draftMessage={draftMessage}
              onDraftMessageChange={setDraftMessage}
              onSendMessage={sendMessage}
              onBack={() => setIsMobileThreadOpen(false)}
              onEndChat={endActiveConversation}
              allowEndChat={!isHelpCenterOpen}
              isEndingChat={isEndingChat}
              isSending={isSending}
            />
          </div>
        ) : (
          <div className='h-full min-h-0'>
            <CustomerConversationPlaceholder />
          </div>
        )}
      </div>

      {isLoadingConversations ? (
        <div className='px-2 py-2 text-xs text-slate-400'>Loading conversations...</div>
      ) : null}
      {isSending ? (
        <div className='px-2 py-2 text-xs text-slate-400'>Sending message...</div>
      ) : null}
    </div>
  )
}
