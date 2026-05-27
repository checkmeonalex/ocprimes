import { z } from 'zod'

const normalizeBlank = (value: unknown) => {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

export const browseCardItemSchema = z.object({
  id: z.string().uuid().optional(),
  segment: z.enum(['all', 'men', 'women']),
  name: z.string().min(1).max(120),
  link: z.preprocess(normalizeBlank, z.string().max(1000).nullable().optional()),
  image_url: z.string().url().min(1),
  image_key: z.preprocess(normalizeBlank, z.string().max(500).nullable().optional()),
  image_alt: z.preprocess(normalizeBlank, z.string().max(300).nullable().optional()),
})

export const browseCardsSchema = z.object({
  items: z.array(browseCardItemSchema).max(180).default([]),
})
