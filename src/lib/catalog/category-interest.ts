import { z } from 'zod'

export const CATEGORY_AVAILABILITY_INTERESTS_TABLE = 'category_availability_interests'

export const categoryInterestMutationSchema = z.object({
  action: z.literal('notify_category_interest'),
  categoryId: z.string().uuid(),
  categoryName: z.string().trim().min(1).max(160).optional().nullable(),
  categorySlug: z.string().trim().min(1).max(200).optional().nullable(),
})

export const toOptionalText = (value: unknown) => {
  const normalized = String(value || '').trim()
  return normalized || null
}
