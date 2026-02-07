import { z } from 'zod'

export const hotspotPointSchema = z.object({
  id: z.string().uuid().optional(),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  product_id: z.string().uuid(),
})

export const hotspotLayoutSchema = z.object({
  image_url: z.string().url().min(1),
  image_key: z.string().max(500).nullable().optional(),
  image_alt: z.string().max(300).nullable().optional(),
  hotspots: z.array(hotspotPointSchema).max(10).default([]),
})

export const hotspotLayoutRequestSchema = hotspotLayoutSchema.extend({
  layout_id: z.string().uuid().optional(),
  sort_order: z.number().int().min(0).optional(),
})
