type PresenceInput = {
  lastActiveAt?: string | null
  nowMs?: number
}

type SellerResponseInput = {
  isOnline: boolean
  averageResponseMinutes: number | null
  lastActiveAt?: string | null
  nowMs?: number
}

type ResponseSample = {
  senderUserId?: string | null
  createdAt?: string | null
}

const ONLINE_WINDOW_MS = 5 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000
const LONG_TIME_DAYS = 90
const RECENTLY_ACTIVE_WINDOW_MS = 2 * DAY_MS

const toDateMs = (value: string | null | undefined) => {
  const parsed = new Date(String(value || ''))
  const ms = parsed.getTime()
  if (Number.isNaN(ms)) return null
  return ms
}

const pluralize = (count: number, singular: string, plural: string) =>
  count === 1 ? singular : plural

export const getLastSeenLabel = ({ lastActiveAt, nowMs = Date.now() }: PresenceInput) => {
  const lastActiveMs = toDateMs(lastActiveAt || null)
  if (!lastActiveMs) {
    return {
      isOnline: false,
      label: 'Last seen recently',
    }
  }

  const elapsedMs = Math.max(0, nowMs - lastActiveMs)
  if (elapsedMs <= ONLINE_WINDOW_MS) {
    return {
      isOnline: true,
      label: 'Online',
    }
  }

  if (elapsedMs <= DAY_MS) {
    return {
      isOnline: false,
      label: 'Last seen recently',
    }
  }

  const elapsedDays = Math.floor(elapsedMs / DAY_MS)
  if (elapsedDays < 3) {
    return {
      isOnline: false,
      label: 'Last seen recently',
    }
  }

  if (elapsedDays > LONG_TIME_DAYS) {
    return {
      isOnline: false,
      label: 'Last seen a long time ago',
    }
  }

  return {
    isOnline: false,
    label: `Last seen ${elapsedDays} ${pluralize(elapsedDays, 'day', 'days')} ago`,
  }
}

export const getSellerResponseLabel = ({
  isOnline,
  averageResponseMinutes,
  lastActiveAt,
  nowMs = Date.now(),
}: SellerResponseInput) => {
  if (isOnline) return 'Online'
  if (averageResponseMinutes == null || Number.isNaN(averageResponseMinutes)) {
    const lastActiveMs = toDateMs(lastActiveAt || null)
    if (lastActiveMs && Math.max(0, nowMs - lastActiveMs) <= RECENTLY_ACTIVE_WINDOW_MS) {
      return 'Recently active'
    }
    return ''
  }
  if (averageResponseMinutes < 60) return 'Usually responds within a few minutes'
  if (averageResponseMinutes < 24 * 60) return 'Usually responds within a few hours'
  return 'Usually responds within a few days'
}

export const calculateAverageSellerResponseMinutes = ({
  messages,
  customerUserId,
  vendorUserId,
}: {
  messages: ResponseSample[]
  customerUserId: string
  vendorUserId: string
}) => {
  const normalizedCustomerId = String(customerUserId || '').trim()
  const normalizedVendorId = String(vendorUserId || '').trim()
  if (!normalizedCustomerId || !normalizedVendorId) return null

  let pendingCustomerMessageAt: number | null = null
  const deltas: number[] = []

  for (const message of messages) {
    const senderUserId = String(message?.senderUserId || '').trim()
    const createdAtMs = toDateMs(message?.createdAt || null)
    if (!senderUserId || createdAtMs == null) continue

    if (senderUserId === normalizedCustomerId) {
      if (pendingCustomerMessageAt == null) {
        pendingCustomerMessageAt = createdAtMs
      }
      continue
    }

    if (senderUserId === normalizedVendorId && pendingCustomerMessageAt != null) {
      const deltaMs = createdAtMs - pendingCustomerMessageAt
      if (deltaMs >= 0) {
        deltas.push(deltaMs / (60 * 1000))
      }
      pendingCustomerMessageAt = null
    }
  }

  if (!deltas.length) return null
  const sum = deltas.reduce((acc, value) => acc + value, 0)
  return sum / deltas.length
}
