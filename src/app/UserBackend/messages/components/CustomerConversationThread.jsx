'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

const getInitials = (name) =>
  String(name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'S'

export default function CustomerConversationThread({
  conversation,
  draftMessage,
  onDraftMessageChange,
  onSendMessage,
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
                  <p className='whitespace-pre-wrap break-words'>{message.text}</p>
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
