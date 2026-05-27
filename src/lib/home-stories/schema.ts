import { z } from 'zod'

const normalizeBlank = (value: unknown) => {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

const trimAndLimit = (value: unknown, maxLength: number) => {
  if (typeof value !== 'string') return value
  return value.trim().slice(0, maxLength)
}

export const homeStoryMediaTypeSchema = z.enum(['image', 'video'])

export const homeStoryItemSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.preprocess((value) => trimAndLimit(value, 80), z.string().min(1).max(80)),
  media_type: homeStoryMediaTypeSchema,
  media_url: z.string().url().min(1),
  media_key: z.preprocess(normalizeBlank, z.string().max(500).nullable().optional()),
  media_alt: z.preprocess(
    (value) => normalizeBlank(trimAndLimit(value, 300)),
    z.string().max(300).nullable().optional(),
  ),
})

export const homeStoriesSchema = z.object({
  items: z.array(homeStoryItemSchema).max(24).default([]),
})

export const homeStoryRecordSchema = z.object({
  id: z.string().uuid(),
  category_id: z.string().uuid(),
  title: z.string().min(1).max(80),
  media_type: homeStoryMediaTypeSchema,
  media_url: z.string().url().min(1),
  media_key: z.string().nullable().optional(),
  media_alt: z.string().nullable().optional(),
  sort_order: z.number().int().optional(),
  created_at: z.string().nullable().optional(),
})

export type HomeStoryItemInput = z.infer<typeof homeStoryItemSchema>
export type HomeStoryRecord = z.infer<typeof homeStoryRecordSchema>
