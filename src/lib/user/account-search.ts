type SearchSignal = {
  text: string
  weight: number
}

type AccountSearchDocument = {
  label: string
  href: string
  summary: string
  priority: number
  requiresVendorAccess?: boolean
  signals: SearchSignal[]
}

export type AccountSearchSuggestion = {
  label: string
  href: string
  summary: string
  matchedTerms: string[]
  score: number
}

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'at',
  'for',
  'from',
  'how',
  'i',
  'in',
  'is',
  'me',
  'my',
  'of',
  'on',
  'or',
  'the',
  'to',
  'want',
  'where',
  'with',
])

const normalize = (value: unknown) => String(value || '').trim().toLowerCase()

const tokenize = (value: string) =>
  normalize(value)
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token))

const ACCOUNT_SEARCH_DOCUMENTS: AccountSearchDocument[] = [
  {
    label: 'Account Center',
    href: '/UserBackend',
    summary: 'Dashboard overview and quick access to your account pages.',
    priority: 0,
    signals: [
      { text: 'account center dashboard account home', weight: 20 },
      { text: 'customer section menu shortcuts', weight: 14 },
    ],
  },
  {
    label: 'Messages',
    href: '/UserBackend/messages',
    summary: 'Chat with sellers and contact Help Center support.',
    priority: 1,
    signals: [
      { text: 'messages conversation chat inbox send message', weight: 22 },
      { text: 'help center customer support customer care order support', weight: 28 },
      { text: 'seller conversation unread message', weight: 18 },
    ],
  },
  {
    label: 'Notifications',
    href: '/UserBackend/notifications',
    summary: 'View new alerts, updates, and account activity.',
    priority: 2,
    signals: [
      { text: 'notifications alerts updates new earlier mark as read', weight: 22 },
      { text: 'notification center account activity', weight: 16 },
    ],
  },
  {
    label: 'Your profile',
    href: '/UserBackend/profile',
    summary: 'Manage personal details, country, phone, and profile photo.',
    priority: 3,
    signals: [
      { text: 'profile personal details first name nickname avatar photo', weight: 24 },
      { text: 'country select country phone whatsapp number contact info', weight: 32 },
      { text: 'save profile additional information interests', weight: 16 },
    ],
  },
  {
    label: 'Your orders',
    href: '/UserBackend/orders',
    summary: 'Track orders, view status, reorder items, and get support.',
    priority: 4,
    signals: [
      { text: 'orders order history order type reorder status delivery', weight: 26 },
      { text: 'return request support request invoice payment shipping', weight: 18 },
    ],
  },
  {
    label: 'Wishlist',
    href: '/UserBackend/wishlist',
    summary: 'Create lists, save items, and manage wishlist collections.',
    priority: 5,
    signals: [
      { text: 'wishlist wish list saved items favorites', weight: 24 },
      { text: 'create list delete list invite collaborators', weight: 16 },
    ],
  },
  {
    label: 'Your reviews',
    href: '/UserBackend/reviews',
    summary: 'See all your product reviews and review media.',
    priority: 6,
    signals: [
      { text: 'reviews review rating posted reviews', weight: 24 },
      { text: 'review images review videos search your reviews', weight: 16 },
    ],
  },
  {
    label: 'Browsing history',
    href: '/UserBackend/browsing-history',
    summary: 'Review products you recently browsed.',
    priority: 7,
    signals: [
      { text: 'browsing history recently viewed viewed products', weight: 22 },
      { text: 'history previously seen items', weight: 14 },
    ],
  },
  {
    label: 'Followed stores',
    href: '/UserBackend/followed-stores',
    summary: 'Manage the stores you follow and latest picks.',
    priority: 8,
    signals: [
      { text: 'followed stores manage stores follow brands', weight: 24 },
      { text: 'latest picks previews', weight: 12 },
    ],
  },
  {
    label: 'Addresses',
    href: '/UserBackend/addresses',
    summary: 'Manage shipping and billing addresses for checkout.',
    priority: 9,
    signals: [
      { text: 'address book addresses shipping billing delivery', weight: 30 },
      { text: 'country city state postal code street apartment', weight: 34 },
      { text: 'default address set as default add billing address', weight: 18 },
    ],
  },
  {
    label: 'Account & security',
    href: '/UserBackend/account-security',
    summary: 'Update recovery email, phone, 2FA, and security question.',
    priority: 10,
    signals: [
      { text: 'account security security settings protection privacy', weight: 30 },
      { text: 'recovery email recovery codes phone number two step 2fa', weight: 32 },
      { text: 'security question password reset verify password', weight: 26 },
    ],
  },
  {
    label: 'Shop Access',
    href: '/UserBackend/shop-access',
    summary: 'Request vendor or admin access for store management.',
    priority: 11,
    signals: [
      { text: 'shop access upgrade vendor admin seller', weight: 24 },
      { text: 'access request manage catalog inventory settings', weight: 16 },
    ],
  },
  {
    label: 'Shop dashboard',
    href: '/backend/admin/dashboard',
    summary: 'Open the vendor/admin dashboard.',
    priority: 12,
    requiresVendorAccess: true,
    signals: [
      { text: 'shop dashboard vendor dashboard seller dashboard admin dashboard', weight: 20 },
    ],
  },
]

const scoreDocument = (document: AccountSearchDocument, query: string) => {
  const tokens = tokenize(query)
  if (!tokens.length) {
    return { score: -1, matchedTerms: [] as string[] }
  }

  const normalizedLabel = normalize(document.label)
  const normalizedSummary = normalize(document.summary)
  const signalTexts = document.signals.map((signal) => ({
    text: normalize(signal.text),
    weight: signal.weight,
  }))

  let score = 0
  const matchedTerms = new Set<string>()

  if (normalizedLabel === normalize(query)) score += 120
  if (normalizedLabel.includes(normalize(query))) score += 60
  if (normalizedSummary.includes(normalize(query))) score += 42

  for (const token of tokens) {
    let tokenScore = 0
    if (normalizedLabel.includes(token)) tokenScore = Math.max(tokenScore, 36)
    if (normalizedSummary.includes(token)) tokenScore = Math.max(tokenScore, 22)
    for (const signal of signalTexts) {
      if (signal.text.includes(token)) {
        tokenScore = Math.max(tokenScore, signal.weight)
      }
    }
    if (tokenScore > 0) {
      matchedTerms.add(token)
      score += tokenScore
    }
  }

  const coverage = matchedTerms.size / tokens.length
  if (coverage < 0.5) {
    return { score: -1, matchedTerms: [] as string[] }
  }

  score += Math.round(coverage * 40)
  return { score, matchedTerms: Array.from(matchedTerms) }
}

export const getAccountSearchSuggestions = ({
  query,
  hasVendorAccess = false,
  limit = 8,
}: {
  query?: string
  hasVendorAccess?: boolean
  limit?: number
} = {}): AccountSearchSuggestion[] => {
  const normalizedQuery = normalize(query)
  if (!normalizedQuery) return []

  return ACCOUNT_SEARCH_DOCUMENTS
    .filter((document) => !document.requiresVendorAccess || hasVendorAccess)
    .map((document) => {
      const { score, matchedTerms } = scoreDocument(document, normalizedQuery)
      return {
        label: document.label,
        href: document.href,
        summary: document.summary,
        matchedTerms,
        score,
        priority: document.priority,
      }
    })
    .filter((item) => item.score >= 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.priority - b.priority
    })
    .slice(0, limit)
    .map(({ priority, ...suggestion }) => suggestion)
}
