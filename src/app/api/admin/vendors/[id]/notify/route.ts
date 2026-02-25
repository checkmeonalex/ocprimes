import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createNotifications } from '@/lib/admin/notifications'
import {
  buildVendorOrderReceivedTemplate,
  isSupportedTemplateKey,
} from '@/lib/notifications/templates'

const metadataSchema = z.object({}).catchall(z.unknown())
const productSchema = z.object({
  name: z.string().trim().min(1).max(200),
  quantity: z.coerce.number().int().min(1).max(1000),
  lineTotal: z.coerce.number().min(0).max(1000000000).optional(),
  image: z.string().trim().optional(),
})

const paramsSchema = z.object({
  id: z.string().uuid(),
})

const bodySchema = z.object({
  title: z.string().trim().min(2).max(120),
  message: z.string().trim().min(2).max(1000),
  type: z.string().trim().max(80).optional().default('admin_message'),
  severity: z.enum(['info', 'success', 'warning', 'error']).optional().default('info'),
  entity_type: z.string().trim().max(80).optional(),
  entity_id: z.string().trim().max(120).optional(),
  metadata: metadataSchema.optional(),
  template_key: z.string().trim().max(120).optional(),
  template_payload: z
    .object({
      orderId: z.string().trim().uuid(),
      orderNumber: z.string().trim().min(2).max(64),
      currency: z.string().trim().length(3).optional(),
      products: z.array(productSchema).max(20).optional(),
      actionUrl: z.string().trim().max(400).optional(),
    })
    .optional(),
})

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  const { isAdmin, user, applyCookies } = await requireAdmin(request)
  if (!isAdmin || !user?.id) return jsonError('Forbidden.', 403)

  const params = await context.params
  const parsedParams = paramsSchema.safeParse(params)
  if (!parsedParams.success) return jsonError('Invalid vendor id.', 400)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError('Invalid payload.', 400)
  }
  const parsedBody = bodySchema.safeParse(body)
  if (!parsedBody.success) {
    return jsonError(parsedBody.error.issues[0]?.message || 'Invalid notification payload.', 400)
  }

  const vendorId = parsedParams.data.id
  const templateKey = String(parsedBody.data.template_key || '').trim()
  const adminDb = createAdminSupabaseClient()
  const { data: vendorRoleRow } = await adminDb
    .from('user_roles')
    .select('role')
    .eq('user_id', vendorId)
    .maybeSingle()
  if (String(vendorRoleRow?.role || '').toLowerCase() !== 'vendor') {
    return jsonError('Vendor not found.', 404)
  }

  let notificationPayload = {
    recipient_user_id: vendorId,
    recipient_role: 'vendor' as const,
    title: parsedBody.data.title,
    message: parsedBody.data.message,
    type: parsedBody.data.type,
    severity: parsedBody.data.severity,
    entity_type: parsedBody.data.entity_type || null,
    entity_id: parsedBody.data.entity_id || null,
    created_by: user.id,
    metadata: {
      source: 'admin_vendor_moderation',
      ...(parsedBody.data.metadata || {}),
    },
  }

  if (templateKey) {
    if (!isSupportedTemplateKey(templateKey)) {
      return jsonError('Unsupported template key.', 400)
    }
    if (!parsedBody.data.template_payload) {
      return jsonError('Template payload is required.', 400)
    }
    if (templateKey === 'vendor_order_received') {
      const built = buildVendorOrderReceivedTemplate(parsedBody.data.template_payload)
      notificationPayload = {
        ...notificationPayload,
        title: built.title,
        message: built.message,
        type: built.type,
        severity: built.severity,
        entity_type: built.entityType,
        entity_id: built.entityId,
        metadata: {
          source: 'admin_order_template',
          ...built.metadata,
        },
      }
    }
  }

  await createNotifications(adminDb, [notificationPayload])

  const response = jsonOk({ success: true })
  applyCookies(response)
  return response
}
