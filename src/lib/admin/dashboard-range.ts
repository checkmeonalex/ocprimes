import { z } from 'zod'
import {
  DASHBOARD_RANGE_OPTIONS,
  DEFAULT_DASHBOARD_RANGE,
  type DashboardRangeKey,
} from './dashboard-range-config'

const DashboardRangeSchema = z.enum(
  DASHBOARD_RANGE_OPTIONS.map((option) => option.key) as [DashboardRangeKey, ...DashboardRangeKey[]],
)

type DashboardBucket = {
  key: string
  label: string
  start: Date
  end: Date
}

type DashboardResolvedRange = {
  key: DashboardRangeKey
  label: string
  windowLabel: string
  comparisonLabel: string
  currentStart: Date
  currentEnd: Date
  previousStart: Date
  previousEnd: Date
  currentBuckets: DashboardBucket[]
  previousBuckets: DashboardBucket[]
}

const startOfDay = (value = new Date()) =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate())

const shiftDays = (value: Date, delta: number) => {
  const next = new Date(value)
  next.setDate(next.getDate() + delta)
  return next
}

const shiftHours = (value: Date, delta: number) => {
  const next = new Date(value)
  next.setHours(next.getHours() + delta)
  return next
}

const formatShortDay = (value: Date) =>
  new Intl.DateTimeFormat('en-NG', { month: 'short', day: 'numeric' }).format(value)

const formatWeekday = (value: Date) =>
  new Intl.DateTimeFormat('en-NG', { weekday: 'short' }).format(value)

const formatHourLabel = (value: Date) =>
  new Intl.DateTimeFormat('en-NG', {
    hour: 'numeric',
  }).format(value)

const buildHourBuckets = (start: Date, hoursPerBucket: number, bucketCount: number) =>
  Array.from({ length: bucketCount }, (_, index) => {
    const bucketStart = shiftHours(start, index * hoursPerBucket)
    const bucketEnd = shiftHours(bucketStart, hoursPerBucket)
    return {
      key: `${bucketStart.toISOString()}-${bucketEnd.toISOString()}`,
      label: formatHourLabel(bucketStart),
      start: bucketStart,
      end: bucketEnd,
    }
  })

const buildDayBuckets = (start: Date, daysPerBucket: number, bucketCount: number, labelMode: 'weekday' | 'range') =>
  Array.from({ length: bucketCount }, (_, index) => {
    const bucketStart = shiftDays(start, index * daysPerBucket)
    const bucketEnd = shiftDays(bucketStart, daysPerBucket)
    const bucketEndDisplay = shiftDays(bucketEnd, -1)
    const label =
      labelMode === 'weekday'
        ? formatWeekday(bucketStart)
        : daysPerBucket === 1
          ? formatShortDay(bucketStart)
          : `${formatShortDay(bucketStart)} - ${formatShortDay(bucketEndDisplay)}`

    return {
      key: `${bucketStart.toISOString()}-${bucketEnd.toISOString()}`,
      label,
      start: bucketStart,
      end: bucketEnd,
    }
  })

export const parseDashboardRange = (value: unknown): DashboardRangeKey => {
  const parsed = DashboardRangeSchema.safeParse(String(value || '').trim())
  return parsed.success ? parsed.data : DEFAULT_DASHBOARD_RANGE
}

export const resolveDashboardRange = (
  value: unknown,
  now = new Date(),
): DashboardResolvedRange => {
  const key = parseDashboardRange(value)
  const option = DASHBOARD_RANGE_OPTIONS.find((entry) => entry.key === key) || DASHBOARD_RANGE_OPTIONS[DASHBOARD_RANGE_OPTIONS.length - 1]
  const todayStart = startOfDay(now)

  switch (key) {
    case '24h': {
      const currentEnd = new Date(now)
      const currentStart = shiftHours(currentEnd, -24)
      const previousEnd = currentStart
      const previousStart = shiftHours(previousEnd, -24)
      return {
        key,
        label: option.label,
        windowLabel: 'Last 24 hours',
        comparisonLabel: 'previous 24 hours',
        currentStart,
        currentEnd,
        previousStart,
        previousEnd,
        currentBuckets: buildHourBuckets(currentStart, 4, 6),
        previousBuckets: buildHourBuckets(previousStart, 4, 6),
      }
    }
    case 'yesterday': {
      const currentEnd = todayStart
      const currentStart = shiftDays(todayStart, -1)
      const previousEnd = currentStart
      const previousStart = shiftDays(previousEnd, -1)
      return {
        key,
        label: option.label,
        windowLabel: 'Yesterday',
        comparisonLabel: 'previous day',
        currentStart,
        currentEnd,
        previousStart,
        previousEnd,
        currentBuckets: buildHourBuckets(currentStart, 4, 6),
        previousBuckets: buildHourBuckets(previousStart, 4, 6),
      }
    }
    case '3d': {
      const currentStart = shiftDays(todayStart, -2)
      const currentEnd = shiftDays(todayStart, 1)
      const previousEnd = currentStart
      const previousStart = shiftDays(previousEnd, -3)
      return {
        key,
        label: option.label,
        windowLabel: 'Last 3 days',
        comparisonLabel: 'previous 3 days',
        currentStart,
        currentEnd,
        previousStart,
        previousEnd,
        currentBuckets: buildDayBuckets(currentStart, 1, 3, 'range'),
        previousBuckets: buildDayBuckets(previousStart, 1, 3, 'range'),
      }
    }
    case '7d': {
      const currentStart = shiftDays(todayStart, -6)
      const currentEnd = shiftDays(todayStart, 1)
      const previousEnd = currentStart
      const previousStart = shiftDays(previousEnd, -7)
      return {
        key,
        label: option.label,
        windowLabel: 'Last 7 days',
        comparisonLabel: 'previous 7 days',
        currentStart,
        currentEnd,
        previousStart,
        previousEnd,
        currentBuckets: buildDayBuckets(currentStart, 1, 7, 'weekday'),
        previousBuckets: buildDayBuckets(previousStart, 1, 7, 'weekday'),
      }
    }
    case '30d':
    default: {
      const currentStart = shiftDays(todayStart, -29)
      const currentEnd = shiftDays(todayStart, 1)
      const previousEnd = currentStart
      const previousStart = shiftDays(previousEnd, -30)
      return {
        key: '30d',
        label: option.label,
        windowLabel: 'Past 30 days',
        comparisonLabel: 'previous 30 days',
        currentStart,
        currentEnd,
        previousStart,
        previousEnd,
        currentBuckets: buildDayBuckets(currentStart, 5, 6, 'range'),
        previousBuckets: buildDayBuckets(previousStart, 5, 6, 'range'),
      }
    }
  }
}
