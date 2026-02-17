import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { jsonError, jsonOk } from '@/lib/http/response'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { provisionVendorAccess } from '@/lib/auth/vendor-access'

const updateSchema = z.object({
  requestId: z.string().uuid(),
  status: z.enum(['approved', 'rejected']),
  reviewNote: z.string().trim().max(600).optional(),
})

const resendSchema = z.object({
  requestId: z.string().uuid(),
})

async function sendVendorPasswordSetupEmail(request: NextRequest, email: string) {
  const adminClient = createAdminSupabaseClient()
  const redirectTo = new URL('/vendor/set-password', request.url).toString()
  const { error } = await adminClient.auth.resetPasswordForEmail(email, {
    redirectTo,
  })
  if (error) {
    throw new Error(error.message || 'Unable to send vendor setup email.')
  }
}

async function generateVendorPasswordSetupLink(request: NextRequest, email: string) {
  const adminClient = createAdminSupabaseClient()
  const redirectTo = new URL('/vendor/set-password', request.url).toString()
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo },
  })

  if (error) {
    throw new Error(error.message || 'Unable to generate setup link.')
  }

  const link =
    data?.properties?.action_link ||
    data?.properties?.email_otp ||
    data?.properties?.hashed_token ||
    ''

  if (!link) {
    throw new Error('Unable to generate setup link.')
  }

  return String(link)
}

const isRateLimitError = (error: any) =>
  String(error?.message || '')
    .toLowerCase()
    .includes('rate limit')

export async function GET(request: NextRequest) {
  const { supabase, applyCookies, isAdmin } = await requireAdmin(request)

  if (!isAdmin) {
    return jsonError('Forbidden.', 403)
  }

  const { data, error } = await supabase
    .from('vendor_requests')
    .select(
      'id,user_id,email,full_name,phone,brand_name,brand_slug,shipping_country,status,requested_at,reviewed_at,reviewed_by,review_note',
    )
    .order('requested_at', { ascending: false })

  if (error) {
    return jsonError('Unable to load vendor requests.', 500)
  }

  const response = jsonOk({ items: data ?? [] })
  applyCookies(response)
    return response
  }

export async function PATCH(request: NextRequest) {
  const { supabase, applyCookies, user, isAdmin } = await requireAdmin(request)

  if (!isAdmin || !user) {
    return jsonError('Forbidden.', 403)
  }

  const body = await request.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError('Invalid request.', 400)
  }

  const { requestId, status, reviewNote } = parsed.data

  const { data: existing, error: fetchError } = await supabase
    .from('vendor_requests')
    .select('id,user_id,email,brand_name,brand_slug,status')
    .eq('id', requestId)
    .maybeSingle()

  if (fetchError || !existing) {
    return jsonError('Vendor request not found.', 404)
  }

  if (existing.status !== 'pending') {
    return jsonError('Vendor request already processed.', 409)
  }

  const reviewPayload = {
    status,
    reviewed_at: new Date().toISOString(),
    reviewed_by: user.id,
    review_note: reviewNote || null,
  }

  const { error: reviewError } = await supabase
    .from('vendor_requests')
    .update(reviewPayload)
    .eq('id', requestId)

  if (reviewError) {
    return jsonError('Unable to update vendor request.', 500)
  }

  if (status === 'approved') {
    try {
      const adminClient = createAdminSupabaseClient()
      await provisionVendorAccess(adminClient, existing.user_id, existing.brand_name, existing.brand_slug)
      await sendVendorPasswordSetupEmail(request, existing.email)
    } catch (error: any) {
      if (isRateLimitError(error)) {
        try {
          const setupLink = await generateVendorPasswordSetupLink(request, existing.email)
          const response = jsonOk({
            success: true,
            warning: 'Email rate limit exceeded. Copy and send the setup link manually.',
            setupLink,
          })
          applyCookies(response)
          return response
        } catch (linkError: any) {
          return jsonError(linkError?.message || 'Approved, but unable to generate setup link.', 500)
        }
      }

      await supabase
        .from('vendor_requests')
        .update({
          status: 'pending',
          reviewed_at: null,
          reviewed_by: null,
          review_note: null,
        })
        .eq('id', requestId)
      return jsonError(error?.message || 'Unable to approve vendor request.', 500)
    }
  }

  const response = jsonOk({ success: true })
  applyCookies(response)
  return response
}

export async function POST(request: NextRequest) {
  const { supabase, applyCookies, isAdmin } = await requireAdmin(request)

  if (!isAdmin) {
    return jsonError('Forbidden.', 403)
  }

  const body = await request.json().catch(() => null)
  const parsed = resendSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError('Invalid request.', 400)
  }

  const { requestId } = parsed.data
  const { data: existing, error: fetchError } = await supabase
    .from('vendor_requests')
    .select('id,email,status')
    .eq('id', requestId)
    .maybeSingle()

  if (fetchError || !existing) {
    return jsonError('Vendor request not found.', 404)
  }
  if (existing.status !== 'approved') {
    return jsonError('Only approved vendor requests can resend approval email.', 409)
  }

  try {
    await sendVendorPasswordSetupEmail(request, existing.email)
  } catch (error: any) {
    if (isRateLimitError(error)) {
      try {
        const setupLink = await generateVendorPasswordSetupLink(request, existing.email)
        const response = jsonOk({
          sent: false,
          warning: 'Email rate limit exceeded. Copy and send the setup link manually.',
          setupLink,
        })
        applyCookies(response)
        return response
      } catch (linkError: any) {
        return jsonError(linkError?.message || 'Unable to resend approval email.', 500)
      }
    }
    return jsonError(error?.message || 'Unable to resend approval email.', 500)
  }

  const response = jsonOk({ sent: true })
  applyCookies(response)
  return response
}
