import { z } from 'zod'

const normalizeBlank = (value: unknown) => {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

// Accepts a repeated query param (?category_ids=a&category_ids=b), a single
// comma-separated value (?category_ids=a,b), or a single bare value, and
// normalizes all three shapes to a deduped string array.
const csvOrArray = z.preprocess((value) => {
  if (value === undefined || value === null) return undefined
  const raw = Array.isArray(value) ? value : [value]
  const values = raw
    .flatMap((entry) => String(entry ?? '').split(','))
    .map((entry) => entry.trim())
    .filter(Boolean)
  const deduped = Array.from(new Set(values))
  return deduped.length ? deduped : undefined
}, z.array(z.string().max(120)).max(30).optional())

export const PRODUCT_SORT_VALUES = [
  'newest',
  'price_asc',
  'price_desc',
  'name_asc',
  'name_desc',
] as const

export const publicProductListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(30).default(12),
  cursor: z.preprocess(normalizeBlank, z.string().max(256).optional()),
  fields: z.enum(['full', 'card']).default('full'),
  search: z.preprocess(normalizeBlank, z.string().max(120).optional()),
  category: z.preprocess(normalizeBlank, z.string().max(120).optional()),
  tag: z.preprocess(normalizeBlank, z.string().max(120).optional()),
  vendor: z.preprocess(normalizeBlank, z.string().max(120).optional()),
  category_ids: csvOrArray,
  vendor_ids: csvOrArray,
  colors: csvOrArray,
  sizes: csvOrArray,
  sort: z.preprocess(normalizeBlank, z.enum(PRODUCT_SORT_VALUES).optional()),
})

export const publicProductSlugSchema = z.object({
  slug: z.string().min(1).max(140),
})
