import { z } from 'zod'
import { ACCEPTED_COUNTRIES } from '@/lib/user/accepted-countries'
import {
  EMAIL_TWO_STEP_METHOD,
  SMS_TWO_STEP_METHOD,
} from '@/lib/auth/account-security'

const emailSchema = z.string().email().max(255)
const passwordSchema = z.string().min(8).max(128)
export const PASSWORD_MISMATCH_MESSAGE = 'The passwords you entered do not match.'

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})

export const signupSchema = loginSchema
  .extend({
    confirmPassword: passwordSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: PASSWORD_MISMATCH_MESSAGE,
    path: ['confirmPassword'],
  })

export const vendorSignupSchema = signupSchema.extend({
  brandName: z.string().trim().min(2).max(120),
})

export const vendorOnboardingEmailSchema = z.object({
  email: emailSchema,
})

export const authEmailLookupSchema = z.object({
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
  shippingCountry: z.enum(ACCEPTED_COUNTRIES),
})

export const emailCodeSchema = z.object({
  code: z.string().trim().min(4).max(12),
})

export const recoveryAccessStartSchema = z.object({
  accountEmail: emailSchema,
  recoveryEmail: emailSchema,
})

export const recoveryAccessCompleteSchema = recoveryAccessStartSchema.extend({
  question: z.string().trim().min(1).max(120),
  answer: z.string().trim().min(1).max(200),
})

export const emailChangeRequestSchema = z.object({
  newEmail: emailSchema,
})

export const securitySettingsSchema = z.object({
  recoveryEmail: emailSchema.optional().or(z.literal('')),
  phoneNumber: z.string().trim().max(30).optional().or(z.literal('')),
  twoStepMethod: z
    .enum([EMAIL_TWO_STEP_METHOD, SMS_TWO_STEP_METHOD, 'none', 'auth_app'])
    .optional()
    .or(z.literal('')),
})
