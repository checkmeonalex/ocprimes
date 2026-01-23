import { z } from 'zod'

const normalizeBlank = (value: unknown) => {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(50).default(20),
  status: z.preprocess(normalizeBlank, z.enum(['publish', 'draft', 'archived']).optional()),
  search: z.preprocess(normalizeBlank, z.string().max(120).optional()),
})

const baseProductSchema = z.object({
  name: z.preprocess(normalizeBlank, z.string().min(2).max(140)),
  slug: z.preprocess(normalizeBlank, z.string().max(140).optional()),
  short_description: z.preprocess(normalizeBlank, z.string().max(500).optional()),
  description: z.preprocess(normalizeBlank, z.string().max(4000).optional()),
  price: z.coerce.number().min(0),
  discount_price: z.coerce.number().min(0).optional(),
  sku: z.preprocess(normalizeBlank, z.string().max(120).optional()),
  stock_quantity: z.coerce.number().int().min(0),
  status: z.enum(['publish', 'draft', 'archived']).optional(),
  product_type: z.enum(['simple', 'variable']).optional(),
  category_ids: z.array(z.string().uuid()).min(1),
  tag_ids: z.array(z.string().uuid()).optional(),
  brand_ids: z.array(z.string().uuid()).optional(),
  image_ids: z.array(z.string().uuid()).optional(),
  main_image_id: z.preprocess(normalizeBlank, z.string().uuid().optional()),
  variations: z
    .array(
      z.object({
        attributes: z.record(z.string(), z.string()).optional(),
        regular_price: z.preprocess(normalizeBlank, z.string().optional()),
        sale_price: z.preprocess(normalizeBlank, z.string().optional()),
        sku: z.preprocess(normalizeBlank, z.string().max(120).optional()),
        stock_quantity: z.preprocess(normalizeBlank, z.string().optional()),
        image_id: z.preprocess(normalizeBlank, z.string().uuid().optional()),
      }),
    )
    .optional(),
})

export const createProductSchema = baseProductSchema

export const updateProductSchema = baseProductSchema.partial().extend({
  id: z.string().uuid(),
})

export const productIdSchema = z.object({
  id: z.string().uuid(),
})

export const buildSlug = (value: string) => {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
  return slug
}
