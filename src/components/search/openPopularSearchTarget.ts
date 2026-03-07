'use client'

export function openPopularSearchTarget(targetUrl: string) {
  const normalizedTargetUrl = String(targetUrl || '').trim()
  if (!normalizedTargetUrl || typeof window === 'undefined') return

  window.open(normalizedTargetUrl, '_blank', 'noopener,noreferrer')
}
