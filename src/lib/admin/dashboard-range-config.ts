export const DASHBOARD_RANGE_OPTIONS = [
  { key: '24h', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: 'all', label: 'All time' },
] as const

export type DashboardRangeKey = (typeof DASHBOARD_RANGE_OPTIONS)[number]['key']

export const DEFAULT_DASHBOARD_RANGE: DashboardRangeKey = '24h'
