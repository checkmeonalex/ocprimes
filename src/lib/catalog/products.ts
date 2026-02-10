import { z } from 'zod'

const normalizeBlank = (value: unknown) => {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

export const publicProductListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(30).default(12),
  search: z.preprocess(normalizeBlank, z.string().max(120).optional()),
  category: z.preprocess(normalizeBlank, z.string().max(120).optional()),
  tag: z.preprocess(normalizeBlank, z.string().max(120).optional()),
  vendor: z.preprocess(normalizeBlank, z.string().max(120).optional()),
})

export const publicProductSlugSchema = z.object({
  slug: z.string().min(1).max(140),
})
