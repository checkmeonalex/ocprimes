'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const timeAgo = (value) => {
  const time = new Date(value || '').getTime()
  if (Number.isNaN(time)) return ''
  const seconds = Math.max(0, Math.floor((Date.now() - time) / 1000))
  if (seconds < 60) return 'now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return new Date(time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const kindOf = (item) => {
  const type = String(item?.type || '').toLowerCase()
  const actionUrl = String(item?.metadata?.action_url || '').toLowerCase()
  if (type.includes('order') || item?.metadata?.order_id || actionUrl.includes('/orders')) return 'order'
  if (type.includes('chat') || type.includes('message') || item?.metadata?.conversation_id) return 'message'
  if (type.includes('review') || item?.metadata?.review_id) return 'review'
  return 'general'
}

const KIND_STYLES = {
  order: 'bg-slate-900 text-white',
  message: 'bg-indigo-500 text-white',
  review: 'bg-amber-500 text-white',
  general: 'bg-slate-100 text-slate-600',
}

const KindIcon = ({ kind }) => {
  if (kind === 'order') {
    return (
      <svg className='h-4 w-4' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
        <rect x='4' y='5' width='16' height='14' rx='2' />
        <path strokeLinecap='round' d='M8 9h8M8 13h5' />
      </svg>
    )
  }
  if (kind === 'message') {
    return (
      <svg className='h-4 w-4' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
        <path strokeLinecap='round' strokeLinejoin='round' d='M4 6.5h16v10H9l-5 3v-13z' />
      </svg>
    )
  }
  if (kind === 'review') {
    return (
      <svg className='h-4 w-4' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
        <path strokeLinejoin='round' d='M12 3.5 14.7 9l6 .5-4.6 3.9 1.5 5.8L12 16l-5.6 3.2 1.5-5.8-4.6-3.9 6-.5L12 3.5z' />
      </svg>
    )
  }
  return (
    <svg className='h-4 w-4' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
      <path strokeLinecap='round' strokeLinejoin='round' d='M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9' />
    </svg>
  )
}

export default function NotificationsRail({ limit = 8 }) {
  const [items, setItems] = useState(null)
  const [unread, setUnread] = useState(0)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/user/notifications?page=1&per_page=${limit}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('failed'))))
      .then((data) => {
        setItems(Array.isArray(data?.items) ? data.items : [])
        setUnread(Number(data?.summary?.unread || 0))
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') setFailed(true)
      })
    return () => controller.abort()
  }, [limit])

  return (
    <div className='no-scrollbar flex flex-col overflow-y-auto overscroll-contain rounded-3xl border border-slate-100 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] lg:max-h-[calc(100vh-9rem)]'>
      <div className='flex items-center justify-between px-1'>
        <h2 className='flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-slate-500'>
          Notifications
          {unread > 0 ? (
            <span className='inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white'>
              {unread > 99 ? '99+' : unread}
            </span>
          ) : null}
        </h2>
        <Link
          href='/account/notifications'
          className='text-xs font-semibold text-indigo-600 transition hover:text-indigo-800'
        >
          View all
        </Link>
      </div>

      <div className='mt-3 space-y-0.5'>
        {items === null && !failed ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className='flex items-start gap-3 px-1 py-2.5'>
              <span className='h-9 w-9 shrink-0 animate-pulse rounded-full bg-slate-100' />
              <span className='flex-1 space-y-1.5 pt-1'>
                <span className='block h-3 w-3/4 animate-pulse rounded bg-slate-100' />
                <span className='block h-3 w-1/2 animate-pulse rounded bg-slate-100' />
              </span>
            </div>
          ))
        ) : failed ? (
          <p className='px-1 py-6 text-center text-xs text-slate-400'>
            Couldn&apos;t load notifications right now.
          </p>
        ) : items.length === 0 ? (
          <div className='flex flex-col items-center gap-2 px-1 py-8 text-center'>
            <span className='inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-300'>
              <svg className='h-6 w-6' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.6' aria-hidden='true'>
                <path strokeLinecap='round' strokeLinejoin='round' d='M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9' />
              </svg>
            </span>
            <p className='text-xs font-medium text-slate-400'>You&apos;re all caught up</p>
          </div>
        ) : (
          items.map((item) => {
            const kind = kindOf(item)
            const actionUrl = String(item?.metadata?.action_url || '').trim()
            const content = (
              <span className='flex items-start gap-3'>
                <span
                  className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${KIND_STYLES[kind]}`}
                >
                  <KindIcon kind={kind} />
                </span>
                <span className='min-w-0 flex-1'>
                  <span className='flex items-baseline justify-between gap-2'>
                    <span
                      className={`truncate text-[13px] ${item?.is_read ? 'font-medium text-slate-600' : 'font-bold text-slate-900'}`}
                    >
                      {String(item?.title || 'Notification')}
                    </span>
                    <span className='shrink-0 text-[10px] font-semibold uppercase text-slate-400'>
                      {timeAgo(item?.created_at)}
                    </span>
                  </span>
                  <span className='mt-0.5 line-clamp-2 block text-xs leading-snug text-slate-500'>
                    {String(item?.message || '')}
                  </span>
                </span>
                {!item?.is_read ? (
                  <span className='mt-2 h-2 w-2 shrink-0 rounded-full bg-indigo-500' aria-label='Unread' />
                ) : null}
              </span>
            )
            const itemClass = 'block rounded-2xl px-2 py-2.5 transition hover:bg-slate-50'
            return actionUrl ? (
              <Link key={item.id} href={actionUrl} className={itemClass}>
                {content}
              </Link>
            ) : (
              <div key={item.id} className={itemClass}>
                {content}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
