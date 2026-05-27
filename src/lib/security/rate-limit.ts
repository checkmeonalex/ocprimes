import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

type RateLimitOptions = {
  key: string
  max: number
  windowMs: number
  message?: string
}

type Bucket = {
  count: number
  resetAt: number
}

const globalStore = globalThis as typeof globalThis & {
  __ocpRateLimitStore__?: Map<string, Bucket>
}

const store = globalStore.__ocpRateLimitStore__ || new Map<string, Bucket>()
globalStore.__ocpRateLimitStore__ = store

const getClientIp = (request: NextRequest) => {
  const forwardedFor = String(request.headers.get('x-forwarded-for') || '').trim()
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown'
  }
  return (
    String(request.headers.get('x-real-ip') || '').trim() ||
    String(request.headers.get('cf-connecting-ip') || '').trim() ||
    'unknown'
  )
}

const maybeCleanup = (now: number) => {
  if (store.size < 500) return
  for (const [key, bucket] of store.entries()) {
    if (bucket.resetAt <= now) {
      store.delete(key)
    }
  }
}

export const enforceRateLimit = (
  request: NextRequest,
  { key, max, windowMs, message = 'Too many requests. Please try again shortly.' }: RateLimitOptions,
) => {
  const ip = getClientIp(request)
  const now = Date.now()
  maybeCleanup(now)
  const bucketKey = `${key}:${ip}`
  const current = store.get(bucketKey)

  if (!current || current.resetAt <= now) {
    store.set(bucketKey, { count: 1, resetAt: now + windowMs })
    return null
  }

  if (current.count >= max) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000))
    return NextResponse.json(
      { error: message },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSeconds),
        },
      },
    )
  }

  current.count += 1
  store.set(bucketKey, current)
  return null
}
