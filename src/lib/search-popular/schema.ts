import { z } from 'zod'

const MAX_URL_LENGTH = 2048

const isSafeUrlLike = (value: string) => {
  if (!value || /\s/.test(value)) return false
  if (value.startsWith('/') && !value.startsWith('//')) return true
  return /^https?:\/\/[^\s]+$/i.test(value)
}

const urlLikeSchema = z
  .string()
  .trim()
  .min(1)
  .max(MAX_URL_LENGTH)
  .refine(isSafeUrlLike, 'Use an absolute http(s) URL or a site path that starts with "/".')

export const popularSearchItemQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(10),
})

export const popularSearchItemIdParamsSchema = z.object({
  id: z.string().uuid(),
})

export const popularSearchItemInputSchema = z.object({
  text: z.string().trim().min(1).max(80),
  imageUrl: urlLikeSchema,
  targetUrl: urlLikeSchema,
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  isActive: z.coerce.boolean().default(true),
})

export const popularSearchItemRecordSchema = z.object({
  id: z.string().uuid(),
  text: z.string().trim().min(1).max(80),
  image_url: urlLikeSchema,
  target_url: urlLikeSchema,
  sort_order: z.number().int().min(0).max(9999),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
})

export type PopularSearchItemInput = z.infer<typeof popularSearchItemInputSchema>

export type PopularSearchItem = {
  id: string
  text: string
  imageUrl: string
  targetUrl: string
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export function normalizePopularSearchItemInput(input: PopularSearchItemInput) {
  return {
    text: input.text.trim(),
    imageUrl: input.imageUrl.trim(),
    targetUrl: input.targetUrl.trim(),
    sortOrder: input.sortOrder,
    isActive: input.isActive,
  }
}

export function toPopularSearchItem(
  record: z.infer<typeof popularSearchItemRecordSchema>,
): PopularSearchItem {
  return {
    id: record.id,
    text: record.text,
    imageUrl: record.image_url,
    targetUrl: record.target_url,
    sortOrder: record.sort_order,
    isActive: record.is_active,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  }
}
