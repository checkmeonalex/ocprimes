import { z } from 'zod'

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
