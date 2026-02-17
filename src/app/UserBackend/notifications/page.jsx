'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import emptyNotificationImage from './no-notificvstion.png'

const formatDateOnly = (value) => {
  const date = new Date(value || '')
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

const isNewNotification = (value) => {
  const date = new Date(value || '')
  const time = date.getTime()
  if (Number.isNaN(time)) return false
  return Date.now() - time <= 24 * 60 * 60 * 1000
}

const stringToHue = (value) => {
  const text = String(value || '')
  let hash = 0
  for (let index = 0; index < text.length; index += 1) {
    hash = text.charCodeAt(index) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % 360
}

const buildFallbackAvatar = (title, message) => {
  const seed = `${title || ''} ${message || ''}`.trim() || 'N'
  const hue = stringToHue(seed)
  const initials = seed
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
  return {
    initials: initials || 'N',
    style: {
      background: `linear-gradient(135deg, hsl(${hue},75%,48%), hsl(${(hue + 36) % 360},78%,42%))`,
    },
  }
}

function NotificationItem({ item }) {
  const actionUrl = String(item?.metadata?.action_url || '').trim()
  const avatarUrl = String(item?.metadata?.avatar_url || '').trim()
  const title = String(item?.title || 'Notification')
  const message = String(item?.message || '')
  const fallbackAvatar = buildFallbackAvatar(title, message)

  const body = (
    <div className='group flex items-start gap-3 rounded-xl px-1 py-2 transition hover:bg-slate-50'>
      <div className='mt-0.5 h-11 w-11 shrink-0 overflow-hidden rounded-full'>
        {avatarUrl ? (
          <img src={avatarUrl} alt={title} className='h-full w-full object-cover' />
        ) : (
          <div
            className='flex h-full w-full items-center justify-center text-sm font-semibold text-white'
            style={fallbackAvatar.style}
          >
            {fallbackAvatar.initials}
          </div>
        )}
      </div>

      <div className='min-w-0 flex-1'>
        <p className='text-[15px] font-semibold leading-5 text-slate-900'>{title}</p>
        {message ? <p className='mt-0.5 text-[14px] leading-5 text-slate-600'>{message}</p> : null}
        <p className='mt-1 text-xs font-semibold text-[#5da7ff]'>{formatDateOnly(item?.created_at)}</p>
      </div>

      {!item?.is_read ? <span className='mt-3 h-2.5 w-2.5 shrink-0 rounded-full bg-[#4da3ff]' /> : null}
    </div>
  )

  if (actionUrl) {
    return (
      <Link href={actionUrl} className='block'>
        {body}
      </Link>
    )
  }

  return body
}

function NotificationsSkeleton() {
  return (
    <div className='mt-3 space-y-2.5'>
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className='rounded-xl px-1 py-2'>
          <div className='flex items-start gap-3'>
            <div className='h-11 w-11 animate-pulse rounded-full bg-slate-200/85' />
            <div className='min-w-0 flex-1 space-y-2 pt-1'>
              <div className='h-3.5 w-3/4 animate-pulse rounded-md bg-slate-200/85' />
              <div className='h-3 w-full animate-pulse rounded-md bg-slate-200/70' />
              <div className='h-3 w-1/4 animate-pulse rounded-md bg-slate-200/70' />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function NotificationsPage() {
  const [items, setItems] = useState([])
  const [summary, setSummary] = useState({ unread: 0, total: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [readStatus, setReadStatus] = useState('all')
  const [error, setError] = useState('')

  const loadNotifications = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: '1', per_page: '50', read_status: readStatus })
      const response = await fetch(`/api/user/notifications?${params.toString()}`, {
        method: 'GET',
        cache: 'no-store',
      })
      const payload = await response.json().catch(() => null)
      if (response.status === 401) {
        window.location.href = '/login?next=/UserBackend/notifications'
        return
      }
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to load notifications.')
      }
      setItems(Array.isArray(payload?.items) ? payload.items : [])
      setSummary(payload?.summary || { unread: 0, total: 0 })
    } catch (loadError) {
      setItems([])
      setSummary({ unread: 0, total: 0 })
      setError(loadError?.message || 'Unable to load notifications.')
    } finally {
      setIsLoading(false)
    }
  }, [readStatus])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  const unreadCount = Number(summary?.unread || 0)

  const markAllRead = useCallback(async () => {
    if (!unreadCount) return
    try {
      const response = await fetch('/api/user/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_all: true }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to mark notifications as read.')
      }
      await loadNotifications()
    } catch (markError) {
      setError(markError?.message || 'Unable to mark notifications as read.')
    }
  }, [loadNotifications, unreadCount])

  const grouped = useMemo(() => {
    const next = { newItems: [], earlierItems: [] }
    items.forEach((item) => {
      if (isNewNotification(item?.created_at)) next.newItems.push(item)
      else next.earlierItems.push(item)
    })
    return next
  }, [items])

  return (
    <section className='w-full overflow-visible bg-transparent p-0 text-slate-900 sm:overflow-hidden sm:rounded-2xl sm:bg-white sm:p-4'>
      <header className='flex items-center justify-between'>
        <h1 className='text-[34px] font-bold leading-none tracking-tight text-slate-900'>Notifications</h1>
        <button
          type='button'
          onClick={markAllRead}
          disabled={!unreadCount}
          className='inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 disabled:opacity-40'
          aria-label='Mark all as read'
          title='Mark all as read'
        >
          <svg viewBox='0 0 24 24' className='h-5 w-5' fill='currentColor'>
            <circle cx='5' cy='12' r='1.8' />
            <circle cx='12' cy='12' r='1.8' />
            <circle cx='19' cy='12' r='1.8' />
          </svg>
        </button>
      </header>

      <div className='mt-3 flex items-center gap-2'>
        <button
          type='button'
          onClick={() => setReadStatus('all')}
          className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
            readStatus === 'all' ? 'bg-slate-900 text-white' : 'bg-transparent text-slate-600 hover:bg-slate-100'
          }`}
        >
          All
        </button>
        <button
          type='button'
          onClick={() => setReadStatus('unread')}
          className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
            readStatus === 'unread'
              ? 'bg-slate-900 text-white'
              : 'bg-transparent text-slate-600 hover:bg-slate-100'
          }`}
        >
          Unread
        </button>
      </div>

      {error ? <p className='mt-3 text-sm text-rose-600'>{error}</p> : null}

      {isLoading ? <NotificationsSkeleton /> : null}

      {!isLoading && !items.length ? (
        <div className='py-8'>
          <div className='mx-auto flex max-w-sm flex-col items-center text-center'>
            <div className='mb-2 flex h-[150px] w-[220px] items-start justify-center overflow-hidden'>
              <Image
                src={emptyNotificationImage}
                alt='Notifications'
                width={300}
                height={300}
                className='-mt-10 h-[300px] w-[300px] object-cover'
              />
            </div>
            <p className='text-[26px] font-semibold tracking-tight text-slate-900'>You&apos;re all caught up</p>
            <p className='mt-2 text-sm text-slate-500'>We&apos;ll keep you updated on any future notifications</p>
          </div>
        </div>
      ) : null}

      {!isLoading && items.length ? (
        <div className='mt-3'>
          {grouped.newItems.length ? (
            <div>
              <h2 className='mb-1 text-2xl font-bold text-slate-900'>New</h2>
              <div className='space-y-0.5'>
                {grouped.newItems.map((item) => (
                  <NotificationItem key={item.id} item={item} />
                ))}
              </div>
            </div>
          ) : null}

          {grouped.earlierItems.length ? (
            <div className={`${grouped.newItems.length ? 'mt-3' : ''}`}>
              <h2 className='mb-1 text-2xl font-bold text-slate-900'>Earlier</h2>
              <div className='space-y-0.5'>
                {grouped.earlierItems.map((item) => (
                  <NotificationItem key={item.id} item={item} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
