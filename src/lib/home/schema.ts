import { z } from 'zod'
import { sanitizeMultilineText } from '@/lib/security/input'

const normalizeBlank = (value: unknown) => {
  if (typeof value !== 'string') return value
  const trimmed = sanitizeMultilineText(value)
  return trimmed === '' ? null : trimmed
}

export const HOME_LAYOUT_KEYS = ['blocks', 'featured_strip', 'hotspot', 'logo_grid'] as const

export const homeLayoutKeySchema = z.enum(HOME_LAYOUT_KEYS)

const stringArraySchema = z.array(z.string()).default([])

export const normalizeHomeLayoutOrder = (order?: unknown) => {
  const normalized: Array<(typeof HOME_LAYOUT_KEYS)[number]> = []

  if (Array.isArray(order)) {
    order.forEach((value) => {
      if (HOME_LAYOUT_KEYS.includes(value as (typeof HOME_LAYOUT_KEYS)[number])) {
        const key = value as (typeof HOME_LAYOUT_KEYS)[number]
        if (!normalized.includes(key)) normalized.push(key)
      }
    })
  }

  HOME_LAYOUT_KEYS.forEach((key) => {
    if (!normalized.includes(key)) normalized.push(key)
  })

  return normalized
}

export const homePageRecordSchema = z.object({
  id: z.string().uuid(),
  page_key: z.literal('home').default('home'),
  legacy_category_id: z.string().uuid().nullable().optional(),
  banner_slider_urls: stringArraySchema,
  banner_slider_keys: stringArraySchema,
  banner_slider_mobile_urls: stringArraySchema,
  banner_slider_mobile_keys: stringArraySchema,
  banner_slider_links: stringArraySchema,
  featured_strip_image_url: z.string().nullable().optional(),
  featured_strip_image_key: z.string().nullable().optional(),
  featured_strip_tag_id: z.string().uuid().nullable().optional(),
  featured_strip_category_id: z.string().uuid().nullable().optional(),
  hotspot_title_main: z.string().nullable().optional(),
  featured_strip_title_main: z.string().nullable().optional(),
  browse_categories_title: z.string().nullable().optional(),
  home_catalog_title: z.string().nullable().optional(),
  home_catalog_description: z.string().nullable().optional(),
  home_catalog_filter_mode: z.enum(['none', 'category', 'tag']).default('none'),
  home_catalog_category_id: z.string().uuid().nullable().optional(),
  home_catalog_tag_id: z.string().uuid().nullable().optional(),
  home_catalog_limit: z.number().int().default(12),
  layout_order: z.array(z.string()).default(HOME_LAYOUT_KEYS.slice()),
  home_blocks: z.array(z.any()).default([]),
  is_active: z.boolean().default(true),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
})

export const homeSettingsUpdateSchema = z.object({
  banner_slider_urls: z.array(z.string()).max(5).optional(),
  banner_slider_keys: z.array(z.string()).max(5).optional(),
  banner_slider_mobile_urls: z.array(z.string()).max(5).optional(),
  banner_slider_mobile_keys: z.array(z.string()).max(5).optional(),
  banner_slider_links: z.array(z.string()).max(5).optional(),
  featured_strip_image_url: z.preprocess(normalizeBlank, z.string().url().nullable().optional()),
  featured_strip_image_key: z.preprocess(normalizeBlank, z.string().max(500).nullable().optional()),
  featured_strip_tag_id: z.preprocess(normalizeBlank, z.string().uuid().nullable().optional()),
  featured_strip_category_id: z.preprocess(normalizeBlank, z.string().uuid().nullable().optional()),
  hotspot_title_main: z.preprocess(normalizeBlank, z.string().max(160).nullable().optional()),
  featured_strip_title_main: z.preprocess(normalizeBlank, z.string().max(160).nullable().optional()),
  browse_categories_title: z.preprocess(normalizeBlank, z.string().max(160).nullable().optional()),
  home_catalog_title: z.preprocess(normalizeBlank, z.string().max(160).nullable().optional()),
  home_catalog_description: z.preprocess(normalizeBlank, z.string().max(500).nullable().optional()),
  home_catalog_filter_mode: z.enum(['none', 'category', 'tag']).optional(),
  home_catalog_category_id: z.preprocess(normalizeBlank, z.string().uuid().nullable().optional()),
  home_catalog_tag_id: z.preprocess(normalizeBlank, z.string().uuid().nullable().optional()),
  home_catalog_limit: z.number().int().min(1).max(30).optional(),
  layout_order: z.array(homeLayoutKeySchema).max(HOME_LAYOUT_KEYS.length).optional(),
  home_blocks: z.array(z.object({
    id: z.string().max(100),
    type: z.enum(['banner_grid', 'hero_slider', 'featured_strip', 'hotspot', 'logo_grid', 'product_catalog', 'browse_cards']),
    config: z.record(z.string(), z.any()),
  })).max(50).optional(),
})

export type HomePageRecord = z.infer<typeof homePageRecordSchema>
export type HomeSettingsUpdateInput = z.infer<typeof homeSettingsUpdateSchema>
