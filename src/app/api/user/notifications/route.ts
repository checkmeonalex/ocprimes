import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { jsonError, jsonOk } from '@/lib/http/response'
import { ADMIN_NOTIFICATIONS_TABLE } from '@/lib/admin/notifications'

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(50).default(20),
  read_status: z.enum(['all', 'read', 'unread']).default('all'),
})

const patchSchema = z.object({
  mark_all: z.boolean().optional(),
  ids: z.array(z.string().uuid()).max(100).optional(),
})

const MISSING_TABLE_CODES = new Set(['42P01', 'PGRST205'])

const emptyPayload = (page: number, perPage: number) => ({
  items: [],
  pagination: { page, per_page: perPage, total: 0, total_pages: 0 },
  summary: { unread: 0, total: 0 },
})

export async function GET(request: NextRequest) {
  const parsed = listSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()))
  if (!parsed.success) return jsonError('Invalid query.', 400)

  const { page, per_page: perPage, read_status: readStatus } = parsed.data
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData?.user?.id) {
    return jsonError('You must be signed in.', 401)
  }

  const db = createAdminSupabaseClient()
  let listQuery = db
    .from(ADMIN_NOTIFICATIONS_TABLE)
    .select('id, title, message, type, severity, metadata, is_read, read_at, created_at', {
      count: 'exact',
    })
    .eq('recipient_user_id', authData.user.id)
    .eq('recipient_role', 'customer')
    .order('created_at', { ascending: false })
    .range(from, to)

  if (readStatus === 'read') {
    listQuery = listQuery.eq('is_read', true)
  } else if (readStatus === 'unread') {
    listQuery = listQuery.eq('is_read', false)
  }

  const { data, error, count } = await listQuery
  if (error) {
    const code = String((error as { code?: string }).code || '')
    if (MISSING_TABLE_CODES.has(code)) {
      const response = jsonOk(emptyPayload(page, perPage))
      applyCookies(response)
      return response
    }
    console.error('user notifications list failed:', error.message)
    return jsonError('Unable to load notifications.', 500)
  }

  const [unreadRes, totalRes] = await Promise.all([
    db
      .from(ADMIN_NOTIFICATIONS_TABLE)
      .select('id', { head: true, count: 'exact' })
      .eq('recipient_user_id', authData.user.id)
      .eq('recipient_role', 'customer')
      .eq('is_read', false),
    db
      .from(ADMIN_NOTIFICATIONS_TABLE)
      .select('id', { head: true, count: 'exact' })
      .eq('recipient_user_id', authData.user.id)
      .eq('recipient_role', 'customer'),
  ])

  const total = Number(count) || 0
  const response = jsonOk({
    items: Array.isArray(data) ? data : [],
    pagination: {
      page,
      per_page: perPage,
      total,
      total_pages: total ? Math.ceil(total / perPage) : 0,
    },
    summary: {
      unread: Number(unreadRes?.count || 0) || 0,
      total: Number(totalRes?.count || 0) || 0,
    },
  })
  applyCookies(response)
  return response
}

export async function PATCH(request: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData?.user?.id) {
    return jsonError('You must be signed in.', 401)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError('Invalid payload.', 400)
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return jsonError('Invalid payload.', 400)

  const markAll = Boolean(parsed.data.mark_all)
  const ids = Array.isArray(parsed.data.ids) ? parsed.data.ids : []
  if (!markAll && !ids.length) {
    return jsonError('Provide ids or mark_all.', 400)
  }

  const db = createAdminSupabaseClient()
  let updateQuery = db
    .from(ADMIN_NOTIFICATIONS_TABLE)
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('recipient_user_id', authData.user.id)
    .eq('recipient_role', 'customer')
    .eq('is_read', false)

  if (!markAll) {
    updateQuery = updateQuery.in('id', ids)
  }

  const { error } = await updateQuery
  if (error) {
    const code = String((error as { code?: string }).code || '')
    if (MISSING_TABLE_CODES.has(code)) {
      const response = jsonOk({ success: true, updated: 0 })
      applyCookies(response)
      return response
    }
    console.error('user notifications mark read failed:', error.message)
    return jsonError('Unable to update notifications.', 500)
  }

  const response = jsonOk({ success: true })
  applyCookies(response)
  return response
}
