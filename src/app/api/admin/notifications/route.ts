import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireDashboardUser } from '@/lib/auth/require-dashboard-user'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { ADMIN_NOTIFICATIONS_TABLE } from '@/lib/admin/notifications'

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(50).default(20),
  read_status: z.enum(['all', 'read', 'unread']).default('all'),
  unread_only: z.coerce.boolean().optional(),
})

const patchSchema = z.object({
  mark_all: z.boolean().optional(),
  ids: z.array(z.string().uuid()).max(100).optional(),
})

const MISSING_TABLE_CODES = new Set(['42P01', 'PGRST205'])

const safeEmpty = (page: number, perPage: number) => ({
  items: [],
  pagination: { page, per_page: perPage, total: 0, total_pages: 0 },
  summary: { unread: 0, total: 0 },
  permissions: { can_review_category_requests: false, is_admin: false, is_vendor: false },
})

export async function GET(request: NextRequest) {
  const { supabase, applyCookies, canManageCatalog, isAdmin, user, role } =
    await requireDashboardUser(request)
  if (!canManageCatalog || !user?.id) {
    return jsonError('Forbidden.', 403)
  }
  const db = isAdmin ? supabase : createAdminSupabaseClient()

  const parsed = listSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()))
  if (!parsed.success) return jsonError('Invalid query.', 400)
  const { page, per_page: perPage, unread_only: unreadOnly, read_status: readStatus } = parsed.data
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  let query = db
    .from(ADMIN_NOTIFICATIONS_TABLE)
    .select(
      'id, title, message, type, severity, entity_type, entity_id, metadata, is_read, read_at, created_at',
      { count: 'exact' },
    )
    .eq('recipient_user_id', user.id)
    .eq('recipient_role', role === 'admin' ? 'admin' : 'vendor')
    .order('created_at', { ascending: false })
    .range(from, to)
  if (readStatus === 'read') {
    query = query.eq('is_read', true)
  } else if (readStatus === 'unread' || unreadOnly) {
    query = query.eq('is_read', false)
  }

  const { data, error, count } = await query
  if (error) {
    const code = String((error as { code?: string })?.code || '')
    if (MISSING_TABLE_CODES.has(code)) {
      const response = jsonOk(safeEmpty(page, perPage))
      applyCookies(response)
      return response
    }
    console.error('admin notifications list failed:', error.message)
    return jsonError('Unable to load notifications.', 500)
  }

  const [unreadRes, totalRes] = await Promise.all([
    db
      .from(ADMIN_NOTIFICATIONS_TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('recipient_user_id', user.id)
      .eq('recipient_role', role === 'admin' ? 'admin' : 'vendor')
      .eq('is_read', false),
    db
      .from(ADMIN_NOTIFICATIONS_TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('recipient_user_id', user.id)
      .eq('recipient_role', role === 'admin' ? 'admin' : 'vendor'),
  ])

  const total = Number(count) || 0
  const payload = {
    items: Array.isArray(data) ? data : [],
    pagination: {
      page,
      per_page: perPage,
      total,
      total_pages: total > 0 ? Math.ceil(total / perPage) : 0,
    },
    summary: {
      unread: Number(unreadRes?.count || 0) || 0,
      total: Number(totalRes?.count || 0) || 0,
    },
    permissions: {
      can_review_category_requests: Boolean(isAdmin),
      is_admin: Boolean(isAdmin),
      is_vendor: Boolean(!isAdmin),
    },
  }
  const response = jsonOk(payload)
  applyCookies(response)
  return response
}

export async function PATCH(request: NextRequest) {
  const { supabase, applyCookies, canManageCatalog, isAdmin, user, role } =
    await requireDashboardUser(request)
  if (!canManageCatalog || !user?.id) {
    return jsonError('Forbidden.', 403)
  }
  const db = isAdmin ? supabase : createAdminSupabaseClient()

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

  let updateQuery = db
    .from(ADMIN_NOTIFICATIONS_TABLE)
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('recipient_user_id', user.id)
    .eq('recipient_role', role === 'admin' ? 'admin' : 'vendor')
    .eq('is_read', false)

  if (!markAll) {
    updateQuery = updateQuery.in('id', ids)
  }

  const { error } = await updateQuery
  if (error) {
    const code = String((error as { code?: string })?.code || '')
    if (MISSING_TABLE_CODES.has(code)) {
      const response = jsonOk({ success: true, updated: 0 })
      applyCookies(response)
      return response
    }
    console.error('admin notifications mark read failed:', error.message)
    return jsonError('Unable to update notifications.', 500)
  }

  const response = jsonOk({ success: true })
  applyCookies(response)
  return response
}
