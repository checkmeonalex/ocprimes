import { z } from 'zod'

const normalizeBlank = (value: unknown) => {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(50).default(20),
  search: z.preprocess(normalizeBlank, z.string().max(120).optional()),
})

export const createTaxonomySchema = z.object({
  name: z.preprocess(normalizeBlank, z.string().min(2).max(120)),
  slug: z.preprocess(normalizeBlank, z.string().max(120).optional()),
  description: z.preprocess(normalizeBlank, z.string().max(500).optional()),
})

export const updateTaxonomySchema = createTaxonomySchema.extend({
  id: z.string().uuid(),
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
