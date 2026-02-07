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
  interests: z.preprocess(trimmed, z.string().max(200).optional().or(z.literal(''))),
  additionalInfo: z.preprocess(trimmed, z.string().max(500).optional().or(z.literal(''))),
  security: z
    .object({
      recoveryEmail: z.preprocess(trimmed, z.string().email().optional().or(z.literal(''))),
      question: z.preprocess(trimmed, z.string().max(120).optional().or(z.literal(''))),
      answer: z.preprocess(trimmed, z.string().max(200).optional().or(z.literal(''))),
    })
    .optional(),
})
