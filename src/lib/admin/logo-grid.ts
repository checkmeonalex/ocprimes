import { z } from 'zod'

export const logoItemSchema = z.object({
  id: z.string().uuid().optional(),
  image_url: z.string().url().min(1),
  image_key: z.string().max(500).nullable().optional(),
  image_alt: z.string().max(300).nullable().optional(),
})

export const logoGridSchema = z.object({
  title: z.string().max(120).nullable().optional(),
  title_bg_color: z.string().max(32).nullable().optional(),
  title_text_color: z.string().max(32).nullable().optional(),
  items: z.array(logoItemSchema).max(60).default([]),
})
