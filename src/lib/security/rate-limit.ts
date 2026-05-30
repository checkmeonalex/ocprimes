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
  // Prefer headers set by trusted infrastructure over client-controlled ones.
  // cf-connecting-ip: Cloudflare strips and re-sets this — always the real client IP.
  // x-real-ip: set by nginx/Vercel reverse proxy.
  // x-forwarded-for: we take the LAST (rightmost) entry, which is added by the nearest
  // trusted proxy; the first entry is attacker-controlled and must not be trusted.
  const cfIp = String(request.headers.get('cf-connecting-ip') || '').trim()
  if (cfIp) return cfIp

  const realIp = String(request.headers.get('x-real-ip') || '').trim()
  if (realIp) return realIp

  const forwardedFor = String(request.headers.get('x-forwarded-for') || '').trim()
  if (forwardedFor) {
    const parts = forwardedFor.split(',')
    return parts[parts.length - 1]?.trim() || 'unknown'
  }

  return 'unknown'
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
