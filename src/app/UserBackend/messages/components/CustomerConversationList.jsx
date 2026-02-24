'use client'

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
]
const HELP_CENTER_VIRTUAL_CONVERSATION_ID = '__help_center__'
const HELP_CENTER_PREVIEW = 'Ask your question and we will help you'
const EMPTY_CHAT_PREVIEW = 'No messages yet.'

const getInitials = (name) =>
  String(name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'S'

const HelpCenterLogo = ({ className = 'h-5 w-5' }) => (
  <svg className={`${className} text-[#f5d10b]`} viewBox='0 0 24 24' fill='currentColor' aria-hidden='true'>
    <circle cx='12' cy='3.2' r='2.2' />
    <circle cx='12' cy='20.8' r='2.2' />
    <circle cx='3.2' cy='12' r='2.2' />
    <circle cx='20.8' cy='12' r='2.2' />
    <circle cx='6.3' cy='6.3' r='2.2' />
    <circle cx='17.7' cy='17.7' r='2.2' />
    <circle cx='17.7' cy='6.3' r='2.2' />
    <circle cx='6.3' cy='17.7' r='2.2' />
  </svg>
)

const VerifiedBadge = () => (
  <svg viewBox='0 0 24 24' className='h-4 w-4 shrink-0' fill='none' aria-hidden='true'>
    <path
      d='M12 2.8l2.2 1.3 2.6-.2 1.3 2.2 2.2 1.3-.2 2.6 1.3 2.2-1.3 2.2.2 2.6-2.2 1.3-1.3 2.2-2.6-.2L12 21.2l-2.2-1.3-2.6.2-1.3-2.2-2.2-1.3.2-2.6L2.8 12l1.3-2.2-.2-2.6 2.2-1.3 1.3-2.2 2.6.2L12 2.8Z'
      fill='#c4b5fd'
      stroke='#60a5fa'
      strokeWidth='0.8'
    />
    <path d='m8.4 12.1 2.1 2.1 5-5' stroke='#fff' strokeWidth='1.7' strokeLinecap='round' strokeLinejoin='round' />
  </svg>
)

export default function CustomerConversationList({
  conversations,
  selectedConversationId,
  onSelectConversation,
  showHelpCenter = true,
  helpCenterConversation = null,
  searchValue,
  onSearchChange,
  activeFilter,
  onFilterChange,
}) {
  const isHelpCenterActive =
    showHelpCenter && String(selectedConversationId || '').trim() === HELP_CENTER_VIRTUAL_CONVERSATION_ID

  const hasHelpCenterMessages =
    Boolean(helpCenterConversation?.id) &&
    String(helpCenterConversation?.lastMessagePreview || '').trim().length > 0 &&
    String(helpCenterConversation?.lastMessagePreview || '').trim().toLowerCase() !==
      HELP_CENTER_PREVIEW.toLowerCase() &&
    String(helpCenterConversation?.lastMessagePreview || '').trim().toLowerCase() !==
      EMPTY_CHAT_PREVIEW.toLowerCase()
  const helpCenterPreviewText = hasHelpCenterMessages
    ? String(helpCenterConversation?.lastMessagePreview || '').trim()
    : HELP_CENTER_PREVIEW
  const helpCenterUnreadCount = Number(helpCenterConversation?.unreadCount || 0)
  const helpCenterLastMessageAtLabel = String(helpCenterConversation?.lastMessageAtLabel || '').trim()

  return (
    <aside className='flex h-full min-h-0 flex-col border-r border-slate-200 bg-white'>
      <div className='border-b border-slate-200 p-3'>
        <label className='flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 text-slate-500'>
          <svg viewBox='0 0 24 24' className='h-4 w-4 text-slate-400' fill='none' stroke='currentColor' strokeWidth='1.8'>
            <circle cx='11' cy='11' r='6' />
            <path d='m15.5 15.5 4 4' />
          </svg>
          <input
            type='search'
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder='Search conversations'
            className='w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none'
          />
        </label>

        <div className='mt-2 flex items-center gap-2 overflow-x-auto pb-1'>
          {FILTER_TABS.map((tab) => {
            const isActive = tab.key === activeFilter
            return (
              <button
                key={tab.key}
                type='button'
                onClick={() => onFilterChange(tab.key)}
                className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition ${
                  isActive
                    ? 'border-slate-300 bg-slate-900 text-white'
                    : 'border-slate-200 bg-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className='min-h-0 flex-1 overflow-y-auto'>
        {showHelpCenter ? (
          <div className='border-b border-slate-100'>
            <button
              type='button'
              onClick={() => onSelectConversation(HELP_CENTER_VIRTUAL_CONVERSATION_ID)}
              className={`flex w-full items-start gap-3 px-3 py-3 text-left transition ${
                isHelpCenterActive ? 'bg-slate-100' : 'hover:bg-slate-50'
              }`}
            >
              <span className='inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white'>
                <HelpCenterLogo className='h-5 w-5' />
              </span>
              <span className='min-w-0 flex-1'>
                <span className='flex items-center justify-between gap-2'>
                  <span className='flex min-w-0 items-center gap-1'>
                    <span className='truncate text-sm font-semibold text-slate-900'>Help Center</span>
                    <VerifiedBadge />
                  </span>
                  {helpCenterLastMessageAtLabel ? (
                    <span className='shrink-0 text-[11px] text-slate-400'>{helpCenterLastMessageAtLabel}</span>
                  ) : null}
                </span>
                <span className='mt-0.5 block truncate text-[11px] font-medium uppercase tracking-wide text-slate-500'>OCPRIMES</span>
                <span className='mt-1 flex items-center gap-2'>
                  <span className='block truncate text-xs text-slate-500'>{helpCenterPreviewText}</span>
                  {helpCenterUnreadCount > 0 ? (
                    <span className='inline-flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[11px] font-semibold text-white'>
                      {helpCenterUnreadCount}
                    </span>
                  ) : null}
                </span>
              </span>
            </button>
          </div>
        ) : null}

        {conversations.length === 0 ? (
          <div className='px-4 py-8 text-center text-sm text-slate-400'>No chats found.</div>
        ) : (
          <div className='divide-y divide-slate-100'>
            {conversations.map((conversation) => {
              const isActive = selectedConversationId === conversation.id
              return (
                <button
                  key={conversation.id}
                  type='button'
                  onClick={() => onSelectConversation(conversation.id)}
                  className={`flex w-full items-start gap-3 px-3 py-3 text-left transition ${
                    isActive ? 'bg-slate-100' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className='inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700'>
                    {getInitials(conversation.sellerName)}
                  </span>
                  <span className='min-w-0 flex-1'>
                    <span className='flex items-center justify-between gap-2'>
                      <span className='truncate text-sm font-semibold text-slate-900'>{conversation.sellerName}</span>
                      <span className='shrink-0 text-[11px] text-slate-400'>{conversation.lastMessageAtLabel}</span>
                    </span>
                    <span className='mt-1 flex items-center gap-2'>
                      <span className='truncate text-xs text-slate-500'>{conversation.lastMessagePreview}</span>
                      {conversation.unreadCount > 0 ? (
                        <span className='inline-flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[11px] font-semibold text-white'>
                          {conversation.unreadCount}
                        </span>
                      ) : null}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </aside>
  )
}
