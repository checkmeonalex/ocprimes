'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

const getInitials = (name) =>
  String(name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'S'

const parseOrderInquiryMessage = (value) => {
  const raw = String(value || '')
  if (!raw.startsWith('[Order Inquiry]')) return null
  const lines = raw.split('\n')
  const order = String(lines.find((line) => line.startsWith('Order: ')) || '')
    .replace('Order: ', '')
    .trim()
  const reference = String(lines.find((line) => line.startsWith('Reference: ')) || '')
    .replace('Reference: ', '')
    .trim()
  const status = String(lines.find((line) => line.startsWith('Status: ')) || '')
    .replace('Status: ', '')
    .trim()
  const questionLineIndex = lines.findIndex((line) => line.startsWith('Question: '))
  const question =
    questionLineIndex >= 0
      ? [String(lines[questionLineIndex] || '').replace('Question: ', ''), ...lines.slice(questionLineIndex + 1)]
          .join('\n')
          .trim()
      : ''

  return {
    order,
    reference,
    status,
    question,
  }
}

export default function CustomerConversationThread({
  conversation,
  draftMessage,
  onDraftMessageChange,
  onSendMessage,
  inquiryContext = null,
  onClearInquiryContext = () => {},
  onBack,
  onEndChat,
  allowEndChat = true,
  isEndingChat = false,
  isSending = false,
}) {
  const threadRef = useRef(null)
  const bodyRef = useRef(null)
  const composerRef = useRef(null)
  const [isFloatingComposer, setIsFloatingComposer] = useState(false)
  const [composerHeight, setComposerHeight] = useState(84)
  const [floatingLeft, setFloatingLeft] = useState(0)
  const [floatingWidth, setFloatingWidth] = useState(0)
  const isClosed = conversation?.canSend === false

  useEffect(() => {
    const container = bodyRef.current
    if (!container) return
    const rafId = window.requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight
    })
    return () => window.cancelAnimationFrame(rafId)
  }, [conversation?.id, conversation?.messages])

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
  const hasInquiryContext = Boolean(inquiryOrderLabel || inquiryReference || inquiryStatus)
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
        className='min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50 px-4 pt-4'
        style={{
          paddingBottom: `${composerHeight + (isFloatingComposer ? 34 : 24)}px`,
        }}
      >
        <div className='mb-3 flex justify-center'>
          <span className='rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-500'>
            Today
          </span>
        </div>
        <div className='space-y-2.5'>
          {conversation.messages.map((message) => {
            const isCustomer = message.sender === 'customer'
            const senderLabel = isCustomer ? 'You' : conversation.sellerName
            const inquiryMessage = parseOrderInquiryMessage(message.text)

            return (
              <div
                key={message.id}
                className={`flex items-end gap-2 ${isCustomer ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 text-sm leading-relaxed shadow-sm ${
                    isCustomer
                      ? 'rounded-br-sm bg-[#2563eb] text-white'
                      : 'rounded-bl-sm border border-slate-200 bg-white text-slate-900'
                  }`}
                >
                  <p
                    className={`mb-1 text-[10px] font-semibold uppercase tracking-wide ${
                      isCustomer ? 'text-blue-100/90' : 'text-slate-500'
                    }`}
                  >
                    {senderLabel}
                  </p>
                  {inquiryMessage ? (
                    <div className='space-y-2'>
                      <div
                        className={`rounded-md border p-2 ${
                          isCustomer
                            ? 'border-emerald-300 bg-emerald-700/25'
                            : 'border-emerald-200 bg-emerald-50 text-slate-900'
                        }`}
                      >
                        <p className={`text-[11px] font-semibold ${isCustomer ? 'text-emerald-100' : 'text-emerald-700'}`}>
                          Order inquiry
                        </p>
                        {inquiryMessage.order ? (
                          <p className={`mt-0.5 text-xs ${isCustomer ? 'text-emerald-50' : 'text-slate-700'}`}>
                            Order: {inquiryMessage.order}
                          </p>
                        ) : null}
                        {inquiryMessage.reference ? (
                          <p className={`text-xs ${isCustomer ? 'text-emerald-50' : 'text-slate-600'}`}>
                            Ref: {inquiryMessage.reference}
                          </p>
                        ) : null}
                        {inquiryMessage.status ? (
                          <p className={`text-xs ${isCustomer ? 'text-emerald-50' : 'text-slate-600'}`}>
                            Status: {inquiryMessage.status}
                          </p>
                        ) : null}
                      </div>
                      {inquiryMessage.question ? (
                        <p className='whitespace-pre-wrap break-words'>{inquiryMessage.question}</p>
                      ) : null}
                    </div>
                  ) : (
                    <p className='whitespace-pre-wrap break-words'>{message.text}</p>
                  )}
                  <p
                    className={`mt-1 text-right text-[10px] ${
                      isCustomer ? 'text-blue-100/80' : 'text-slate-400'
                    }`}
                  >
                    {message.timeLabel}
                  </p>
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
        <div className='pointer-events-auto flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-2 shadow-[0_-8px_20px_rgba(15,23,42,0.08)] backdrop-blur'>
          <input
            type='text'
            value={draftMessage}
            onChange={(event) => onDraftMessageChange(event.target.value)}
            onKeyDown={(event) => {
              if (isClosed) return
              if (event.key !== 'Enter') return
              event.preventDefault()
              onSendMessage()
            }}
            placeholder={isClosed ? 'Chat is closed' : 'Type a message'}
            disabled={isClosed || isSending}
            className='w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none'
          />
          <button
            type='button'
            onClick={onSendMessage}
            disabled={isClosed || isSending || !draftMessage.trim()}
            className='inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
            aria-label='Send message'
          >
            <svg viewBox='0 0 24 24' className='h-4 w-4' fill='currentColor' aria-hidden='true'>
              <path d='M20.62 3.38a1 1 0 0 0-1.02-.24L3.74 8.43a1 1 0 0 0 .04 1.91l6.55 2.02 2.02 6.55a1 1 0 0 0 1.91.04l5.29-15.86a1 1 0 0 0-.24-1.02z' />
            </svg>
          </button>
        </div>
      </footer>
    </section>
  )
}
