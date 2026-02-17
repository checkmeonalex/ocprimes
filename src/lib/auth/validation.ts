import { z } from 'zod'

const emailSchema = z.string().email().max(255)
const passwordSchema = z.string().min(8).max(128)

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})

export const signupSchema = loginSchema
  .extend({
    confirmPassword: passwordSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

export const vendorSignupSchema = signupSchema.extend({
  brandName: z.string().trim().min(2).max(120),
})

export const vendorOnboardingEmailSchema = z.object({
  email: emailSchema,
})

export const vendorOnboardingVerifySchema = z.object({
  email: emailSchema,
  code: z.string().trim().min(4).max(12),
})

export const vendorOnboardingBrandSchema = z.object({
  brandName: z.string().trim().min(2).max(120),
})

export const vendorOnboardingSubmitSchema = z.object({
  phone: z.string().trim().min(7).max(20),
  fullName: z.string().trim().min(2).max(120),
  brandName: z.string().trim().min(2).max(120),
  shippingCountry: z.string().trim().min(2).max(120),
})
