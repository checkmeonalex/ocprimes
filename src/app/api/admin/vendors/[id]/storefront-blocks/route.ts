import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { jsonError, jsonOk } from '@/lib/http/response'
import { sanitizeCustomSectionHtml } from '@/utils/sanitize-custom-html'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

const storefrontBlockSchema = z.object({
  id: z.string().max(100),
  type: z.enum(['banner_grid', 'custom_html']),
  template: z.string().max(60).optional(),
  config: z.object({
    layout: z.enum(['single', 'two-col', 'two-by-two', 'three-col', 'four-col', 'hero-duo']).optional(),
    mode: z.enum(['static', 'slider']).optional(),
    slides: z
      .array(
        z.object({
          imageUrl: z.string().max(500),
          linkUrl: z.string().max(300),
        }),
      )
      .max(16)
      .optional(),
    html: z.string().max(20000).optional(),
    js: z.string().max(20000).optional(),
    mobileEnabled: z.boolean().optional(),
    mobileHtml: z.string().max(20000).optional(),
    mobileJs: z.string().max(20000).optional(),
  }),
})

const patchSchema = z.object({
  storefront_blocks: z.array(storefrontBlockSchema).max(50),
  storefront_section_order: z.array(z.enum(['banner_grid', 'storefront_filter'])).max(10).optional(),
})

const sanitizeStorefrontBlocks = (blocks: z.infer<typeof storefrontBlockSchema>[]) =>
  blocks.map((block) =>
    block.type === 'custom_html'
      ? {
          ...block,
          config: {
            ...block.config,
            html: sanitizeCustomSectionHtml(String(block.config?.html || '')),
            mobileHtml: sanitizeCustomSectionHtml(String(block.config?.mobileHtml || '')),
          },
        }
      : block,
  )

const SELECT_COLUMNS = 'id, name, slug, created_by, storefront_blocks, storefront_section_order'

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { isAdmin } = await requireAdmin(request)
  if (!isAdmin) {
    return jsonError('Forbidden.', 403)
  }

  const params = await context.params
  const parsedParams = paramsSchema.safeParse(params)
  if (!parsedParams.success) {
    return jsonError('Invalid vendor id.', 400)
  }

  const db = createAdminSupabaseClient()
  const { data, error } = await db
    .from('admin_brands')
    .select(SELECT_COLUMNS)
    .eq('created_by', parsedParams.data.id)
    .maybeSingle()

  if (error) {
    console.error('vendor storefront-blocks load failed:', error.message)
    return jsonError('Unable to load vendor storefront.', 500)
  }
  if (!data?.id) {
    return jsonError('Vendor has no storefront/brand yet.', 404)
  }

  return jsonOk({
    item: {
      id: data.id,
      name: data.name,
      slug: data.slug,
      storefront_blocks: Array.isArray(data.storefront_blocks) ? data.storefront_blocks : [],
      storefront_section_order: Array.isArray(data.storefront_section_order)
        ? data.storefront_section_order
        : ['banner_grid', 'storefront_filter'],
    },
  })
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { isAdmin } = await requireAdmin(request)
  if (!isAdmin) {
    return jsonError('Forbidden.', 403)
  }

  const params = await context.params
  const parsedParams = paramsSchema.safeParse(params)
  if (!parsedParams.success) {
    return jsonError('Invalid vendor id.', 400)
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return jsonError('Invalid payload.', 400)
  }

  const parsed = patchSchema.safeParse(payload)
  if (!parsed.success) {
    return jsonError('Invalid storefront blocks payload.', 400)
  }

  const db = createAdminSupabaseClient()
  const { data: brand, error: brandError } = await db
    .from('admin_brands')
    .select('id')
    .eq('created_by', parsedParams.data.id)
    .maybeSingle()

  if (brandError) {
    console.error('vendor storefront-blocks lookup failed:', brandError.message)
    return jsonError('Unable to load vendor storefront.', 500)
  }
  if (!brand?.id) {
    return jsonError('Vendor has no storefront/brand yet.', 404)
  }

  const updates: Record<string, unknown> = {
    storefront_blocks: sanitizeStorefrontBlocks(parsed.data.storefront_blocks),
  }
  if (parsed.data.storefront_section_order !== undefined) {
    updates.storefront_section_order = parsed.data.storefront_section_order
  }

  const { data, error } = await db
    .from('admin_brands')
    .update(updates)
    .eq('id', brand.id)
    .select(SELECT_COLUMNS)
    .maybeSingle()

  if (error) {
    console.error('vendor storefront-blocks save failed:', error.message)
    return jsonError('Unable to save vendor storefront.', 500)
  }

  return jsonOk({
    item: {
      id: data?.id,
      name: data?.name,
      slug: data?.slug,
      storefront_blocks: Array.isArray(data?.storefront_blocks) ? data?.storefront_blocks : [],
      storefront_section_order: Array.isArray(data?.storefront_section_order)
        ? data?.storefront_section_order
        : ['banner_grid', 'storefront_filter'],
    },
  })
}
