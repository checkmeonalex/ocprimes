import { z } from 'zod'
import { CATEGORY_LAYOUT_KEYS } from '@/lib/layouts/category-layout'

const sliderLinkSchema = z
  .string()
  .max(300)
  .refine(
    (value) =>
      value === '' ||
      value.startsWith('/') ||
      value.startsWith('http://') ||
      value.startsWith('https://'),
    'Invalid slider link.',
  )

const normalizeBlank = (value: unknown) => {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

export const listCategoriesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(50).default(20),
  search: z.preprocess(normalizeBlank, z.string().max(120).optional()),
})

export const categoryTreeQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(200),
  search: z.preprocess(normalizeBlank, z.string().max(120).optional()),
})

export const createCategorySchema = z.object({
  name: z.preprocess(normalizeBlank, z.string().min(2).max(120)),
  slug: z.preprocess(normalizeBlank, z.string().max(120).optional()),
  description: z.preprocess(normalizeBlank, z.string().max(500).optional()),
  parent_id: z.preprocess(
    normalizeBlank,
    z.string().uuid().optional(),
  ),
})

export const updateCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.preprocess(normalizeBlank, z.string().min(2).max(120).optional()),
  slug: z.preprocess(normalizeBlank, z.string().max(120).optional()),
  description: z.preprocess(
    (value) => (value === '' ? null : value),
    z.string().max(500).nullable().optional(),
  ),
  parent_id: z.preprocess(
    (value) => (value === '' ? null : value),
    z.string().uuid().nullable().optional(),
  ),
  image_url: z.preprocess(
    (value) => (value === '' ? null : value),
    z.string().url().max(500).nullable().optional(),
  ),
  image_alt: z.preprocess(
    (value) => (value === '' ? null : value),
    z.string().max(200).nullable().optional(),
  ),
  image_key: z.preprocess(
    (value) => (value === '' ? null : value),
    z.string().max(500).nullable().optional(),
  ),
  banner_image_url: z.preprocess(
    (value) => (value === '' ? null : value),
    z.string().url().max(500).nullable().optional(),
  ),
  banner_image_key: z.preprocess(
    (value) => (value === '' ? null : value),
    z.string().max(500).nullable().optional(),
  ),
  banner_title: z.preprocess(
    (value) => (value === '' ? null : value),
    z.string().max(200).nullable().optional(),
  ),
  banner_subtitle: z.preprocess(
    (value) => (value === '' ? null : value),
    z.string().max(500).nullable().optional(),
  ),
  banner_cta_text: z.preprocess(
    (value) => (value === '' ? null : value),
    z.string().max(120).nullable().optional(),
  ),
  banner_cta_link: z.preprocess(
    (value) => (value === '' ? null : value),
    z.string().max(300).nullable().optional(),
  ),
  hotspot_title_main: z.preprocess(
    (value) => (value === '' ? null : value),
    z.string().max(200).nullable().optional(),
  ),
  featured_strip_title_main: z.preprocess(
    (value) => (value === '' ? null : value),
    z.string().max(200).nullable().optional(),
  ),
  browse_categories_title: z.preprocess(
    (value) => (value === '' ? null : value),
    z.string().max(200).nullable().optional(),
  ),
  home_catalog_title: z.preprocess(
    (value) => (value === '' ? null : value),
    z.string().max(200).nullable().optional(),
  ),
  home_catalog_description: z.preprocess(
    (value) => (value === '' ? null : value),
    z.string().max(500).nullable().optional(),
  ),
  home_catalog_filter_mode: z.preprocess(
    (value) => (value === '' ? null : value),
    z.enum(['none', 'category', 'tag']).nullable().optional(),
  ),
  home_catalog_category_id: z.preprocess(
    (value) => (value === '' ? null : value),
    z.string().uuid().nullable().optional(),
  ),
  home_catalog_tag_id: z.preprocess(
    (value) => (value === '' ? null : value),
    z.string().uuid().nullable().optional(),
  ),
  home_catalog_limit: z.preprocess(
    (value) => (value === '' ? null : value),
    z.coerce.number().int().min(1).max(30).nullable().optional(),
  ),
  banner_image_secondary_url: z.preprocess(
    (value) => (value === '' ? null : value),
    z.string().url().max(500).nullable().optional(),
  ),
  banner_image_secondary_key: z.preprocess(
    (value) => (value === '' ? null : value),
    z.string().max(500).nullable().optional(),
  ),
  banner_slider_urls: z
    .array(z.string().url().max(500))
    .max(5)
    .optional(),
  banner_slider_keys: z
    .array(z.string().max(500))
    .max(5)
    .optional(),
  banner_slider_mobile_urls: z
    .array(z.string().url().max(500))
    .max(5)
    .optional(),
  banner_slider_mobile_keys: z
    .array(z.string().max(500))
    .max(5)
    .optional(),
  banner_slider_links: z
    .array(sliderLinkSchema)
    .max(5)
    .optional(),
  featured_strip_image_url: z.preprocess(
    (value) => (value === '' ? null : value),
    z.string().url().max(500).nullable().optional(),
  ),
  featured_strip_image_key: z.preprocess(
    (value) => (value === '' ? null : value),
    z.string().max(500).nullable().optional(),
  ),
  featured_strip_tag_id: z.preprocess(
    (value) => (value === '' ? null : value),
    z.string().uuid().nullable().optional(),
  ),
  featured_strip_category_id: z.preprocess(
    (value) => (value === '' ? null : value),
    z.string().uuid().nullable().optional(),
  ),
  layout_order: z
    .array(z.enum(CATEGORY_LAYOUT_KEYS))
    .max(CATEGORY_LAYOUT_KEYS.length)
    .optional(),
  is_active: z
    .preprocess(
      (value) =>
        value === 'true'
          ? true
          : value === 'false'
            ? false
            : value,
      z.boolean().optional(),
    )
    .optional(),
})

export const reorderCategoriesSchema = z.object({
  updates: z
    .array(
      z.object({
        id: z.string().uuid(),
        parent_id: z.string().uuid().nullable(),
        sort_order: z.number().int().min(0),
      }),
    )
    .min(1)
    .max(200),
})

export const buildSlug = (value: string) => {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
  return slug
}
