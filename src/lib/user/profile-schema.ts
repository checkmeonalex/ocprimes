import { z } from 'zod'

const trimmed = (value: unknown) =>
  typeof value === 'string' ? value.trim() : value

export const userProfileSchema = z.object({
  firstName: z.preprocess(trimmed, z.string().min(1, 'First name is required.')),
  lastName: z.preprocess(trimmed, z.string().max(80).optional().or(z.literal(''))),
  nickname: z.preprocess(trimmed, z.string().max(80).optional().or(z.literal(''))),
  dateOfBirth: z
    .preprocess(trimmed, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date.').optional().or(z.literal(''))),
  gender: z.preprocess(trimmed, z.string().max(40).optional().or(z.literal(''))),
  country: z.preprocess(trimmed, z.string().min(1, 'Country is required.')),
  language: z.preprocess(trimmed, z.string().max(10).optional().or(z.literal(''))),
  currency: z.preprocess(trimmed, z.string().max(10).optional().or(z.literal(''))),
  contactInfo: z
    .object({
      phone: z.preprocess(trimmed, z.string().max(30).optional().or(z.literal(''))),
      email: z.preprocess(trimmed, z.string().email().optional().or(z.literal(''))),
      whatsapp: z.preprocess(trimmed, z.string().max(30).optional().or(z.literal(''))),
    })
    .optional(),
  deliveryAddress: z
    .object({
      line1: z.preprocess(trimmed, z.string().max(120).optional().or(z.literal(''))),
      line2: z.preprocess(trimmed, z.string().max(120).optional().or(z.literal(''))),
      city: z.preprocess(trimmed, z.string().max(80).optional().or(z.literal(''))),
      state: z.preprocess(trimmed, z.string().max(80).optional().or(z.literal(''))),
      postalCode: z.preprocess(trimmed, z.string().max(20).optional().or(z.literal(''))),
      country: z.preprocess(trimmed, z.string().max(80).optional().or(z.literal(''))),
    })
    .optional(),
  addresses: z
    .array(
      z.object({
        id: z.preprocess(trimmed, z.string().min(1)),
        label: z.preprocess(trimmed, z.string().max(60).optional().or(z.literal(''))),
        isDefault: z.boolean().optional(),
        line1: z.preprocess(trimmed, z.string().max(120).optional().or(z.literal(''))),
        line2: z.preprocess(trimmed, z.string().max(120).optional().or(z.literal(''))),
        city: z.preprocess(trimmed, z.string().max(80).optional().or(z.literal(''))),
        state: z.preprocess(trimmed, z.string().max(80).optional().or(z.literal(''))),
        postalCode: z.preprocess(trimmed, z.string().max(20).optional().or(z.literal(''))),
        country: z.preprocess(trimmed, z.string().max(80).optional().or(z.literal(''))),
      }),
    )
    .max(5, 'You can save a maximum of 5 addresses.')
    .optional(),
  interests: z.preprocess(trimmed, z.string().max(200).optional().or(z.literal(''))),
  additionalInfo: z.preprocess(trimmed, z.string().max(500).optional().or(z.literal(''))),
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
