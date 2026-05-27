export type WeightedSignal = {
  id: string
  weight: number
}

export type PersonalizationSignals = {
  categories: WeightedSignal[]
  tags: WeightedSignal[]
  brands: WeightedSignal[]
  attributes: WeightedSignal[]
}

export type PersonalizationProduct = {
  categories?: Array<{ slug?: string; name?: string }>
  tags?: Array<{ slug?: string; name?: string }>
  brands?: Array<{ slug?: string; name?: string }>
  variations?: Array<{ attributes?: Record<string, string> | null }>
}
