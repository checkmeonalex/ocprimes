import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { jsonError, jsonOk } from '@/lib/http/response'
import { sanitizeCustomSectionHtml } from '@/utils/sanitize-custom-html'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

// banner_grid and hero_slider both store their images under a `slides` key but
// with incompatible item shapes, since they share one flat, non-discriminated
// config schema below — union the two shapes rather than merging their fields.
const bannerSlideItemSchema = z.object({
  imageUrl: z.string().max(500),
  linkUrl: z.string().max(300),
})

const heroSlideItemSchema = z.object({
  desktopUrl: z.string().max(500).optional(),
  desktopType: z.enum(['image', 'video']).optional(),
  desktopPoster: z.string().max(500).optional(),
  mobileUrl: z.string().max(500).optional(),
  mobileType: z.enum(['image', 'video']).optional(),
  mobilePoster: z.string().max(500).optional(),
  linkUrl: z.string().max(300).optional(),
})

const browseCardItemSchema = z.object({
  id: z.string().max(100).optional(),
  segment: z.string().max(20).optional(),
  name: z.string().max(120).optional(),
  link: z.string().max(300).optional(),
  imageUrl: z.string().max(500).optional(),
  imageKey: z.string().max(500).optional(),
  imageAlt: z.string().max(200).optional(),
})

const logoGridItemSchema = z.object({
  id: z.string().max(100).optional(),
  image_url: z.string().max(500).optional(),
  image_key: z.string().max(500).optional(),
  image_alt: z.string().max(200).optional(),
})

const storefrontBlockSchema = z.object({
  id: z.string().max(100),
  type: z.enum([
    'banner_grid',
    'hero_slider',
    'featured_strip',
    'product_catalog',
    'browse_cards',
    'logo_grid',
    'custom_html',
  ]),
  template: z.string().max(60).optional(),
  config: z.object({
    // banner_grid
    layout: z.enum(['single', 'two-col', 'two-by-two', 'three-col', 'four-col', 'hero-duo']).optional(),
    mode: z.enum(['static', 'slider']).optional(),
    slides: z.array(z.union([bannerSlideItemSchema, heroSlideItemSchema])).max(16).optional(),
    // custom_html
    html: z.string().max(20000).optional(),
    js: z.string().max(20000).optional(),
    mobileEnabled: z.boolean().optional(),
    mobileHtml: z.string().max(20000).optional(),
    mobileJs: z.string().max(20000).optional(),
    // featured_strip
    imageUrl: z.string().max(500).optional(),
    imageKey: z.string().max(500).optional(),
    titleMain: z.string().max(200).optional(),
    filterType: z.enum(['none', 'category', 'tag']).optional(),
    categoryId: z.string().max(100).optional(),
    tagId: z.string().max(100).optional(),
    // product_catalog
    title: z.string().max(200).optional(),
    subtitle: z.string().max(400).optional(),
    filterMode: z.enum(['none', 'category', 'tag']).optional(),
    limit: z.number().int().min(1).max(30).optional(),
    // browse_cards
    cards: z.array(browseCardItemSchema).max(60).optional(),
    // logo_grid
    titleBgColor: z.string().max(20).optional(),
    titleTextColor: z.string().max(20).optional(),
    items: z.array(logoGridItemSchema).max(60).optional(),
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
