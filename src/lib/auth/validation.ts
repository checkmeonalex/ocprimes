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
