import { z } from 'zod'
import { sanitizeMultilineText, sanitizePlainText } from '@/lib/security/input'

export const chatConversationInitSchema = z.object({
  productId: z.string().uuid().optional(),
  vendorSlug: z.string().trim().min(1).max(120).optional(),
}).refine(
  (data) => data.productId || data.vendorSlug,
  { message: 'Either productId or vendorSlug is required.' },
)

export const chatMessageCreateSchema = z.object({
  body: z.preprocess(sanitizeMultilineText, z.string().min(1).max(2000)),
})

export const chatMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  before: z.string().trim().max(64).optional().default(''),
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
  otherDetails: z.preprocess(sanitizeMultilineText, z.string().max(600)).optional().default(''),
  reportedSellerName: z.preprocess(sanitizePlainText, z.string().min(1).max(120)),
  productId: z.string().uuid().optional(),
  sourceConversationId: z.string().uuid().optional(),
})

export const chatHelpCenterReturnRequestSchema = z.object({
  orderId: z.string().uuid(),
  itemIds: z.array(z.string().uuid()).min(1).max(30),
  orderNumber: z.preprocess(sanitizePlainText, z.string().max(120)).optional().default(''),
  trackId: z.preprocess(sanitizePlainText, z.string().max(120)).optional().default(''),
  orderStatus: z.preprocess(sanitizePlainText, z.string().max(80)).optional().default(''),
  itemReports: z.array(
    z.object({
      itemId: z.string().uuid(),
      reasonKeys: z.array(
        z.enum([
          'defective_item',
          'wrong_item',
          'missing_parts',
          'not_as_described',
          'changed_mind',
          'delivery_issue',
          'other',
        ]),
      ).optional().default([]),
      customReason: z.preprocess(sanitizeMultilineText, z.string().max(600)).optional().default(''),
    }),
  ).min(1).max(30),
})
