'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import AdminDesktopHeader from '@/components/admin/AdminDesktopHeader';
import SellerConversationList from './messages/components/SellerConversationList';
import SellerConversationThread from './messages/components/SellerConversationThread';
import SellerConversationPlaceholder from './messages/components/SellerConversationPlaceholder';
import { SELLER_CHAT_THREADS } from './messages/components/sellerChatMockData.mjs';

const FILTER_HANDLERS = {
  all: () => true,
  unread: (conversation) => conversation.unreadCount > 0,
  favorites: (conversation) => Boolean(conversation.isFavorite),
  groups: (conversation) => Boolean(conversation.isGroup),
};

const formatTimeLabel = (value) =>
  new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

export default function SellerMessagesPage() {
  const [conversations, setConversations] = useState(SELLER_CHAT_THREADS);
  const [activeConversationId, setActiveConversationId] = useState('');
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [draftMessage, setDraftMessage] = useState('');
  const [isMobileThreadOpen, setIsMobileThreadOpen] = useState(false);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  const filteredConversations = useMemo(() => {
    const safeFilterFn = FILTER_HANDLERS[activeFilter] || FILTER_HANDLERS.all;
    const normalizedQuery = searchText.trim().toLowerCase();
    return [...conversations]
      .filter((conversation) => safeFilterFn(conversation))
      .filter((conversation) => {
        if (!normalizedQuery) return true;
        const haystack = `${conversation.customerName} ${conversation.customerHandle} ${conversation.lastMessagePreview}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      })
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
  }, [activeFilter, conversations, searchText]);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) || null,
    [activeConversationId, conversations],
  );

  const selectConversation = (conversationId) => {
    setActiveConversationId(conversationId);
    setIsMobileThreadOpen(true);
    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation,
      ),
    );
  };

  const sendMessage = () => {
    const text = draftMessage.trim();
    if (!text || !activeConversationId) return;
    const now = new Date();
    const newMessage = {
      id: `seller-${now.getTime()}`,
      sender: 'seller',
      text,
      timeLabel: formatTimeLabel(now),
    };

    setConversations((previous) =>
      previous.map((conversation) => {
        if (conversation.id !== activeConversationId) return conversation;
        return {
          ...conversation,
          messages: [...conversation.messages, newMessage],
          updatedAt: now.toISOString(),
          lastMessageAtLabel: formatTimeLabel(now),
          lastMessagePreview: text,
        };
      }),
    );
    setDraftMessage('');
  };

  const showThreadOnMobile = Boolean(isMobileThreadOpen && activeConversation);

  return (
    <div className="h-[calc(100dvh-4rem)] overflow-hidden bg-white text-slate-900 lg:h-[100dvh]">
      <div className="flex h-full overflow-hidden">
        <AdminSidebar />
        <main className="flex-1 overflow-hidden px-4 sm:px-6 lg:px-10">
          <AdminDesktopHeader />
          <div className="-mx-4 h-full w-auto overflow-hidden sm:-mx-6 lg:-mx-10 lg:h-[calc(100dvh-6.5rem)]">
            <div className="grid h-full min-h-0 lg:overflow-hidden lg:rounded-2xl">
              <div className="grid h-full min-h-0 lg:grid-cols-[360px_1fr]">
                <div className={showThreadOnMobile ? 'hidden lg:block' : 'block'}>
                  <SellerConversationList
                    conversations={filteredConversations}
                    selectedConversationId={activeConversationId}
                    onSelectConversation={selectConversation}
                    searchValue={searchText}
                    onSearchChange={setSearchText}
                    activeFilter={activeFilter}
                    onFilterChange={setActiveFilter}
                  />
                </div>

                {activeConversation ? (
                  <div className={showThreadOnMobile ? 'block' : 'hidden lg:block'}>
                    <SellerConversationThread
                      conversation={activeConversation}
                      draftMessage={draftMessage}
                      onDraftMessageChange={setDraftMessage}
                      onSendMessage={sendMessage}
                      onBack={() => setIsMobileThreadOpen(false)}
                    />
                  </div>
                ) : (
                  <SellerConversationPlaceholder />
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
