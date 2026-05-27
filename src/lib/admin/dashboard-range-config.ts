export const DASHBOARD_RANGE_OPTIONS = [
  { key: '24h', label: '24hr' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: '3d', label: '3 days' },
  { key: '7d', label: '7 days' },
  { key: '30d', label: 'Past 30 days' },
] as const

export type DashboardRangeKey = (typeof DASHBOARD_RANGE_OPTIONS)[number]['key']

export const DEFAULT_DASHBOARD_RANGE: DashboardRangeKey = '30d'
