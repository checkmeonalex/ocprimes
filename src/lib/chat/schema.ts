import { z } from 'zod'

export const chatConversationInitSchema = z.object({
  productId: z.string().uuid(),
})

export const chatMessageCreateSchema = z.object({
  body: z.string().trim().min(1).max(2000),
})

export const chatMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
})
