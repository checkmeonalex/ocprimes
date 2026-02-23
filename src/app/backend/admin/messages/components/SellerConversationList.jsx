'use client';

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
];

const getInitials = (name) =>
  String(name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'C';

export default function SellerConversationList({
  conversations,
  selectedConversationId,
  onSelectConversation,
  searchValue,
  onSearchChange,
  activeFilter,
  onFilterChange,
}) {
  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-3">
        <label className="flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 text-slate-500">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="11" cy="11" r="6" />
            <path d="m15.5 15.5 4 4" />
          </svg>
          <input
            type="search"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search or start a new chat"
            className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
          />
        </label>

        <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1">
          {FILTER_TABS.map((tab) => {
            const isActive = tab.key === activeFilter;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onFilterChange(tab.key)}
                className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition ${
                  isActive
                    ? 'border-slate-300 bg-slate-900 text-white'
                    : 'border-slate-200 bg-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-400">No chats found.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {conversations.map((conversation) => {
              const isActive = selectedConversationId === conversation.id;
              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => onSelectConversation(conversation.id)}
                  className={`flex w-full items-start gap-3 px-3 py-3 text-left transition ${
                    isActive ? 'bg-slate-100' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
                    {getInitials(conversation.customerName)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-slate-900">{conversation.customerName}</span>
                      <span className="shrink-0 text-[11px] text-slate-400">{conversation.lastMessageAtLabel}</span>
                    </span>
                    <span className="mt-1 flex items-center gap-2">
                      <span className="truncate text-xs text-slate-500">{conversation.lastMessagePreview}</span>
                      {conversation.unreadCount > 0 ? (
                        <span className="inline-flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[11px] font-semibold text-white">
                          {conversation.unreadCount}
                        </span>
                      ) : null}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
