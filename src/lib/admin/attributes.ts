import { z } from 'zod'

const normalizeBlank = (value: unknown) => {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

export const listAttributesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(50).default(20),
  search: z.preprocess(normalizeBlank, z.string().max(120).optional()),
  include_options: z.preprocess(
    (value) => (value === 'true' ? true : value === 'false' ? false : value),
    z.boolean().optional(),
  ),
})

export const createAttributeSchema = z.object({
  name: z.preprocess(normalizeBlank, z.string().min(2).max(120)),
  slug: z.preprocess(normalizeBlank, z.string().max(120).optional()),
  description: z.preprocess(normalizeBlank, z.string().max(500).optional()),
  type_id: z.string().uuid(),
  visibility: z.enum(['public', 'private']).optional(),
})

export const updateAttributeSchema = z.object({
  id: z.string().uuid(),
  name: z.preprocess(normalizeBlank, z.string().min(2).max(120)),
  slug: z.preprocess(normalizeBlank, z.string().max(120).optional()),
  description: z.preprocess(normalizeBlank, z.string().max(500).optional()),
  type_id: z.string().uuid(),
  visibility: z.enum(['public', 'private']).optional(),
})

export const deleteAttributeSchema = z.object({
  id: z.string().uuid(),
})
