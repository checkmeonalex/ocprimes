import { z } from 'zod'
import { MAX_SEARCH_SUGGESTION_LIMIT, normalizeSearchQuery } from './utils'

export const searchSuggestionsQuerySchema = z.object({
  q: z.string().trim().max(120).default(''),
  limit: z.coerce.number().int().min(1).max(MAX_SEARCH_SUGGESTION_LIMIT).default(6),
})

export const searchSuggestionsRecordSchema = z.object({
  query: z.string().trim().min(2).max(120),
})

export const normalizeSearchSuggestionsInput = (value: unknown) =>
  normalizeSearchQuery(value)
