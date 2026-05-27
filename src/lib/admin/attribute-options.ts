import { z } from 'zod'

const normalizeBlank = (value: unknown) => {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

const colorHexSchema = z
  .string()
  .regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i, 'Invalid color.')

const colorValueSchema = z.union([colorHexSchema, z.literal('multicolor')])

export const listAttributeOptionsSchema = z.object({
  attribute_id: z.string().uuid(),
})

export const createAttributeOptionSchema = z.object({
  attribute_id: z.string().uuid(),
  name: z.preprocess(normalizeBlank, z.string().min(1).max(120)),
  slug: z.preprocess(normalizeBlank, z.string().max(120).optional()),
  color_hex: z.preprocess(normalizeBlank, colorValueSchema.optional()),
  sort_order: z.coerce.number().int().min(0).optional(),
})

export const updateAttributeOptionSchema = z.object({
  id: z.string().uuid(),
  name: z.preprocess(normalizeBlank, z.string().min(1).max(120)),
  slug: z.preprocess(normalizeBlank, z.string().max(120).optional()),
  color_hex: z.preprocess(normalizeBlank, colorValueSchema.optional()),
  sort_order: z.coerce.number().int().min(0).optional(),
})

export const deleteAttributeOptionSchema = z.object({
  id: z.string().uuid(),
})
