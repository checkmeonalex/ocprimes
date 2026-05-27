import { z } from 'zod'
import { parseWeightedSignals } from '@/lib/personalization/signal-utils'

const weightedSignalSchema = z.object({
  id: z.string().min(1).max(80),
  weight: z.coerce.number().int().min(1).max(50),
})

const signalListSchema = z.preprocess(
  parseWeightedSignals,
  z.array(weightedSignalSchema).max(40),
)

export const personalizationSignalsSchema = z.object({
  visited_categories: signalListSchema.optional(),
  visited_tags: signalListSchema.optional(),
  visited_brands: signalListSchema.optional(),
  visited_attributes: signalListSchema.optional(),
})

export type PersonalizationSignalsQuery = z.infer<typeof personalizationSignalsSchema>
