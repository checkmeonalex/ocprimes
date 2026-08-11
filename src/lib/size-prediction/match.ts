export type MeasurementEstimate = {
  bustCm?: number
  waistCm?: number
  hipCm?: number
}

type SizeGuideColumn = { key: string; label: string }
type SizeGuideRow = Record<string, string>

export type MeasurementCheck = {
  field: string // 'bust' | 'waist' | 'hip'
  inRange: boolean
  direction: 'tight' | 'loose' | null // which way it misses, if it misses
}

export type SizeMatch = {
  size: string
  fitScore: number // 0-1 average across scored measurements
  confidencePct: number // fitScore rounded to a whole percent
  isPerfectFit: boolean
  checks: MeasurementCheck[]
}

export type MatchResult = {
  best: SizeMatch | null
  alternatives: SizeMatch[]
  matchedFields: string[]
}

const MEASUREMENT_KEYS: Record<string, keyof MeasurementEstimate> = {
  bust: 'bustCm',
  chest: 'bustCm',
  waist: 'waistCm',
  hip: 'hipCm',
}

const stripUnitSuffix = (key: string) => key.replace(/_(in|cm)$/i, '')

// Parses "38-40", "38 - 40", "38", "38cm" into a [min, max] numeric range.
const parseRange = (raw: string): [number, number] | null => {
  const cleaned = String(raw || '').replace(/[^\d.\-–—to]/gi, (match) => (match === '.' ? '.' : ' '))
  const numbers = cleaned.match(/\d+(\.\d+)?/g)
  if (!numbers || !numbers.length) return null
  const values = numbers.map(Number)
  if (values.length === 1) return [values[0], values[0]]
  return [Math.min(...values), Math.max(...values)]
}

const isCmColumn = (key: string) => /_cm$/i.test(key) || !/_in$/i.test(key)

// Scores how well `valueCm` fits within [min, max]: 1 = inside the range,
// decaying toward 0 the further outside it falls (5cm past the edge -> ~0).
const scoreFit = (valueCm: number, min: number, max: number) => {
  if (valueCm >= min && valueCm <= max) return 1
  const distance = valueCm < min ? min - valueCm : valueCm - max
  return Math.max(0, 1 - distance / 5)
}

export const matchSizeGuide = (
  columns: SizeGuideColumn[],
  rows: SizeGuideRow[],
  estimate: MeasurementEstimate,
): MatchResult => {
  const sizeColumn = columns.find((col) => col.key.toLowerCase() === 'size')
  if (!sizeColumn || !rows.length) {
    return { best: null, alternatives: [], matchedFields: [] }
  }

  // Which measurement columns can we actually score against, and do we
  // actually have an estimate value for them? (bust/chest, waist, hip —
  // whichever the guide defines AND the caller supplied.)
  const scorableColumns = columns.filter((col) => {
    if (col.key === sizeColumn.key) return false
    const base = stripUnitSuffix(col.key).toLowerCase()
    const measurementKey = MEASUREMENT_KEYS[base]
    if (!measurementKey || !isCmColumn(col.key)) return false
    return typeof estimate[measurementKey] === 'number'
  })

  if (!scorableColumns.length) {
    return { best: null, alternatives: [], matchedFields: [] }
  }

  const matchedFields = [...new Set(scorableColumns.map((col) => stripUnitSuffix(col.key).toLowerCase()))]

  const scored = rows
    .map((row) => {
      const size = String(row[sizeColumn.key] || '').trim()
      if (!size) return null

      let totalScore = 0
      let scoredCount = 0
      const checks: MeasurementCheck[] = []

      scorableColumns.forEach((col) => {
        const base = stripUnitSuffix(col.key).toLowerCase()
        const measurementKey = MEASUREMENT_KEYS[base]
        const range = parseRange(row[col.key])
        const valueCm = measurementKey ? estimate[measurementKey] : undefined
        if (!range || measurementKey === undefined || typeof valueCm !== 'number') return
        const [min, max] = range
        const score = scoreFit(valueCm, min, max)
        const inRange = valueCm >= min && valueCm <= max
        checks.push({
          field: base,
          inRange,
          direction: inRange ? null : valueCm < min ? 'loose' : 'tight',
        })
        totalScore += score
        scoredCount += 1
      })

      if (!scoredCount) return null

      const fitScore = totalScore / scoredCount
      return {
        size,
        fitScore,
        confidencePct: Math.round(fitScore * 100),
        isPerfectFit: checks.every((check) => check.inRange),
        checks,
      }
    })
    .filter((entry): entry is SizeMatch => entry !== null)
    .sort((a, b) => b.fitScore - a.fitScore)

  if (!scored.length) {
    return { best: null, alternatives: [], matchedFields }
  }

  const [best, ...rest] = scored
  return {
    best,
    alternatives: rest.slice(0, 3),
    matchedFields,
  }
}

// Plain-language note for an alternative size's worst-fitting measurement,
// e.g. "M may feel tight around the hips."
export const buildFitNote = (match: SizeMatch): string | null => {
  const worst = match.checks.find((check) => !check.inRange)
  if (!worst) return null
  const fieldLabel = worst.field === 'bust' ? 'the bust' : worst.field === 'hip' ? 'the hips' : 'the waist'
  const feeling = worst.direction === 'tight' ? 'tight' : 'loose'
  return `${match.size} may feel ${feeling} around ${fieldLabel}.`
}
