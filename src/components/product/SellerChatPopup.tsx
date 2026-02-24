'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'
import MakeOfferModal from './MakeOfferModal'
import { useAlerts } from '@/context/AlertContext'

type SellerChatPopupProps = {
  isOpen: boolean
  onClose: () => void
  onSend?: (message: string) => void
  productId: string
  vendorName: string
  vendorAvatarUrl?: string
  hasBottomOffset?: boolean
  productPrice?: number
  currencySymbol?: string
}

type ChatMessage = {
  id: string
  sender: 'seller' | 'buyer'
  text: string
  time: string
  status?: 'sending' | 'sent' | 'delivered' | 'read'
}

type ApiMessage = {
  id?: string
  senderUserId?: string
  sender?: 'self' | 'other'
  body?: string
  createdAt?: string | null
  vendorReceivedAt?: string | null
  vendorReadAt?: string | null
}

const QUICK_START_MESSAGES = [
  'Make an Offer',
  "What's your best offer?",
  'Is this in stock?',
  "What's your return policy?",
]
const REPORT_REASONS = [
  { value: 'fraudulent_activity', label: 'Fraudulent activity' },
  { value: 'misleading_information', label: 'Misleading information' },
  { value: 'wrong_or_fake_product', label: 'Wrong or fake product' },
  { value: 'poor_quality_or_damaged', label: 'Poor quality or damaged item' },
  { value: 'abusive_or_threatening_behavior', label: 'Abusive or threatening behavior' },
  { value: 'high_pricing', label: 'High pricing' },
  { value: 'scam', label: 'Scam' },
  { value: 'other', label: 'Other' },
] as const
type ReportReasonValue = (typeof REPORT_REASONS)[number]['value']

const CHAT_SAFETY_RULES = [
  'Never share sensitive information (card details, OTPs, passwords, or bank details).',
  'Do not send your full home address in chat.',
  'Keep all payments within the official platform checkout.',
  'No abusive, offensive, or threatening language is allowed.',
  'OCPRIMES is not responsible for any transaction made outside the platform.',
]
const CHAT_SAFETY_ACCEPTED_STORAGE_KEY = 'ocp_chat_safety_acceptance_v1'

const formatTimeLabel = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const toUiMessage = (
  message: ApiMessage,
  currentUserId: string,
  customerUserId: string,
): ChatMessage | null => {
  const id = String(message?.id || '').trim()
  const text = String(message?.body || '').trim()
  if (!id || !text) return null

  const senderUserId = String(message.senderUserId || '').trim()
  const resolvedCustomerUserId = String(customerUserId || '').trim()
  const resolvedCurrentUserId = String(currentUserId || '').trim()
  const isBuyer = resolvedCustomerUserId
    ? senderUserId === resolvedCustomerUserId
    : message.sender === 'self' || senderUserId === resolvedCurrentUserId
  const vendorReadAt = String(message.vendorReadAt || '').trim()
  const buyerStatus = vendorReadAt ? 'read' : 'sent'

  return {
    id,
    sender: isBuyer ? 'buyer' : 'seller',
    text,
    time: formatTimeLabel(message.createdAt),
    status: isBuyer ? buyerStatus : undefined,
  }
}

const roundOfferAmount = (amount: number) => {
  if (!Number.isFinite(amount) || amount <= 0) return 0
  if (amount >= 100000) return Math.round(amount / 1000) * 1000
  if (amount >= 10000) return Math.round(amount / 100) * 100
  if (amount >= 1000) return Math.round(amount / 50) * 50
  return Math.round(amount)
}

const buildThoughtfulOfferPresets = (basePrice: number) => {
  const base = Number(basePrice)
  if (!Number.isFinite(base) || base <= 0) return undefined
  const candidates = [0.85, 0.9, 0.95, 0.99]
    .map((ratio) => roundOfferAmount(base * ratio))
    .filter((value) => value > 0)
  const unique = Array.from(new Set(candidates))
  let ratioCursor = 0.82
  while (unique.length < 4) {
    const next = roundOfferAmount(base * ratioCursor)
    if (next > 0 && !unique.includes(next)) unique.push(next)
    ratioCursor += 0.015
    if (ratioCursor > 0.99) break
  }
  return unique.length ? unique.slice(0, 4) : [roundOfferAmount(base)]
}

const readSafetyAcceptanceMap = () => {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(CHAT_SAFETY_ACCEPTED_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed as Record<string, boolean>
  } catch {
    return {}
  }
}

const writeSafetyAcceptance = (conversationId: string, accepted: boolean) => {
  if (typeof window === 'undefined' || !conversationId) return
  try {
    const current = readSafetyAcceptanceMap()
    current[conversationId] = accepted
    window.localStorage.setItem(CHAT_SAFETY_ACCEPTED_STORAGE_KEY, JSON.stringify(current))
  } catch {
    // Ignore storage write failures.
  }
}

export default function SellerChatPopup({
  isOpen,
  onClose,
  onSend,
  productId,
  vendorName,
  vendorAvatarUrl,
  hasBottomOffset = false,
  productPrice = 0,
  currencySymbol = '$',
}: SellerChatPopupProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), [])
  const { confirmAlert, pushAlert } = useAlerts()
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [showOfferModal, setShowOfferModal] = useState(false)
  const [hasUserSentMessage, setHasUserSentMessage] = useState(false)
  const [showQuickStarters, setShowQuickStarters] = useState(true)
  const [shouldRender, setShouldRender] = useState(isOpen)
  const [isVisible, setIsVisible] = useState(isOpen)
  const [isInitializing, setIsInitializing] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [chatError, setChatError] = useState('')
  const [chatNotice, setChatNotice] = useState('')
  const [conversationId, setConversationId] = useState('')
  const [currentUserId, setCurrentUserId] = useState('')
  const [customerUserId, setCustomerUserId] = useState('')
  const [isConversationClosed, setIsConversationClosed] = useState(false)
  const [closedConversationNotice, setClosedConversationNotice] = useState('')
  const [isClosingConversation, setIsClosingConversation] = useState(false)
  const [hasAcceptedSafetyNotice, setHasAcceptedSafetyNotice] = useState(false)
  const [safetyChecked, setSafetyChecked] = useState(false)
  const [isSafetyDecisionReady, setIsSafetyDecisionReady] = useState(false)
  const [isSafetyNoticeOpen, setIsSafetyNoticeOpen] = useState(false)
  const [sellerStatusLabel, setSellerStatusLabel] = useState('')
  const [sellerStatusAnimationKey, setSellerStatusAnimationKey] = useState(0)
  const [isConversationMenuOpen, setIsConversationMenuOpen] = useState(false)
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [selectedReportReason, setSelectedReportReason] = useState<ReportReasonValue>(
    'fraudulent_activity',
  )
  const [reportOtherDetails, setReportOtherDetails] = useState('')
  const [isSubmittingReport, setIsSubmittingReport] = useState(false)
  const messageBodyRef = useRef<HTMLDivElement | null>(null)
  const conversationMenuRef = useRef<HTMLDivElement | null>(null)

  const updateSellerStatusLabel = (nextValue: unknown) => {
    const normalized = String(nextValue || '').trim()
    setSellerStatusLabel((previous) => {
      if (previous === normalized) return previous
      setSellerStatusAnimationKey((key) => key + 1)
      return normalized
    })
  }

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true)
      const raf = window.requestAnimationFrame(() => setIsVisible(true))
      return () => window.cancelAnimationFrame(raf)
    }
    setIsVisible(false)
    const timeoutId = window.setTimeout(() => setShouldRender(false), 240)
    return () => window.clearTimeout(timeoutId)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    let cancelled = false

    const initializeConversation = async () => {
      setIsInitializing(true)
      setChatError('')
      setChatNotice('')
      setConversationId('')
      setCurrentUserId('')
      setCustomerUserId('')
      setIsConversationClosed(false)
      setClosedConversationNotice('')
      setIsClosingConversation(false)
      setMessages([])
      setHasUserSentMessage(false)
      setShowQuickStarters(true)
      setHasAcceptedSafetyNotice(false)
      setSafetyChecked(false)
      setIsSafetyDecisionReady(false)
      setIsSafetyNoticeOpen(false)
      updateSellerStatusLabel('')
      setIsReportModalOpen(false)
      setSelectedReportReason('fraudulent_activity')
      setReportOtherDetails('')
      setIsSubmittingReport(false)

      if (!String(productId || '').trim()) {
        setChatError('Chat is unavailable for this product.')
        setIsInitializing(false)
        return
      }

      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
        }),
      }).catch(() => null)

      if (!response) {
        if (!cancelled) {
          setChatError('Unable to connect to chat right now.')
          setIsInitializing(false)
        }
        return
      }

      const payload = await response.json().catch(() => null)

      if (cancelled) return

      if (!response.ok) {
        setChatError(String(payload?.error || 'Unable to load chat.'))
        setIsInitializing(false)
        return
      }

      const nextUserId = String(payload?.currentUserId || '').trim()
      const nextConversationId = String(payload?.conversation?.id || '').trim()
      const nextCustomerUserId = String(payload?.conversation?.customerUserId || '').trim()

      setCurrentUserId(nextUserId)
      setConversationId(nextConversationId)
      setCustomerUserId(nextCustomerUserId)
      const canSend = payload?.conversation?.canSend !== false
      setIsConversationClosed(!canSend)
      setClosedConversationNotice(
        String(payload?.conversation?.participantNotice || '').trim(),
      )
      updateSellerStatusLabel(payload?.sellerStatusLabel)

      const nextMessages = Array.isArray(payload?.messages)
        ? payload.messages
            .map((message: ApiMessage) =>
              toUiMessage(message, nextUserId, nextCustomerUserId),
            )
            .filter((message: ChatMessage | null): message is ChatMessage => Boolean(message))
        : []

      setMessages(nextMessages)

      const userHasSentMessage = nextMessages.some((message) => message.sender === 'buyer')
      setHasUserSentMessage(userHasSentMessage)
      setShowQuickStarters(!userHasSentMessage)
      const acceptedMap = readSafetyAcceptanceMap()
      const hasStoredAcceptance = Boolean(nextConversationId && acceptedMap[nextConversationId])
      const hasExistingConversationActivity =
        nextMessages.length > 0 || Boolean(String(payload?.conversation?.lastMessageAt || '').trim())
      const shouldSkipSafetyNotice = hasStoredAcceptance || hasExistingConversationActivity
      setHasAcceptedSafetyNotice((previous) =>
        previous === shouldSkipSafetyNotice ? previous : shouldSkipSafetyNotice,
      )
      setSafetyChecked((previous) =>
        previous === shouldSkipSafetyNotice ? previous : shouldSkipSafetyNotice,
      )
      setIsSafetyNoticeOpen(!shouldSkipSafetyNotice)
      setIsSafetyDecisionReady(true)
      setIsInitializing(false)
    }

    void initializeConversation()

    return () => {
      cancelled = true
    }
  }, [isOpen, productId])

  useEffect(() => {
    if (!isOpen || !conversationId) return

    const channel = supabase
      .channel(`chat-conversation-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const next = toUiMessage(
            {
              id: String(payload.new?.id || ''),
              senderUserId: String(payload.new?.sender_user_id || ''),
              body: String(payload.new?.body || ''),
              createdAt: String(payload.new?.created_at || ''),
            },
            currentUserId,
            customerUserId,
          )

          if (!next) return

          if (next.sender === 'seller') {
            updateSellerStatusLabel('Online')
          }

          setMessages((previous) => {
            const existingIndex = previous.findIndex((message) => message.id === next.id)
            if (existingIndex >= 0) {
              return previous.map((message, index) =>
                index === existingIndex && message.sender === 'buyer'
                  ? { ...message, status: next.status || message.status }
                  : message,
              )
            }
            return [...previous, next]
          })
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = toUiMessage(
            {
              id: String(payload.new?.id || ''),
              senderUserId: String(payload.new?.sender_user_id || ''),
              body: String(payload.new?.body || ''),
              createdAt: String(payload.new?.created_at || ''),
              vendorReceivedAt: String(payload.new?.vendor_received_at || ''),
              vendorReadAt: String(payload.new?.vendor_read_at || ''),
            },
            currentUserId,
            customerUserId,
          )

          if (!updated) return

          if (String(payload.new?.vendor_read_at || '').trim()) {
            updateSellerStatusLabel('Online')
          }

          setMessages((previous) =>
            previous.map((message) =>
              message.id === updated.id
                ? {
                    ...message,
                    status: updated.status || message.status,
                  }
                : message,
            ),
          )
        },
      )

    channel.subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [conversationId, currentUserId, customerUserId, isOpen, supabase])

  useEffect(() => {
    if (!isOpen || !conversationId) return

    const channel = supabase
      .channel(`chat-conversation-status-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_conversations',
          filter: `id=eq.${conversationId}`,
        },
        (payload) => {
          const closedAt = String(payload.new?.closed_at || '').trim()
          const closedReason = String(payload.new?.closed_reason || '').trim()
          const isClosed = Boolean(closedAt)
          setIsConversationClosed(isClosed)
          if (isClosed) {
            const reasonNotice =
              closedReason === 'product_unavailable'
                ? 'This chat was closed because this product is unavailable and will disappear in 7 days.'
                : closedReason === 'inactive'
                  ? 'This chat was closed due to inactivity and will disappear in 7 days.'
                  : 'This chat is closed and will disappear in 7 days.'
            setClosedConversationNotice(reasonNotice)
          } else {
            setClosedConversationNotice('')
          }
        },
      )

    channel.subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [conversationId, isOpen, supabase])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (isGuideModalOpen) {
        setIsGuideModalOpen(false)
        return
      }
      if (isReportModalOpen) {
        setIsReportModalOpen(false)
        return
      }
      if (isSafetyNoticeOpen) {
        setIsSafetyNoticeOpen(false)
        return
      }
      if (showOfferModal) {
        setShowOfferModal(false)
        return
      }
      onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isGuideModalOpen, isOpen, isReportModalOpen, isSafetyNoticeOpen, onClose, showOfferModal])

  useEffect(() => {
    if (!isConversationMenuOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!conversationMenuRef.current) return
      if (conversationMenuRef.current.contains(event.target as Node)) return
      setIsConversationMenuOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isConversationMenuOpen])

  useEffect(() => {
    if (!isOpen || !conversationId) return
    let cancelled = false

    const refreshSellerPresence = async () => {
      const response = await fetch(
        `/api/chat/conversations/${encodeURIComponent(conversationId)}/presence`,
        {
          method: 'GET',
          cache: 'no-store',
        },
      ).catch(() => null)

      if (!response) return
      const payload = await response.json().catch(() => null)
      if (cancelled || !response.ok) return
      updateSellerStatusLabel(payload?.sellerStatusLabel)
      const canSend = payload?.conversation?.canSend !== false
      setIsConversationClosed(!canSend)
      setClosedConversationNotice(
        String(payload?.conversation?.participantNotice || '').trim(),
      )
    }

    void refreshSellerPresence()
    const intervalId = window.setInterval(() => {
      void refreshSellerPresence()
    }, 15000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [conversationId, isOpen])

  useEffect(() => {
    if (!isOpen) return
    const container = messageBodyRef.current
    if (!container) return
    container.scrollTop = container.scrollHeight
  }, [isOpen, messages])

  if (!shouldRender) return null

  const popupDesktopBottomClass = hasBottomOffset ? 'sm:bottom-28' : 'sm:bottom-24'
  const offerPresets = buildThoughtfulOfferPresets(productPrice)

  const sendMessage = async (rawMessage: string) => {
    const body = String(rawMessage || '').trim()
    if (!hasAcceptedSafetyNotice) {
      setChatError('Please accept the chat safety notice before sending messages.')
      setIsSafetyNoticeOpen(true)
      return
    }
    if (isConversationClosed) {
      setChatError(
        closedConversationNotice || 'This chat is closed. You can no longer send messages.',
      )
      return
    }
    if (!body || !conversationId || isSending || isInitializing) return

    const optimisticId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      sender: 'buyer',
      text: body,
      time: formatTimeLabel(new Date().toISOString()),
      status: 'sending',
    }

    setMessages((previous) => [...previous, optimisticMessage])
    setDraft('')
    setChatNotice('')
    onSend?.(body)

    if (!hasUserSentMessage) {
      setHasUserSentMessage(true)
    }

    if (showQuickStarters) {
      setShowQuickStarters(false)
    }

    setIsSending(true)
    setChatError('')

    const response = await fetch(
      `/api/chat/conversations/${encodeURIComponent(conversationId)}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body }),
      },
    ).catch(() => null)

    if (!response) {
      setChatError('Unable to send message right now.')
      setMessages((previous) => previous.filter((message) => message.id !== optimisticId))
      setDraft(body)
      setIsSending(false)
      return
    }

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      setChatError(String(payload?.error || 'Unable to send message.'))
      setMessages((previous) => previous.filter((message) => message.id !== optimisticId))
      setDraft(body)
      setIsSending(false)
      return
    }

    const inserted = toUiMessage(payload?.message, currentUserId, customerUserId)
    if (inserted) {
      setMessages((previous) => {
        const hasServerMessage = previous.some((message) => message.id === inserted.id)
        if (hasServerMessage) {
          return previous.filter((message) => message.id !== optimisticId)
        }
        return previous.map((message) =>
          message.id === optimisticId
            ? {
                ...inserted,
                status: inserted.sender === 'buyer' ? 'sent' : inserted.status,
              }
            : message,
        )
      })
    } else {
      setMessages((previous) => previous.filter((message) => message.id !== optimisticId))
      setDraft(body)
    }

    setIsSending(false)
  }

  const handleSend = () => {
    void sendMessage(draft)
  }

  const handleQuickStartClick = (message: string) => {
    if (!hasAcceptedSafetyNotice) {
      setChatError('Please accept the chat safety notice before sending messages.')
      setIsSafetyNoticeOpen(true)
      return
    }
    if (isConversationClosed) {
      setChatError(
        closedConversationNotice || 'This chat is closed. You can no longer send messages.',
      )
      return
    }
    if (message === 'Make an Offer') {
      setShowOfferModal(true)
      return
    }
    setDraft(message)
  }

  const acceptSafetyNotice = () => {
    if (!safetyChecked || hasAcceptedSafetyNotice) return
    setHasAcceptedSafetyNotice((previous) => (previous ? previous : true))
    setIsSafetyNoticeOpen(false)
    writeSafetyAcceptance(conversationId, true)
    if (chatError) {
      setChatError('')
    }
  }

  const sendDisabled =
    !isSafetyDecisionReady ||
    !hasAcceptedSafetyNotice ||
    isConversationClosed ||
    draft.trim().length === 0 ||
    !conversationId ||
    isSending ||
    isInitializing

  const handleOpenGuide = () => {
    setIsConversationMenuOpen(false)
    setIsGuideModalOpen(true)
  }

  const handleReportConversation = () => {
    setIsConversationMenuOpen(false)
    setIsReportModalOpen(true)
    setChatError('')
    setChatNotice('')
  }

  const handleSubmitReport = async () => {
    if (isSubmittingReport) return
    if (selectedReportReason === 'other' && !reportOtherDetails.trim()) {
      setChatError('Please describe the issue before submitting report.')
      setChatNotice('')
      return
    }
    const confirmed = await confirmAlert({
      type: 'warning',
      title: 'Confirm report',
      message:
        'OCPRIMES takes reporting very seriously and will investigate this complaint. Please make sure your suspicion is accurate before proceeding.',
      confirmLabel: 'Continue',
      cancelLabel: 'Cancel',
    })
    if (!confirmed) return

    setIsSubmittingReport(true)
    setChatError('')
    setChatNotice('')

    const response = await fetch('/api/chat/help-center/report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason: selectedReportReason,
        otherDetails: reportOtherDetails,
        reportedSellerName: vendorName,
        productId: String(productId || '').trim() || undefined,
        sourceConversationId: String(conversationId || '').trim() || undefined,
      }),
    }).catch(() => null)

    if (!response) {
      setChatError('Unable to submit report right now.')
      setIsSubmittingReport(false)
      return
    }

    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      setChatError(String(payload?.error || 'Unable to submit report.'))
      setIsSubmittingReport(false)
      return
    }

    setIsReportModalOpen(false)
    setSelectedReportReason('fraudulent_activity')
    setReportOtherDetails('')
    setChatError('')
    setChatNotice('Report sent to Help Center successfully.')
    pushAlert({
      type: 'success',
      title: 'Report submitted',
      message: 'Your report has been sent to Help Center.',
    })
    setIsSubmittingReport(false)
  }

  const handleCloseConversation = async () => {
    if (!conversationId || isClosingConversation) {
      setIsConversationMenuOpen(false)
      return
    }
    const confirmed = await confirmAlert({
      type: 'warning',
      title: 'End chat',
      message:
        'End this chat for this product? You and the seller will not be able to send messages, and it will disappear in 7 days.',
      confirmLabel: 'End chat',
      cancelLabel: 'Cancel',
    })
    if (!confirmed) {
      setIsConversationMenuOpen(false)
      return
    }
    setIsConversationMenuOpen(false)
    setIsClosingConversation(true)

    const response = await fetch(
      `/api/chat/conversations/${encodeURIComponent(conversationId)}/close`,
      {
        method: 'POST',
      },
    ).catch(() => null)

    if (!response) {
      setChatError('Unable to close chat right now.')
      setIsClosingConversation(false)
      return
    }

    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      setChatError(String(payload?.error || 'Unable to close chat.'))
      setIsClosingConversation(false)
      return
    }

    const notice = String(payload?.conversation?.participantNotice || '').trim()
    setIsConversationClosed(true)
    setClosedConversationNotice(
      notice || 'This chat is closed and will disappear in 7 days.',
    )
    setChatError('')
    setIsClosingConversation(false)
  }

  return (
    <>
      <div
        className={`fixed inset-x-0 bottom-0 z-[60] w-full transition-[opacity,transform] duration-300 ease-out sm:inset-x-auto sm:right-4 sm:w-[22rem] ${popupDesktopBottomClass} ${
          isVisible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
        }`}
      >
        <div className='relative max-h-[calc(100dvh-4.25rem)] overflow-hidden rounded-t-2xl rounded-b-none border border-gray-200 bg-[#f3f4f6] shadow-[0_12px_32px_rgba(15,23,42,0.18)] [@media(max-height:760px)]:max-h-[calc(100dvh-5rem)] sm:max-h-none sm:rounded-2xl'>
        <div className='bg-white pt-2 sm:hidden'>
          <button
            type='button'
            onClick={onClose}
            aria-label='Close chat popup'
            className='mx-auto block h-1.5 w-14 rounded-full bg-gray-500/80 transition hover:bg-gray-500'
          />
        </div>
        <div className='border-b border-gray-200 bg-white'>
          <div className='flex items-center justify-between px-3.5 pb-2 pt-3'>
            <div className='text-base font-semibold tracking-tight text-gray-900'>Message</div>
            <button
              type='button'
              onClick={onClose}
              aria-label='Close chat popup'
              className='hidden h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-white hover:text-slate-700 sm:inline-flex sm:bg-slate-100/80'
            >
              <svg
                viewBox='0 0 20 20'
                className='h-3.5 w-3.5'
                fill='none'
                stroke='currentColor'
                strokeWidth='1.8'
                aria-hidden='true'
              >
                <path d='M6 6l8 8M14 6l-8 8' strokeLinecap='round' />
              </svg>
            </button>
          </div>
          <div className='flex items-center justify-between gap-3 px-3.5 pb-3'>
            <div className='flex min-w-0 flex-1 items-center gap-2'>
              {vendorAvatarUrl ? (
                <img
                  src={vendorAvatarUrl}
                  alt={`${vendorName} avatar`}
                  className='h-9 w-9 rounded-full object-cover ring-1 ring-slate-200'
                />
              ) : (
                <div className='relative h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-amber-300 via-fuchsia-400 to-sky-500 p-[2px] shadow-md'>
                  <div className='flex h-full w-full items-center justify-center rounded-full bg-white text-base font-semibold text-slate-900'>
                    OC
                  </div>
                </div>
              )}
              <div className='min-w-0 flex-1'>
                <div className='truncate text-sm font-semibold text-gray-900'>{vendorName}</div>
                <div className='flex flex-wrap items-center gap-x-1 text-[11px] leading-tight text-gray-500'>
                  <span>Seller</span>
                  {sellerStatusLabel ? (
                    <>
                      <span aria-hidden='true'>•</span>
                      <span
                        key={sellerStatusAnimationKey}
                        className={`seller-status-animate whitespace-normal break-words font-medium ${
                          sellerStatusLabel === 'Online' ? 'text-green-600' : 'text-gray-500'
                        }`}
                      >
                        {sellerStatusLabel}
                      </span>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
            <div className='relative' ref={conversationMenuRef}>
              <button
                type='button'
                aria-label='Conversation info'
                onClick={() => setIsConversationMenuOpen((previous) => !previous)}
                className='inline-flex h-7 w-7 items-center justify-center text-slate-500 transition hover:text-slate-700'
              >
                <svg viewBox='0 0 20 20' className='h-3.5 w-3.5' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                  <circle cx='10' cy='10' r='7' />
                  <path d='M10 8.2v5' strokeLinecap='round' />
                  <circle cx='10' cy='5.7' r='0.8' fill='currentColor' stroke='none' />
                </svg>
              </button>
              {isConversationMenuOpen ? (
                <div className='absolute right-0 top-8 z-20 min-w-[150px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg'>
                  <button
                    type='button'
                    onClick={handleOpenGuide}
                    className='block w-full px-3 py-2 text-left text-xs font-medium text-slate-700 transition hover:bg-slate-50'
                  >
                    Open Guide
                  </button>
                  <button
                    type='button'
                    onClick={handleCloseConversation}
                    disabled={isClosingConversation}
                    className='block w-full px-3 py-2 text-left text-xs font-medium text-slate-700 transition hover:bg-slate-50'
                  >
                    {isClosingConversation ? 'Ending chat...' : 'End chat'}
                  </button>
                  <button
                    type='button'
                    onClick={handleReportConversation}
                    className='block w-full px-3 py-2 text-left text-xs font-medium text-rose-600 transition hover:bg-rose-50'
                  >
                    Report
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div
          ref={messageBodyRef}
          className={`seller-chat-scrollbar relative min-h-[42dvh] max-h-[48dvh] px-3 pb-3 pt-2 [@media(max-height:760px)]:min-h-[34dvh] [@media(max-height:760px)]:max-h-[38dvh] sm:min-h-[19rem] sm:max-h-[19rem] ${
            hasAcceptedSafetyNotice ? 'overflow-y-auto' : 'overflow-hidden'
          }`}
        >
          <div className='mb-2 flex justify-center'>
            <span className='rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-gray-500 shadow-sm'>
              Today
            </span>
          </div>

          {chatError ? (
            <div className='mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800'>
              {chatError}
            </div>
          ) : null}
          {chatNotice ? (
            <div className='mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700'>
              {chatNotice}
            </div>
          ) : null}
          {isInitializing ? (
            <div className='py-6 text-center text-sm text-gray-500'>Connecting to chat...</div>
          ) : (
            <div className='space-y-2.5'>
              {messages.length === 0 ? (
                <div className='flex min-h-[28dvh] items-center justify-center px-4 text-center sm:min-h-[12rem]'>
                  <p className='text-base font-medium text-slate-500'>Ask question about this product</p>
                </div>
              ) : null}
              {messages.map((message) => {
                const isBuyer = message.sender === 'buyer'
                return (
                  <div key={message.id} className={`flex ${isBuyer ? 'justify-end' : 'justify-start'}`}>
                    <div className='max-w-[85%]'>
                      <div
                        className={`rounded-2xl px-3 py-2 text-sm leading-snug ${
                          isBuyer
                            ? 'rounded-br-md bg-blue-600 text-white'
                            : 'rounded-bl-md bg-white text-gray-900'
                        }`}
                      >
                        {message.text}
                      </div>
                      <div
                        className={`mt-1 flex items-center gap-1 text-[10px] text-gray-500 ${
                          isBuyer ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <span>{message.time}</span>
                        {isBuyer ? (
                          <span aria-label={`Message ${message.status || 'delivered'}`} className='inline-flex items-center'>
                            {message.status === 'sending' ? (
                              <span className='inline-block h-2.5 w-2.5 animate-spin rounded-full border border-gray-400 border-t-transparent' />
                            ) : message.status === 'read' ? (
                              <svg viewBox='0 0 16 16' className='h-3.5 w-3.5 text-sky-500' fill='none' stroke='currentColor' strokeWidth='1.6' aria-hidden='true'>
                                <path d='m1.8 8.6 2 2L8 5.8' strokeLinecap='round' strokeLinejoin='round' />
                                <path d='m6 8.6 2 2L13 5.8' strokeLinecap='round' strokeLinejoin='round' />
                              </svg>
                            ) : (
                              <svg viewBox='0 0 16 16' className='h-3 w-3 text-gray-500' fill='none' stroke='currentColor' strokeWidth='1.6' aria-hidden='true'>
                                <path d='m3.5 8.5 2.2 2.2L12.5 4.5' strokeLinecap='round' strokeLinejoin='round' />
                              </svg>
                            )}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )
              })}
              {isConversationClosed ? (
                <div className='flex justify-center pt-1'>
                  <div className='max-w-[92%] rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-center text-xs text-slate-700'>
                    {closedConversationNotice || 'This chat is closed and will disappear in 7 days.'}
                  </div>
                </div>
              ) : null}
            </div>
          )}
          {isSafetyDecisionReady && !hasAcceptedSafetyNotice && isSafetyNoticeOpen ? (
            <div className='absolute inset-0 z-20 p-2'>
              <div className='h-full rounded-xl bg-black/15 p-1'>
                <div className='modal-thin-scrollbar h-full overflow-y-auto rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 shadow-sm'>
                  <div className='mb-1 flex items-start justify-between gap-3'>
                    <p className='text-sm font-semibold text-amber-950'>Chat Safety Notice</p>
                    <button
                      type='button'
                      onClick={() => setIsSafetyNoticeOpen(false)}
                      aria-label='Close safety notice'
                      className='inline-flex h-6 w-6 items-center justify-center rounded-full text-amber-800 transition hover:bg-amber-100'
                    >
                      <svg viewBox='0 0 20 20' className='h-3.5 w-3.5' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                        <path d='M6 6l8 8M14 6l-8 8' strokeLinecap='round' />
                      </svg>
                    </button>
                  </div>
                  <p className='mb-2 text-[11px] text-amber-900'>Before continuing, please note:</p>
                  <ul className='mb-2 list-disc space-y-1 pl-4 text-[11px] leading-relaxed'>
                    {CHAT_SAFETY_RULES.map((rule) => (
                      <li key={rule}>{rule}</li>
                    ))}
                  </ul>
                  <p className='mb-2 text-[11px] text-amber-900'>
                    By continuing, you agree to follow these safety guidelines.
                  </p>
                  <label className='mb-2 flex items-start gap-2 text-[11px] text-amber-900'>
                    <input
                      type='checkbox'
                      checked={safetyChecked}
                      onChange={(event) => setSafetyChecked(event.target.checked)}
                      className='mt-0.5 h-3.5 w-3.5 rounded border-amber-400 text-amber-700 focus:ring-amber-500'
                    />
                    <span>I understand and agree to these safety guidelines.</span>
                  </label>
                  <button
                    type='button'
                    onClick={acceptSafetyNotice}
                    disabled={!safetyChecked || hasAcceptedSafetyNotice}
                    className='inline-flex items-center rounded-md bg-amber-700 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:bg-amber-300'
                  >
                    Accept and Continue
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

          <div className='border-t border-gray-200 bg-transparent p-2.5'>
            {isSafetyDecisionReady && !hasAcceptedSafetyNotice && !isSafetyNoticeOpen ? (
              <div className='mb-2 flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800'>
                <span>Accept safety notice to start chat.</span>
                <button
                  type='button'
                  onClick={() => setIsSafetyNoticeOpen(true)}
                  className='shrink-0 rounded-md bg-amber-700 px-2 py-1 text-[10px] font-semibold text-white transition hover:bg-amber-800'
                >
                  Open Safety Notice
                </button>
              </div>
            ) : null}
            <div
              className={`overflow-hidden transition-all duration-300 ease-out ${
                hasAcceptedSafetyNotice && showQuickStarters
                  ? 'mb-2 max-h-20 translate-y-0 opacity-100'
                  : 'mb-0 max-h-0 -translate-y-2 opacity-0 pointer-events-none'
              }`}
            >
              <div className='seller-chip-scrollbar flex gap-2 overflow-x-auto pb-0.5'>
                {QUICK_START_MESSAGES.map((message) => (
                  <button
                    key={message}
                    type='button'
                    onClick={() => handleQuickStartClick(message)}
                    disabled={!hasAcceptedSafetyNotice || isConversationClosed}
                    className='shrink-0 rounded-[10px] border border-green-500 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 transition hover:bg-green-100'
                  >
                    {message}
                  </button>
                ))}
              </div>
            </div>
            {hasUserSentMessage && !showQuickStarters && (
              <div className='mb-0 flex h-3 items-center justify-center'>
                <button
                  type='button'
                  onClick={() => setShowQuickStarters(true)}
                  aria-label='Show quick messages'
                  className='inline-flex items-center justify-center text-gray-700 transition hover:text-gray-900'
                >
                  <svg
                    viewBox='0 0 32 32'
                    className='h-7 w-7'
                    fill='currentColor'
                    xmlns='http://www.w3.org/2000/svg'
                    aria-hidden='true'
                  >
                    <path d='M16.767 12.809l-0.754-0.754-6.035 6.035 0.754 0.754 5.281-5.281 5.256 5.256 0.754-0.754-3.013-3.013z' />
                  </svg>
                </button>
              </div>
            )}
            <div className='flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1.5 transition focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200'>
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={
                  hasAcceptedSafetyNotice
                    ? conversationId
                      ? isConversationClosed
                        ? 'This chat is closed'
                        : `Message ${vendorName}...`
                      : 'Sign in to start chat'
                    : 'Accept safety notice to start chat'
                }
                disabled={!hasAcceptedSafetyNotice || !conversationId || isInitializing || isConversationClosed}
                className='min-w-0 flex-1 appearance-none border-0 bg-white text-sm text-gray-800 shadow-none outline-none ring-0 placeholder:text-gray-500 focus:border-0 focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60'
                aria-label='Type a message'
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    handleSend()
                  }
                }}
              />
              <button
                type='button'
                aria-label='Add attachment'
                className='inline-flex h-6 w-6 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-700'
              >
                <svg viewBox='0 0 24 24' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='2' aria-hidden='true'>
                  <path d='M12 5v14M5 12h14' strokeLinecap='round' />
                </svg>
              </button>
              <button
                type='button'
                disabled={sendDisabled}
                onClick={handleSend}
                aria-label='Send message'
                className='inline-flex h-6 w-6 items-center justify-center rounded-full text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-blue-300'
              >
                <svg viewBox='0 0 24 24' className='h-4 w-4' fill='currentColor' aria-hidden='true'>
                  <path d='M20.62 3.38a1 1 0 00-1.02-.24L3.74 8.43a1 1 0 00.04 1.91l6.55 2.02 2.02 6.55a1 1 0 001.91.04l5.29-15.86a1 1 0 00-.24-1.02l-.69.69.69-.69zM11.1 11.5l6.57-6.57-4.07 11.95-1.49-4.83a1 1 0 00-.66-.66L6.62 9.9l4.48 1.6z' />
                </svg>
              </button>
            </div>
          </div>
        </div>
        <style jsx>{`
          .seller-chat-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: rgba(148, 163, 184, 0.9) transparent;
          }
          .seller-chat-scrollbar::-webkit-scrollbar {
            width: 5px;
          }
          .seller-chat-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .seller-chat-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.9);
            border-radius: 9999px;
          }
          .seller-chat-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(100, 116, 139, 0.95);
          }
          .seller-chip-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: rgba(148, 163, 184, 0.8) transparent;
          }
          .seller-chip-scrollbar::-webkit-scrollbar {
            height: 2px;
          }
          .seller-chip-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .seller-chip-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.8);
            border-radius: 9999px;
          }
          .modal-thin-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: rgba(148, 163, 184, 0.85) transparent;
          }
          .modal-thin-scrollbar::-webkit-scrollbar {
            width: 3px;
            height: 3px;
          }
          .modal-thin-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .modal-thin-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.85);
            border-radius: 9999px;
          }
          .modal-thin-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(100, 116, 139, 0.95);
          }
        `}</style>
        <style jsx>{`
          .seller-status-animate {
            animation: sellerStatusIn 220ms ease-out;
          }
          .report-sheet-animate {
            animation: reportSheetIn 240ms ease-out;
          }

          @keyframes sellerStatusIn {
            from {
              opacity: 0;
              transform: translateY(3px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes reportSheetIn {
            from {
              opacity: 0;
              transform: translateY(22px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
      <MakeOfferModal
        isOpen={showOfferModal}
        onClose={() => setShowOfferModal(false)}
        productPrice={productPrice}
        presetAmounts={offerPresets}
        currencySymbol={currencySymbol}
        onSubmit={(amount) => {
          if (!hasAcceptedSafetyNotice) {
            setChatError('Please accept the chat safety notice before sending messages.')
            setShowOfferModal(false)
            return
          }
          if (isConversationClosed) {
            setChatError(
              closedConversationNotice || 'This chat is closed. You can no longer send messages.',
            )
            setShowOfferModal(false)
            return
          }
          void sendMessage(
            `I'd like to offer ${currencySymbol}${amount.toLocaleString('en-US')}.`,
          )
          setShowOfferModal(false)
        }}
      />
      {isGuideModalOpen ? (
        <div
          className='fixed inset-0 z-[90] flex items-center justify-center bg-black/50 px-4'
          role='dialog'
          aria-modal='true'
          aria-label='Chat safety guide'
        >
          <div className='w-full max-w-sm rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-2xl'>
            <div className='mb-2 flex items-start justify-between gap-3'>
              <div>
                <p className='text-sm font-semibold text-amber-950'>Chat Safety Guide</p>
                <p className='text-[11px] text-amber-900'>Reminder of the rules you already accepted.</p>
              </div>
              <button
                type='button'
                onClick={() => setIsGuideModalOpen(false)}
                aria-label='Close guide'
                className='inline-flex h-7 w-7 items-center justify-center rounded-full text-amber-800 transition hover:bg-amber-100'
              >
                <svg viewBox='0 0 20 20' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                  <path d='M6 6l8 8M14 6l-8 8' strokeLinecap='round' />
                </svg>
              </button>
            </div>
            <ul className='list-disc space-y-1 pl-4 text-[12px] leading-relaxed'>
              {CHAT_SAFETY_RULES.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
            <div className='mt-3 flex justify-end'>
              <button
                type='button'
                onClick={() => setIsGuideModalOpen(false)}
                className='inline-flex items-center rounded-md bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-800'
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {isReportModalOpen ? (
        <div
          className='fixed inset-0 z-[9999] flex items-end justify-center overflow-hidden bg-black/50 px-0 pt-[max(env(safe-area-inset-top),0.25rem)] sm:items-center sm:overflow-y-auto sm:px-4 sm:pb-4 sm:pt-[max(env(safe-area-inset-top),1rem)]'
          role='dialog'
          aria-modal='true'
          aria-label='Report this product'
        >
          <div className='modal-thin-scrollbar report-sheet-animate w-full max-w-none rounded-t-2xl border border-slate-200 bg-white p-4 shadow-2xl max-h-[84dvh] overflow-y-auto sm:my-auto sm:max-w-md sm:rounded-2xl sm:max-h-[calc(100dvh-2rem)]'>
            <div className='mb-3 flex items-start justify-between gap-3'>
              <div>
                <p className='text-sm font-semibold text-slate-900'>Report this product</p>
                <p className='text-xs text-slate-500'>Select what happened and send to Help Center.</p>
              </div>
              <button
                type='button'
                onClick={() => setIsReportModalOpen(false)}
                aria-label='Close report dialog'
                className='inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700'
              >
                <svg viewBox='0 0 20 20' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                  <path d='M6 6l8 8M14 6l-8 8' strokeLinecap='round' />
                </svg>
              </button>
            </div>

            <div className='space-y-2 pr-1'>
              {REPORT_REASONS.map((reason) => {
                const checked = selectedReportReason === reason.value
                return (
                  <label
                    key={reason.value}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                      checked
                        ? 'border-blue-200 bg-blue-50 text-blue-800'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type='radio'
                      name='report-reason'
                      value={reason.value}
                      checked={checked}
                      onChange={() => setSelectedReportReason(reason.value)}
                      className='h-4 w-4 accent-blue-600'
                    />
                    <span>{reason.label}</span>
                  </label>
                )
              })}
            </div>

            {selectedReportReason === 'other' ? (
              <div className='mt-3'>
                <label className='mb-1 block text-xs font-medium text-slate-600'>
                  Describe the issue
                </label>
                <textarea
                  value={reportOtherDetails}
                  onChange={(event) => setReportOtherDetails(event.target.value)}
                  rows={3}
                  maxLength={600}
                  placeholder='Tell us what happened...'
                  className='w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-400'
                />
              </div>
            ) : null}
            <div className='mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800'>
              OCPRIMES takes reporting very seriously and investigates complaints. Please make sure your suspicion is accurate before proceeding.
            </div>

            <div className='mt-4 flex justify-end gap-2'>
              <button
                type='button'
                onClick={() => setIsReportModalOpen(false)}
                className='rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50'
              >
                Cancel
              </button>
              <button
                type='button'
                onClick={handleSubmitReport}
                disabled={isSubmittingReport}
                className='rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60'
              >
                {isSubmittingReport ? 'Sending report...' : 'Send Report'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
