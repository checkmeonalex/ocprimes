import { z } from 'zod'

const trimmed = (value: unknown) =>
  typeof value === 'string' ? value.trim() : value
const addressEntrySchema = z.object({
  id: z.preprocess(trimmed, z.string().min(1)),
  label: z.preprocess(trimmed, z.string().max(60).optional().or(z.literal(''))),
  isDefault: z.boolean().optional(),
  line1: z.preprocess(trimmed, z.string().max(120).optional().or(z.literal(''))),
  line2: z.preprocess(trimmed, z.string().max(120).optional().or(z.literal(''))),
  city: z.preprocess(trimmed, z.string().max(80).optional().or(z.literal(''))),
  state: z.preprocess(trimmed, z.string().max(80).optional().or(z.literal(''))),
  postalCode: z.preprocess(trimmed, z.string().max(20).optional().or(z.literal(''))),
  country: z.preprocess(trimmed, z.string().max(80).optional().or(z.literal(''))),
})
const addressBlockSchema = z
  .object({
    line1: z.preprocess(trimmed, z.string().max(120).optional().or(z.literal(''))),
    line2: z.preprocess(trimmed, z.string().max(120).optional().or(z.literal(''))),
    city: z.preprocess(trimmed, z.string().max(80).optional().or(z.literal(''))),
    state: z.preprocess(trimmed, z.string().max(80).optional().or(z.literal(''))),
    postalCode: z.preprocess(trimmed, z.string().max(20).optional().or(z.literal(''))),
    country: z.preprocess(trimmed, z.string().max(80).optional().or(z.literal(''))),
  })
  .optional()

export const userProfileSchema = z.object({
  firstName: z.preprocess(trimmed, z.string().min(1, 'First name is required.')),
  lastName: z.preprocess(trimmed, z.string().max(80).optional().or(z.literal(''))),
  displayName: z.preprocess(trimmed, z.string().max(120).optional().or(z.literal(''))),
  authorName: z.preprocess(trimmed, z.string().max(120).optional().or(z.literal(''))),
  slogan: z.preprocess(trimmed, z.string().max(200).optional().or(z.literal(''))),
  nickname: z.preprocess(trimmed, z.string().max(80).optional().or(z.literal(''))),
  dateOfBirth: z
    .preprocess(trimmed, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date.').optional().or(z.literal(''))),
  gender: z.preprocess(trimmed, z.string().max(40).optional().or(z.literal(''))),
  country: z.preprocess(trimmed, z.string().min(1, 'Country is required.')),
  language: z.preprocess(trimmed, z.string().max(10).optional().or(z.literal(''))),
  currency: z.preprocess(trimmed, z.string().max(10).optional().or(z.literal(''))),
  location: z.preprocess(trimmed, z.string().max(120).optional().or(z.literal(''))),
  contactInfo: z
    .object({
      phone: z.preprocess(trimmed, z.string().max(30).optional().or(z.literal(''))),
      email: z.preprocess(trimmed, z.string().email().optional().or(z.literal(''))),
      whatsapp: z.preprocess(trimmed, z.string().max(30).optional().or(z.literal(''))),
    })
    .optional(),
  deliveryAddress: addressBlockSchema,
  billingAddress: addressBlockSchema,
  addresses: z
    .array(addressEntrySchema)
    .max(5, 'You can save a maximum of 5 addresses.')
    .optional(),
  billingAddresses: z
    .array(addressEntrySchema)
    .max(5, 'You can save a maximum of 5 addresses.')
    .optional(),
  interests: z.preprocess(trimmed, z.string().max(200).optional().or(z.literal(''))),
  additionalInfo: z.preprocess(trimmed, z.string().max(500).optional().or(z.literal(''))),
  socials: z
    .object({
      website: z.preprocess(trimmed, z.string().max(240).optional().or(z.literal(''))),
      x: z.preprocess(trimmed, z.string().max(160).optional().or(z.literal(''))),
      snapchat: z.preprocess(trimmed, z.string().max(160).optional().or(z.literal(''))),
      instagram: z.preprocess(trimmed, z.string().max(160).optional().or(z.literal(''))),
      threads: z.preprocess(trimmed, z.string().max(160).optional().or(z.literal(''))),
      facebook: z.preprocess(trimmed, z.string().max(160).optional().or(z.literal(''))),
    })
    .optional(),
  notifications: z
    .object({
      emailUpdates: z.boolean().optional(),
      productReviewAlerts: z.boolean().optional(),
      securityAlerts: z.boolean().optional(),
    })
    .optional(),
  shortcuts: z
    .object({
      productDefaults: z
        .object({
          enabled: z.boolean().optional(),
          defaultTagIds: z.array(z.preprocess(trimmed, z.string().max(120))).max(50).optional(),
          defaultTagId: z.preprocess(trimmed, z.string().max(120).optional().or(z.literal(''))),
          defaultCategoryIds: z.array(z.preprocess(trimmed, z.string().max(120))).max(50).optional(),
          defaultCategoryId: z.preprocess(trimmed, z.string().max(120).optional().or(z.literal(''))),
          conditionCheck: z.preprocess(trimmed, z.string().max(80).optional().or(z.literal(''))),
          packagingStyle: z.preprocess(trimmed, z.string().max(80).optional().or(z.literal(''))),
          returnPolicy: z.preprocess(trimmed, z.string().max(80).optional().or(z.literal(''))),
        })
        .optional(),
      checkoutProgress: z
        .object({
          enabled: z.boolean().optional(),
          freeShippingThreshold: z.number().min(1).max(100000).optional(),
          cashbackThreshold: z.number().min(1).max(100000).optional(),
          cashbackPercent: z.number().min(0).max(100).optional(),
        })
        .optional(),
    })
    .optional(),
  security: z
    .object({
      recoveryEmail: z.preprocess(trimmed, z.string().email().optional().or(z.literal(''))),
      question: z.preprocess(trimmed, z.string().max(120).optional().or(z.literal(''))),
      answer: z.preprocess(trimmed, z.string().max(200).optional().or(z.literal(''))),
      phoneNumber: z.preprocess(trimmed, z.string().max(30).optional().or(z.literal(''))),
      twoStepMethod: z
        .preprocess(trimmed, z.enum(['none', 'sms', 'auth_app']).optional().or(z.literal(''))),
      recoveryCodesGeneratedAt: z
        .preprocess(trimmed, z.string().max(60).optional().or(z.literal(''))),
    })
    .optional(),
})
