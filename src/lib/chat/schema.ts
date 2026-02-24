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

export const chatHelpCenterReportSchema = z.object({
  reason: z.enum([
    'fraudulent_activity',
    'misleading_information',
    'wrong_or_fake_product',
    'poor_quality_or_damaged',
    'abusive_or_threatening_behavior',
    'high_pricing',
    'scam',
    'other',
  ]),
  otherDetails: z.string().trim().max(600).optional().default(''),
  reportedSellerName: z.string().trim().min(1).max(120),
  productId: z.string().uuid().optional(),
  sourceConversationId: z.string().uuid().optional(),
})
