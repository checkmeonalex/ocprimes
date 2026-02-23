'use client'

import { useEffect, useState } from 'react'
import MakeOfferModal from './MakeOfferModal'

type SellerChatPopupProps = {
  isOpen: boolean
  onClose: () => void
  onSend?: (message: string) => void
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
}

const QUICK_START_MESSAGES = [
  'Make an Offer',
  "What's your best offer?",
  'Is this in stock?',
  "What's your return policy?",
]

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

export default function SellerChatPopup({
  isOpen,
  onClose,
  onSend,
  vendorName,
  vendorAvatarUrl,
  hasBottomOffset = false,
  productPrice = 0,
  currencySymbol = '$',
}: SellerChatPopupProps) {
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [showOfferModal, setShowOfferModal] = useState(false)
  const [hasUserSentMessage, setHasUserSentMessage] = useState(false)
  const [showQuickStarters, setShowQuickStarters] = useState(true)
  const [shouldRender, setShouldRender] = useState(isOpen)
  const [isVisible, setIsVisible] = useState(isOpen)

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
    setMessages([
      {
        id: 'seller-1',
        sender: 'seller',
        text: `Hi, this is ${vendorName}. How can I help you with this product?`,
        time: '12:05',
      },
      {
        id: 'buyer-1',
        sender: 'buyer',
        text: 'I want to confirm the exact condition and shipping timeline.',
        time: '12:10',
      },
    ])
    setHasUserSentMessage(false)
    setShowQuickStarters(true)
  }, [isOpen, vendorName])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (showOfferModal) {
        setShowOfferModal(false)
        return
      }
      onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose, showOfferModal])

  if (!shouldRender) return null

  const popupDesktopBottomClass = hasBottomOffset ? 'sm:bottom-28' : 'sm:bottom-24'
  const offerPresets = buildThoughtfulOfferPresets(productPrice)

  const sendDisabled = draft.trim().length === 0
  const appendBuyerMessage = (message: string) => {
    const text = String(message || '').trim()
    if (!text) return
    const now = new Date()
    const time = `${String(now.getHours()).padStart(2, '0')}.${String(now.getMinutes()).padStart(2, '0')}`
    setMessages((prev) => [
      ...prev,
      {
        id: `buyer-${Date.now()}`,
        sender: 'buyer',
        text,
        time,
      },
    ])
    onSend?.(text)
    if (!hasUserSentMessage) {
      setHasUserSentMessage(true)
    }
    if (showQuickStarters) {
      setShowQuickStarters(false)
    }
  }

  const handleSend = () => {
    const message = draft.trim()
    if (!message) return
    appendBuyerMessage(message)
    setDraft('')
  }

  const handleQuickStartClick = (message: string) => {
    if (message === 'Make an Offer') {
      setShowOfferModal(true)
      return
    }
    setDraft(message)
  }

  return (
    <>
      <div
        className={`fixed inset-x-0 bottom-0 z-[60] w-full transition-[opacity,transform] duration-300 ease-out sm:inset-x-auto sm:right-4 sm:w-[22rem] ${popupDesktopBottomClass} ${
          isVisible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
        }`}
      >
        <div className='overflow-hidden rounded-t-2xl rounded-b-none border border-gray-200 bg-[#f3f4f6] shadow-[0_12px_32px_rgba(15,23,42,0.18)] sm:rounded-2xl'>
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
            <div className='flex min-w-0 items-center gap-2'>
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
              <div className='min-w-0'>
                <div className='truncate text-sm font-semibold text-gray-900'>{vendorName}</div>
                <div className='text-[11px] text-gray-500'>
                  Seller <span className='px-1'>•</span>
                  <span className='font-medium text-green-600'>Online</span>
                </div>
              </div>
            </div>
            <button
              type='button'
              aria-label='Conversation info'
              className='inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-100/80 text-slate-500 transition hover:bg-white hover:text-slate-700'
            >
              <svg viewBox='0 0 20 20' className='h-3.5 w-3.5' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                <circle cx='10' cy='10' r='7' />
                <path d='M10 8.2v5' strokeLinecap='round' />
                <circle cx='10' cy='5.7' r='0.8' fill='currentColor' stroke='none' />
              </svg>
            </button>
          </div>
        </div>

        <div className='seller-chat-scrollbar max-h-[55vh] overflow-y-auto px-3 pb-3 pt-2 sm:max-h-[19rem]'>
          <div className='mb-2 flex justify-center'>
            <span className='rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-gray-500 shadow-sm'>
              Today
            </span>
          </div>

          <div className='space-y-2.5'>
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
                      className={`mt-1 text-[10px] text-gray-500 ${
                        isBuyer ? 'text-right' : 'text-left'
                      }`}
                    >
                      {message.time}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

          <div className='border-t border-gray-200 bg-transparent p-2.5'>
            <div
              className={`overflow-hidden transition-all duration-300 ease-out ${
                showQuickStarters
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
                placeholder={`Message ${vendorName}...`}
                className='min-w-0 flex-1 appearance-none border-0 bg-white text-sm text-gray-800 shadow-none outline-none ring-0 placeholder:text-gray-500 focus:border-0 focus:outline-none focus:ring-0'
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
        `}</style>
      </div>
      <MakeOfferModal
        isOpen={showOfferModal}
        onClose={() => setShowOfferModal(false)}
        productPrice={productPrice}
        presetAmounts={offerPresets}
        currencySymbol={currencySymbol}
        onSubmit={(amount) => {
          appendBuyerMessage(
            `I'd like to offer ${currencySymbol}${amount.toLocaleString('en-US')}.`,
          )
          setShowOfferModal(false)
        }}
      />
    </>
  )
}
