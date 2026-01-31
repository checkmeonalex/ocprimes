import { z } from 'zod'

export const cartItemSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string().min(1),
  slug: z.string().optional().nullable(),
  price: z.number().nonnegative(),
  originalPrice: z.number().nonnegative().optional().nullable(),
  image: z.string().optional().nullable(),
  selectedVariationId: z.string().optional().nullable(),
  selectedVariationLabel: z.string().optional().nullable(),
  selectedColor: z.string().optional().nullable(),
  selectedSize: z.string().optional().nullable(),
  quantity: z.number().int().min(1),
})

export const cartItemsSchema = z.array(cartItemSchema)

export const cartItemUpsertSchema = cartItemSchema.extend({
  quantity: z.number().int().min(0),
})

export const cartQuantitySchema = z.object({
  quantity: z.number().int().min(0),
})
