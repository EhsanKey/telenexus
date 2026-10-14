'use client';

import React from 'react';
import type { DialogItem, DialogCategory } from '@/types/telegram';
import { PAGINATION_DEFAULTS } from '@/lib/constants';

interface ConversationListProps {
  dialogs: DialogItem[];
  selectedId: string | null;
  onSelect: (dialog: DialogItem) => void;
  activeCategory: DialogCategory;
  onCategoryChange: (category: DialogCategory) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  loading: boolean;
  onRefresh: (bypassCache?: boolean) => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  tags?: Array<{ id: string; name: string; color: string }>;
  selectedTagId?: string | null;
  onTagSelect?: (tagId: string | null) => void;
}

export function ConversationList({
  dialogs,
  selectedId,
  onSelect,
  activeCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  loading,
  onRefresh,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  tags = [],
  selectedTagId = null,
  onTagSelect,
}: ConversationListProps) {
  const categories: { key: DialogCategory; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pv', label: 'PV' },
    { key: 'groups', label: 'Groups' },
    { key: 'channels', label: 'Channels' },
  ];

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (
      target.scrollHeight - target.scrollTop - target.clientHeight <
      PAGINATION_DEFAULTS.SCROLL_THRESHOLD_PX
    ) {
      if (hasMore && !loadingMore && !loading && onLoadMore) {
        onLoadMore();
      }
    }
  };

  return (
    <div className="w-[340px] shrink-0 bg-[#161F30] border-r border-slate-800 flex flex-col h-full overflow-hidden">
      {/* Category Filter Tabs */}
      <div className="p-2 border-b border-slate-800 flex items-center justify-between gap-1 overflow-x-auto text-[11px] no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat.key}
            type="button"
            onClick={() => onCategoryChange(cat.key)}
            className={`flex-1 text-center px-2 py-1.5 rounded-md font-medium transition whitespace-nowrap ${
              activeCategory === cat.key
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Search Bar & Refresh Action */}
      <div className="p-3 border-b border-slate-800 flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search your chats, groups, channels, @usernames..."
            className="w-full bg-slate-900/90 border border-slate-700/80 rounded-md pl-3 pr-7 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1.5 text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => onRefresh(true)}
          title="Refresh Dialogs"
          disabled={loading}
          className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-50 text-xs"
        >
          {loading ? '⟳' : '↻'}
        </button>
      </div>

      {/* Assigned Tags Filter Bar (SPEC-06) */}
      {tags.length > 0 && onTagSelect && (
        <div className="px-2.5 py-1.5 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-[10px] bg-slate-900/30">
          <span className="text-slate-500 shrink-0 font-medium">Tag:</span>
          <button
            type="button"
            onClick={() => onTagSelect(null)}
            className={`px-2 py-0.5 rounded-full transition whitespace-nowrap ${
              selectedTagId === null
                ? 'bg-slate-700 text-white font-medium'
                : 'text-slate-400 hover:text-slate-200 bg-slate-800/50'
            }`}
          >
            All
          </button>
          {tags.map((tag) => {
            const isSelected = selectedTagId === tag.id;
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => onTagSelect(isSelected ? null : tag.id)}
                style={
                  isSelected
                    ? { backgroundColor: tag.color, color: '#ffffff' }
                    : { borderColor: `${tag.color}40`, color: tag.color }
                }
                className={`px-2 py-0.5 rounded-full border transition whitespace-nowrap font-medium ${
                  isSelected ? 'shadow-sm' : 'bg-transparent hover:bg-slate-800/60'
                }`}
              >
                {tag.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Dialogs Scroll List with Infinite Scroll (SPEC-03) */}
      <div
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-2 space-y-1.5"
      >
        {loading && dialogs.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            <span className="inline-block animate-spin mr-2">⟳</span> Loading dialogs...
          </div>
        ) : dialogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-xs">
            <span className="text-2xl mb-2">💬</span>
            <p className="text-slate-300 font-medium">No conversations found</p>
            <p className="text-[11px] text-slate-500 mt-1">
              {searchQuery
                ? `No results match "${searchQuery}" in this tab.`
                : 'No conversations found in this category.'}
            </p>
            {searchQuery && activeCategory !== 'all' && (
              <button
                type="button"
                onClick={() => onCategoryChange('all')}
                className="mt-3 px-3 py-1 rounded-md bg-sky-600/30 hover:bg-sky-600/50 text-sky-300 text-[11px] transition border border-sky-500/30 flex items-center gap-1 font-medium"
              >
                🔍 Search in All Categories
              </button>
            )}
          </div>
        ) : (
          <>
            {dialogs.map((dialog) => {
              const isSelected = selectedId === dialog.id;
              const displayName =
                dialog.customProfile?.customDisplayName || dialog.displayName;

              const isSupergroup = dialog.entityType === 'supergroup';
              const isGroup = dialog.entityType === 'group';
              const isChannel = dialog.entityType === 'channel';
              const isUser = dialog.entityType === 'user';

              return (
                <div
                  key={dialog.id}
                  onClick={() => onSelect(dialog)}
                  className={`p-2.5 rounded-xl cursor-pointer transition border text-left ${
                    isSelected
                      ? 'bg-slate-800/90 border-sky-500/70 shadow-md shadow-sky-500/5'
                      : 'bg-slate-900/40 border-slate-800/60 hover:bg-slate-800/50 hover:border-slate-700/80'
                  }`}
                >
                  {/* Header Row: Name & Badges */}
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 truncate">
                      {/* Entity Avatar Badge */}
                      <div
                        className={`w-5 h-5 rounded-md text-[9px] flex items-center justify-center font-bold text-white shrink-0 ${
                          isUser
                            ? 'bg-blue-600'
                            : isSupergroup
                            ? 'bg-teal-600'
                            : isGroup
                            ? 'bg-emerald-600'
                            : 'bg-purple-600'
                        }`}
                      >
                        {isUser ? 'U' : isSupergroup ? 'SG' : isGroup ? 'G' : 'C'}
                      </div>
                      <span className="text-xs font-semibold text-slate-200 truncate">
                        {displayName}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Archived Badge */}
                      {dialog.isArchived && (
                        <span
                          title="Archived in Telegram"
                          className="text-[8px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20"
                        >
                          📁 Archived
                        </span>
                      )}

                      {/* Supergroup Badge */}
                      {isSupergroup && (
                        <span className="text-[8px] px-1 py-0.2 rounded bg-teal-500/10 text-teal-400 font-semibold border border-teal-500/20">
                          Supergroup
                        </span>
                      )}

                      {/* Profile Indicator Badge */}
                      {dialog.customProfile ? (
                        <span
                          title="Custom CRM profile attached"
                          className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono border border-emerald-500/20"
                        >
                          CRM
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Sub-header: Username / Type & Peer ID */}
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
                    {dialog.username ? (
                      <span className="text-sky-400 font-mono text-[10px]">
                        @{dialog.username}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[10px] flex items-center gap-1.5">
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700/60 font-medium">
                          {isChannel
                            ? 'Private Channel'
                            : isUser
                            ? 'Private Contact'
                            : 'Private Group'}
                        </span>
                        <span className="font-mono text-slate-500 text-[9px]">ID: {dialog.telegramPeerId}</span>
                      </span>
                    )}
                    {dialog.customProfile?.customDisplayName && (
                      <>
                        <span>•</span>
                        <span className="text-[10px] text-slate-400 truncate" title={`Original Name: ${dialog.displayName}`}>
                          ({dialog.displayName})
                        </span>
                      </>
                    )}
                  </div>

                  {/* Assigned Tags Chips */}
                  {dialog.customProfile?.tags && dialog.customProfile.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {dialog.customProfile.tags.map((t) => (
                        <span
                          key={t.id}
                          style={{
                            borderColor: `${t.color}40`,
                            backgroundColor: `${t.color}15`,
                            color: t.color,
                          }}
                          className="text-[9px] px-1.5 py-0.2 rounded border font-medium truncate max-w-[120px]"
                        >
                          {t.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Transient Preview Text (Non-Persistent) */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <p className="truncate text-[11px] text-slate-400 flex-1 pr-2">
                      {dialog.transientPreview.text}
                    </p>
                    {dialog.transientPreview.unreadCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-sky-500 text-[9px] font-bold text-white shrink-0">
                        {dialog.transientPreview.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Infinite Scroll Indicators */}
            {loadingMore && (
              <div className="py-3 text-center text-xs text-sky-400 flex items-center justify-center gap-2">
                <span className="w-3 h-3 border-2 border-sky-400/20 border-t-sky-400 rounded-full animate-spin" />
                Loading more conversations...
              </div>
            )}

            {!hasMore && dialogs.length > 0 && (
              <div className="py-2.5 text-center text-[10px] text-slate-500">
                All conversations loaded ({dialogs.length})
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
