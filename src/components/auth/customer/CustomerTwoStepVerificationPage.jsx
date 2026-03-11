'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { resolvePostAuthRedirect, resolveSafeNextPath } from '@/lib/auth/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'
import CustomerAuthHeader from './CustomerAuthHeader'

const primaryButtonClassName =
  'w-full rounded-sm bg-black px-4 py-3 text-base font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-70'
const EMAIL_LINK_COOLDOWN_MS = 45_000
const EMAIL_LINK_SENT_AT_KEY = 'oc_email_2sv_last_sent_at'

function LoadingDot() {
  return (
    <span className='inline-flex items-center justify-center gap-1' aria-hidden='true'>
      <span className='h-2 w-2 rounded-full bg-current animate-bounce [animation-delay:-0.2s]' />
      <span className='h-2 w-2 rounded-full bg-current animate-bounce [animation-delay:-0.1s]' />
      <span className='h-2 w-2 rounded-full bg-current animate-bounce' />
    </span>
  )
}

export default function CustomerTwoStepVerificationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [role, setRole] = useState(searchParams.get('role') || '')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [isCompleting, setIsCompleting] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const safeNextPath = resolveSafeNextPath(searchParams.get('next'))

  const handleSendLink = async () => {
    if (isSending) return

    setIsSending(true)
    setError('')

    try {
      const response = await fetch('/api/auth/email-2sv/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          next: safeNextPath || '',
        }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        const message = String(payload?.error || '').toLowerCase()
        if (message.includes('rate limit')) {
          setNotice('A verification link was sent recently. Check your inbox and try again shortly.')
          return
        }
        setError(payload?.error || 'Unable to send verification link.')
        return
      }

      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(EMAIL_LINK_SENT_AT_KEY, String(Date.now()))
      }
      setNotice(payload?.message || 'A verification link has been sent to your email.')
    } catch {
      setError('Unable to send verification link.')
    } finally {
      setIsSending(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    const handleMagicLink = async () => {
      if (!isMounted) return

      const supabase = createBrowserSupabaseClient()
      const url = new URL(window.location.href)
      const code = url.searchParams.get('code')
      const tokenHash = url.searchParams.get('token_hash')
      const type = url.searchParams.get('type')

      if (code || tokenHash) {
        setIsCompleting(true)
        setError('')

        try {
          if (code) {
            await supabase.auth.exchangeCodeForSession(code)
          } else if (tokenHash) {
            await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: type || 'magiclink',
            })
          }

          const completeResponse = await fetch('/api/auth/email-2sv/complete', {
            method: 'POST',
          })
          const completePayload = await completeResponse.json().catch(() => null)

          if (!completeResponse.ok) {
            throw new Error(completePayload?.error || 'Unable to verify sign in.')
          }

          const cleanedUrl = new URL(window.location.href)
          cleanedUrl.searchParams.delete('code')
          cleanedUrl.searchParams.delete('token_hash')
          cleanedUrl.searchParams.delete('type')
          cleanedUrl.searchParams.delete('redirect_to')
          window.history.replaceState({}, '', `${cleanedUrl.pathname}${cleanedUrl.search}${cleanedUrl.hash}`)

          router.push(
            resolvePostAuthRedirect(
              completePayload?.role || role || 'customer',
              safeNextPath,
            ),
          )
          router.refresh()
          return
        } catch (completionError) {
          if (isMounted) {
            setError(completionError?.message || 'Unable to verify sign in.')
          }
        } finally {
          if (isMounted) {
            setIsCompleting(false)
          }
        }
      }

      if (!isMounted) return

      const lastSentAt =
        typeof window !== 'undefined'
          ? Number(window.sessionStorage.getItem(EMAIL_LINK_SENT_AT_KEY) || '0')
          : 0
      const isCoolingDown = lastSentAt > 0 && Date.now() - lastSentAt < EMAIL_LINK_COOLDOWN_MS

      if (isCoolingDown) {
        setNotice('A verification link was sent recently. Check your inbox before requesting another.')
        return
      }

      setIsSending(true)
      setError('')

      try {
        const response = await fetch('/api/auth/email-2sv/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role,
            next: safeNextPath || '',
          }),
        })
        const payload = await response.json().catch(() => null)

        if (!isMounted) return

        if (!response.ok) {
          const message = String(payload?.error || '').toLowerCase()
          if (message.includes('rate limit')) {
            setNotice('A verification link was sent recently. Check your inbox and try again shortly.')
            return
          }
          setError(payload?.error || 'Unable to send verification link.')
          return
        }

        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem(EMAIL_LINK_SENT_AT_KEY, String(Date.now()))
        }
        setNotice(payload?.message || 'A verification link has been sent to your email.')
      } catch {
        if (isMounted) {
          setError('Unable to send verification link.')
        }
      } finally {
        if (isMounted) {
          setIsSending(false)
        }
      }
    }

    void handleMagicLink()

    return () => {
      isMounted = false
    }
  }, [role, safeNextPath])

  useEffect(() => {
    if (role) return

    let mounted = true
    const loadRole = async () => {
      try {
        const response = await fetch('/api/auth/role', { method: 'GET' })
        const payload = await response.json().catch(() => null)
        if (!mounted || !response.ok) return
        setRole(payload?.role || 'customer')
      } catch {
        if (mounted) setRole('customer')
      }
    }

    void loadRole()
    return () => {
      mounted = false
    }
  }, [role])

  return (
    <div className='mx-auto w-full max-w-md'>
      <CustomerAuthHeader
        title='Verify your sign in'
        subtitle='Open the verification link sent to your email to continue.'
      />

      <div className='mt-8 grid gap-4'>
        <div className='rounded-sm border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600'>
          Check your inbox and open the verification link. You will be brought back here automatically.
        </div>
        {error ? <p className='text-sm text-rose-600'>{error}</p> : null}
        {notice ? <p className='text-sm text-emerald-700'>{notice}</p> : null}

        <button type='button' disabled={isCompleting} className={primaryButtonClassName}>
          {isCompleting ? <LoadingDot /> : 'Waiting for verification link'}
        </button>

        <button
          type='button'
          onClick={() => void handleSendLink()}
          disabled={isSending}
          className='text-sm font-medium text-slate-600 underline underline-offset-2 transition hover:text-slate-900 disabled:opacity-60'
        >
          {isSending ? 'Sending link...' : 'Resend link'}
        </button>
      </div>
    </div>
  )
}
