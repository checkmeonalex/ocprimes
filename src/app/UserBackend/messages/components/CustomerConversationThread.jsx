'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { parseOrderInquiryMessage } from '@/lib/chat/inquiry-message'
import { buildThreadItemsWithDateSeparators } from '@/lib/chat/message-date.ts'
import {
  formatVoiceDurationLabel,
  parseVoiceMessageBody,
} from '@/lib/chat/voice-message'
import { useVoiceRecorder } from '@/lib/chat/use-voice-recorder'

const HELP_CENTER_VIRTUAL_CONVERSATION_ID = '__help_center__'

const getInitials = (name) =>
  String(name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'S'

const MessageStatusIcon = ({ status }) => {
  if (status === 'sending') {
    return (
      <span
        className='inline-block h-2.5 w-2.5 animate-spin rounded-full border border-current border-t-transparent'
        aria-label='Sending'
      />
    )
  }

  if (status === 'read') {
    return (
      <svg viewBox='0 0 16 16' className='h-3.5 w-3.5 text-sky-400' fill='none' stroke='currentColor' strokeWidth='1.6' aria-label='Read'>
        <path d='m1.8 8.6 2 2L8 5.8' strokeLinecap='round' strokeLinejoin='round' />
        <path d='m6 8.6 2 2L13 5.8' strokeLinecap='round' strokeLinejoin='round' />
      </svg>
    )
  }

  if (status === 'delivered') {
    return (
      <svg viewBox='0 0 16 16' className='h-3.5 w-3.5' fill='none' stroke='currentColor' strokeWidth='1.6' aria-label='Delivered'>
        <path d='m1.8 8.6 2 2L8 5.8' strokeLinecap='round' strokeLinejoin='round' />
        <path d='m6 8.6 2 2L13 5.8' strokeLinecap='round' strokeLinejoin='round' />
      </svg>
    )
  }

  return (
    <svg viewBox='0 0 16 16' className='h-3 w-3' fill='none' stroke='currentColor' strokeWidth='1.6' aria-label='Sent'>
      <path d='m3.5 8.5 2.2 2.2L12.5 4.5' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
  )
}

const SendMessageIcon = ({ className = 'h-4 w-4' }) => (
  <svg viewBox='0 0 24 24' className={className} fill='none' aria-hidden='true'>
    <path
      d='M10.3009 13.6949L20.102 3.89742'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path
      d='M10.5795 14.1355L12.8019 18.5804C13.339 19.6545 13.6075 20.1916 13.9458 20.3356C14.2394 20.4606 14.575 20.4379 14.8492 20.2747C15.1651 20.0866 15.3591 19.5183 15.7472 18.3818L19.9463 6.08434C20.2845 5.09409 20.4535 4.59896 20.3378 4.27142C20.2371 3.98648 20.013 3.76234 19.7281 3.66167C19.4005 3.54595 18.9054 3.71502 17.9151 4.05315L5.61763 8.2523C4.48114 8.64037 3.91289 8.83441 3.72478 9.15032C3.56153 9.42447 3.53891 9.76007 3.66389 10.0536C3.80791 10.3919 4.34498 10.6605 5.41912 11.1975L9.86397 13.42C10.041 13.5085 10.1295 13.5527 10.2061 13.6118C10.2742 13.6643 10.3352 13.7253 10.3876 13.7933C10.4468 13.87 10.491 13.9585 10.5795 14.1355Z'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
)

const MicIcon = ({ className = 'h-5 w-5' }) => (
  <svg viewBox='0 0 24 24' className={className} fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
    <rect x='9' y='3.5' width='6' height='10' rx='3' />
    <path d='M6.5 10.5a5.5 5.5 0 1 0 11 0M12 16v4M9 20h6' strokeLinecap='round' strokeLinejoin='round' />
  </svg>
)

export default function CustomerConversationThread({
  conversation,
  draftMessage,
  onDraftMessageChange,
  onSendMessage,
  onSendVoiceMessage = async () => {},
  onLoadOlderMessages = async () => {},
  inquiryContext = null,
  onClearInquiryContext = () => {},
  onBack,
  onEndChat,
  onStartNewChat = async () => {},
  allowEndChat = true,
  isEndingChat = false,
  isStartingNewChat = false,
  isSending = false,
  isInitialLoading = false,
  isLoadingOlder = false,
  hasMoreOlder = false,
}) {
  const threadRef = useRef(null)
  const bodyRef = useRef(null)
  const composerRef = useRef(null)
  const loadingOlderLockRef = useRef(false)
  const previousMessageCountRef = useRef(0)
  const nearBottomRef = useRef(true)
  const [isFloatingComposer, setIsFloatingComposer] = useState(false)
  const [composerHeight, setComposerHeight] = useState(84)
  const [floatingLeft, setFloatingLeft] = useState(0)
  const [floatingWidth, setFloatingWidth] = useState(0)
  const [voiceError, setVoiceError] = useState('')
  const isClosed = conversation?.canSend === false
  const isHelpCenterConversation =
    Boolean(conversation?.isHelpCenter) ||
    String(conversation?.id || '').trim() === HELP_CENTER_VIRTUAL_CONVERSATION_ID

  useEffect(() => {
    const container = bodyRef.current
    if (!container) return
    previousMessageCountRef.current = Array.isArray(conversation?.messages)
      ? conversation.messages.length
      : 0
    nearBottomRef.current = true
    const rafId = window.requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight
    })
    return () => window.cancelAnimationFrame(rafId)
  }, [conversation?.id])

  useEffect(() => {
    if (!bodyRef.current) return
    const nextCount = Array.isArray(conversation?.messages) ? conversation.messages.length : 0
    const previousCount = previousMessageCountRef.current
    previousMessageCountRef.current = nextCount
    if (nextCount <= previousCount) return
    if (isLoadingOlder) return
    if (!nearBottomRef.current) return
    const container = bodyRef.current
    const rafId = window.requestAnimationFrame(() => {
      if (!container) return
      container.scrollTop = container.scrollHeight
    })
    return () => window.cancelAnimationFrame(rafId)
  }, [conversation?.messages, isLoadingOlder])

  useEffect(() => {
    const recalcComposer = () => {
      if (!threadRef.current || !composerRef.current) return
      const threadRect = threadRef.current.getBoundingClientRect()
      const composerRect = composerRef.current.getBoundingClientRect()
      const nextHeight = Math.max(72, Math.ceil(composerRect.height || 0))
      setComposerHeight((previous) => (previous === nextHeight ? previous : nextHeight))

      const isDesktop = window.innerWidth >= 1024
      const shouldFloat = isDesktop && threadRect.bottom > window.innerHeight + 2
      setIsFloatingComposer((previous) => (previous === shouldFloat ? previous : shouldFloat))

      if (shouldFloat) {
        const nextLeft = Math.max(8, Math.round(threadRect.left + 12))
        const nextWidth = Math.max(300, Math.round(threadRect.width - 24))
        setFloatingLeft((previous) => (previous === nextLeft ? previous : nextLeft))
        setFloatingWidth((previous) => (previous === nextWidth ? previous : nextWidth))
      }
    }

    recalcComposer()
    window.addEventListener('resize', recalcComposer)
    window.addEventListener('scroll', recalcComposer, { passive: true })
    return () => {
      window.removeEventListener('resize', recalcComposer)
      window.removeEventListener('scroll', recalcComposer)
    }
  }, [conversation?.id, conversation?.messages, draftMessage, isClosed, isSending])

  if (!conversation) return null

  const blockedNotice = String(conversation.participantNotice || '').trim()
  const inquiryOrderLabel = String(inquiryContext?.orderNumber || inquiryContext?.orderId || '').trim()
  const inquiryReference = String(inquiryContext?.trackId || '').trim()
  const inquiryStatus = String(inquiryContext?.orderStatus || '').trim()
  const inquiryReason = String(inquiryContext?.reportReasonLabel || '').trim()
  const threadItems = useMemo(
    () => buildThreadItemsWithDateSeparators(conversation.messages),
    [conversation.messages],
  )
  const hasInquiryContext = Boolean(inquiryOrderLabel || inquiryReference || inquiryStatus || inquiryReason)
  const composerStyle = useMemo(() => {
    if (!isFloatingComposer) return undefined
    return {
      position: 'fixed',
      left: `${floatingLeft}px`,
      width: `${floatingWidth}px`,
      bottom: '10px',
      zIndex: 50,
    }
  }, [floatingLeft, floatingWidth, isFloatingComposer])

  const handleBodyScroll = async () => {
    const container = bodyRef.current
    if (!container) return
    nearBottomRef.current =
      container.scrollHeight - container.scrollTop - container.clientHeight <= 140
    if (!hasMoreOlder || isInitialLoading || isLoadingOlder || loadingOlderLockRef.current) return
    if (container.scrollTop > 56) return
    loadingOlderLockRef.current = true
    const previousHeight = container.scrollHeight
    const previousTop = container.scrollTop
    try {
      await onLoadOlderMessages()
      window.requestAnimationFrame(() => {
        if (!bodyRef.current) return
        const nextHeight = bodyRef.current.scrollHeight
        bodyRef.current.scrollTop = Math.max(0, previousTop + (nextHeight - previousHeight))
      })
    } finally {
      loadingOlderLockRef.current = false
    }
  }

  const {
    isSupported: canRecordVoice,
    isRecording,
    isProcessingStop,
    durationSeconds: recordingDurationSeconds,
    toggleRecording,
  } = useVoiceRecorder({
    maxDurationSeconds: 90,
    onError: (message) => {
      setVoiceError(String(message || 'Unable to start voice recording.'))
    },
    onRecorded: ({ blob, durationSeconds, mimeType }) => {
      setVoiceError('')
      Promise.resolve(onSendVoiceMessage({ blob, durationSeconds, mimeType })).catch(() => {
        setVoiceError('Unable to send voice message.')
      })
    },
  })

  return (
    <section ref={threadRef} className='relative flex h-full min-h-0 flex-col bg-white'>
      <header className='flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3'>
        <div className='flex items-center gap-3'>
          <button
            type='button'
            onClick={onBack}
            className='inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 lg:hidden'
            aria-label='Back to chats'
          >
            <svg viewBox='0 0 24 24' className='h-5 w-5' fill='none' stroke='currentColor' strokeWidth='1.8'>
              <path d='m15 6-6 6 6 6' strokeLinecap='round' strokeLinejoin='round' />
            </svg>
          </button>
          <span className='inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700'>
            {getInitials(conversation.sellerName)}
          </span>
          <span>
            <p className='text-sm font-semibold text-slate-900'>{conversation.sellerName}</p>
            <p className='text-xs text-slate-400'>
              {String(conversation.sellerStatusLabel || '').trim() || 'Usually responds in a few hours'}
            </p>
          </span>
        </div>
        {allowEndChat ? (
          <button
            type='button'
            onClick={onEndChat}
            disabled={isEndingChat || isClosed}
            className='inline-flex items-center rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60'
          >
            {isEndingChat ? 'Ending...' : 'End chat'}
          </button>
        ) : null}
      </header>

      {isClosed ? (
        <div className='border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-800'>
          {blockedNotice || 'This chat is closed.'}
        </div>
      ) : null}

      <div
        ref={bodyRef}
        onScroll={() => {
          void handleBodyScroll()
        }}
        className='min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50 px-4 pt-4'
        style={{
          paddingBottom: `${composerHeight + (isFloatingComposer ? 34 : 24)}px`,
        }}
      >
        {isLoadingOlder ? (
          <div className='mb-3 flex justify-center'>
            <span className='inline-flex h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700' />
          </div>
        ) : null}
        {isInitialLoading ? (
          <div className='flex min-h-[220px] items-center justify-center'>
            <span className='inline-flex h-8 w-8 animate-spin rounded-full border-[3px] border-slate-300 border-t-slate-700' />
          </div>
        ) : null}
        <div className={`space-y-2.5 ${isInitialLoading ? 'hidden' : 'block'}`}>
          {threadItems.map((entry) => {
            if (entry.type === 'day') {
              return (
                <div key={entry.id} className='mb-3 flex justify-center'>
                  <span className='rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-500'>
                    {entry.label}
                  </span>
                </div>
              )
            }

            const message = entry.message
            const isCustomer = message.sender === 'customer'
            const sellerAvatar = getInitials(conversation.sellerName)
            const inquiryMessage = parseOrderInquiryMessage(message.text)
            const voiceMessage = parseVoiceMessageBody(message.text)

            return (
              <div
                key={message.id}
                className={`flex items-end gap-2 ${isCustomer ? 'justify-end' : 'justify-start'}`}
              >
                {!isCustomer ? (
                  <span className='inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-300 text-[11px] font-semibold text-slate-700'>
                    {sellerAvatar}
                  </span>
                ) : null}

                <div className='min-w-0 max-w-[78%]'>
                  <div
                    className={`rounded-[18px] px-3.5 py-2.5 text-[15px] leading-relaxed ${
                      isCustomer
                        ? 'rounded-br-[6px] bg-[linear-gradient(135deg,#5f7cf7_0%,#7f63f4_100%)] text-white shadow-[0_8px_18px_rgba(99,102,241,0.34)]'
                        : 'rounded-bl-[6px] border border-white/90 bg-white text-slate-900 shadow-[0_8px_16px_rgba(15,23,42,0.08)]'
                    }`}
                  >
                    {inquiryMessage ? (
                      <div className='space-y-2.5'>
                        <div
                          className={`overflow-hidden rounded-lg border ${
                            isCustomer
                              ? 'border-white/35 bg-white/10'
                              : 'border-emerald-200 bg-emerald-50/80 text-slate-900'
                          }`}
                        >
                          <div className={`border-b px-2.5 py-2 ${isCustomer ? 'border-white/20' : 'border-emerald-200/80'}`}>
                            <p
                              className={`text-[11px] font-semibold uppercase tracking-wide ${
                                isCustomer ? 'text-white/90' : 'text-emerald-700'
                              }`}
                            >
                              Order inquiry
                            </p>
                          </div>
                          <div className='space-y-1 px-2.5 py-2'>
                            {inquiryMessage.order ? (
                              <p className={`text-xs ${isCustomer ? 'text-white' : 'text-slate-700'}`}>
                                Order: {inquiryMessage.order}
                              </p>
                            ) : null}
                            {inquiryMessage.reference ? (
                              <p className={`text-xs ${isCustomer ? 'text-white/90' : 'text-slate-600'}`}>
                                Ref: {inquiryMessage.reference}
                              </p>
                            ) : null}
                            {inquiryMessage.status ? (
                              <p className={`text-xs ${isCustomer ? 'text-white/90' : 'text-slate-600'}`}>
                                Status: {inquiryMessage.status}
                              </p>
                            ) : null}
                            {inquiryMessage.reason ? (
                              <p className={`text-xs ${isCustomer ? 'text-white/90' : 'text-slate-600'}`}>
                                Reason: {inquiryMessage.reason}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        {inquiryMessage.question ? (
                          <div
                            className={`rounded-md border px-2.5 py-2 ${
                              isCustomer ? 'border-white/25 bg-white/10 text-white' : 'border-slate-200 bg-slate-50 text-slate-800'
                            }`}
                          >
                            <p className='whitespace-pre-wrap break-words text-[13px] leading-relaxed'>
                              {inquiryMessage.question}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    ) : voiceMessage ? (
                      <div className='space-y-2'>
                        <div
                          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold ${
                            isCustomer ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <MicIcon className='h-3.5 w-3.5' />
                          <span>Voice message</span>
                          <span>{formatVoiceDurationLabel(voiceMessage.durationSeconds)}</span>
                        </div>
                        <audio
                          controls
                          preload='metadata'
                          src={voiceMessage.url}
                          className='h-10 w-full min-w-[12rem] max-w-[18rem]'
                        />
                      </div>
                    ) : (
                      <p className='whitespace-pre-wrap break-words'>{message.text}</p>
                    )}
                  </div>
                  <div
                    className={`mt-1 flex items-center gap-1 px-1 text-[11px] ${
                      isCustomer ? 'justify-end text-indigo-300' : 'justify-start text-slate-500'
                    }`}
                  >
                    <span>{message.timeLabel}</span>
                    {isCustomer ? <MessageStatusIcon status={String(message.status || 'sent')} /> : null}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <footer
        ref={composerRef}
        className='pointer-events-none absolute inset-x-0 bottom-0 z-20 px-3 pb-[calc(env(safe-area-inset-bottom)+0.6rem)] pt-2'
        style={composerStyle}
      >
        {hasInquiryContext ? (
          <div className='pointer-events-auto mb-2 overflow-hidden rounded-xl border border-emerald-200 bg-white/95 shadow-[0_-8px_20px_rgba(15,23,42,0.08)] backdrop-blur'>
            <div className='flex items-start justify-between gap-3 px-3 py-2'>
              <div className='min-w-0 border-l-2 border-emerald-500 pl-2'>
                <p className='text-xs font-semibold text-emerald-700'>Order inquiry</p>
                <p className='truncate text-xs text-slate-700'>
                  {inquiryOrderLabel ? `Order ${inquiryOrderLabel}` : 'Order support request'}
                </p>
                {inquiryReference ? <p className='truncate text-[11px] text-slate-500'>Ref: {inquiryReference}</p> : null}
                {inquiryStatus ? <p className='truncate text-[11px] text-slate-500'>Status: {inquiryStatus}</p> : null}
                {inquiryReason ? <p className='truncate text-[11px] text-slate-500'>Reason: {inquiryReason}</p> : null}
              </div>
              <button
                type='button'
                onClick={onClearInquiryContext}
                className='inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700'
                aria-label='Remove inquiry context'
              >
                <svg viewBox='0 0 20 20' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='2'>
                  <path d='M5 5l10 10M15 5 5 15' strokeLinecap='round' />
                </svg>
              </button>
            </div>
          </div>
        ) : null}
        {voiceError ? (
          <p className='pointer-events-auto px-2 text-xs font-medium text-rose-600'>
            {voiceError}
          </p>
        ) : null}
        <div className='pointer-events-auto space-y-2'>
          {isClosed && isHelpCenterConversation ? (
            <div className='pointer-events-auto mb-2 flex justify-center'>
              <button
                type='button'
                onClick={() => {
                  void onStartNewChat()
                }}
                disabled={isStartingNewChat}
                className='inline-flex h-9 min-w-[9rem] items-center justify-center rounded-full bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
              >
                {isStartingNewChat ? 'Starting...' : 'New chat'}
              </button>
            </div>
          ) : null}
          <div className='pointer-events-auto relative flex items-center gap-2 overflow-hidden rounded-[26px] border border-white/70 bg-white/55 px-2.5 py-2 shadow-[0_10px_26px_rgba(15,23,42,0.12)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/45'>
            <button
              type='button'
              onClick={toggleRecording}
              disabled={isClosed || isSending || isProcessingStop || !canRecordVoice}
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
              <span className='inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700'>
                <span className={`h-1.5 w-1.5 rounded-full bg-rose-500 ${isProcessingStop ? 'animate-spin' : 'animate-pulse'}`} />
                {isProcessingStop ? 'Sending...' : formatVoiceDurationLabel(recordingDurationSeconds)}
              </span>
            ) : null}
            <div className='relative min-w-0 flex-1'>
              <input
                type='text'
                value={draftMessage}
                onChange={(event) => onDraftMessageChange(event.target.value)}
                onKeyDown={(event) => {
                  if (isClosed || isRecording || isProcessingStop) return
                  if (event.key !== 'Enter') return
                  event.preventDefault()
                  onSendMessage()
                }}
                placeholder={
                  isProcessingStop
                    ? 'Sending voice message...'
                    : isRecording
                    ? 'Recording voice... tap mic to stop'
                    : isClosed
                      ? 'Chat is closed'
                      : 'Type a message'
                }
                disabled={isClosed || isSending || isRecording || isProcessingStop}
                className='h-10 w-full bg-transparent pl-1 pr-12 text-[15px] text-slate-700 placeholder:text-slate-500 focus:outline-none'
              />
              <button
                type='button'
                onClick={onSendMessage}
                disabled={isClosed || isSending || isRecording || isProcessingStop || !draftMessage.trim()}
                className='absolute right-1 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-[#0b1734] text-white transition hover:bg-[#0a142d] disabled:cursor-not-allowed disabled:bg-slate-300'
                aria-label='Send message'
              >
                <SendMessageIcon />
              </button>
            </div>
          </div>
        </div>
      </footer>
    </section>
  )
}
