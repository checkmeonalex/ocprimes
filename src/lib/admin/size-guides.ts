import { z } from 'zod'

const normalizeBlank = (value: unknown) => {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

export const sizeGuideColumnSchema = z.object({
  key: z.string().min(1).max(60),
  label: z.string().min(1).max(60),
})

export const sizeGuideRowSchema = z.record(z.string(), z.string()).refine(
  (row) => Object.keys(row).length > 0,
  'Row must have at least one value.',
)

export const listSizeGuidesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
  search: z.preprocess(normalizeBlank, z.string().max(120).optional()),
})

export const createSizeGuideSchema = z.object({
  name: z.preprocess(normalizeBlank, z.string().min(2).max(140)),
  unit_toggle: z.boolean().optional().default(false),
  columns: z.array(sizeGuideColumnSchema).min(1).max(20),
  rows: z.array(sizeGuideRowSchema).max(100).default([]),
  how_to_measure: z.preprocess(normalizeBlank, z.string().max(4000).optional()),
  notes: z.preprocess(normalizeBlank, z.string().max(2000).optional()),
  // Only admins may choose 'private' (enforced in size-guide-route.ts) — a
  // vendor-created guide is always private regardless of what they send.
  // Same convention as admin_attributes: no visibility sent = shared/public.
  visibility: z.enum(['public', 'private']).optional(),
})

export const updateSizeGuideSchema = z.object({
  id: z.string().uuid(),
  name: z.preprocess(normalizeBlank, z.string().min(2).max(140).optional()),
  unit_toggle: z.boolean().optional(),
  columns: z.array(sizeGuideColumnSchema).min(1).max(20).optional(),
  rows: z.array(sizeGuideRowSchema).max(100).optional(),
  how_to_measure: z.preprocess(
    (value) => (value === '' ? null : value),
    z.string().max(4000).nullable().optional(),
  ),
  notes: z.preprocess(
    (value) => (value === '' ? null : value),
    z.string().max(2000).nullable().optional(),
  ),
  // Admin-only, same as create — stripped for vendor requests server-side.
  visibility: z.enum(['public', 'private']).optional(),
})

export type SizeGuideColumn = z.infer<typeof sizeGuideColumnSchema>
export type SizeGuideRow = z.infer<typeof sizeGuideRowSchema>
