'use client';

import React from 'react';
import type { DialogItem, DialogCategory } from '@/types/telegram';
import { PAGINATION_DEFAULTS } from '@/lib/constants';
import {
  Search,
  RotateCw,
  X,
  User,
  Users,
  Radio,
  Sparkles,
  Tag as TagIcon,
  Archive,
  ShieldCheck,
  MessageCircle,
} from 'lucide-react';

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
  const categories: { key: DialogCategory; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'All', icon: <MessageCircle className="w-3 h-3" /> },
    { key: 'crm', label: 'In CRM', icon: <Sparkles className="w-3 h-3 text-emerald-400" /> },
    { key: 'pv', label: 'Private (PV)', icon: <User className="w-3 h-3" /> },
    { key: 'groups', label: 'Groups', icon: <Users className="w-3 h-3" /> },
    { key: 'channels', label: 'Channels', icon: <Radio className="w-3 h-3" /> },
  ];

  const [refreshCooldown, setRefreshCooldown] = React.useState(false);

  const handleRefreshClick = () => {
    if (loading || refreshCooldown) return;
    setRefreshCooldown(true);
    onRefresh(true);
    setTimeout(() => {
      setRefreshCooldown(false);
    }, 3000);
  };

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
    <div className="w-[340px] shrink-0 bg-[#0F172A]/90 backdrop-blur-md border-r border-slate-800/80 flex flex-col h-full overflow-hidden select-none">
      {/* Header & Quick Category Tabs */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-900/40">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs tracking-wider uppercase text-slate-300">
              Directory
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800/90 text-slate-400 font-mono font-medium border border-slate-700/50">
              {dialogs.length}
            </span>
          </div>

          <button
            type="button"
            onClick={handleRefreshClick}
            title={refreshCooldown ? 'Please wait a moment before refreshing...' : 'Refresh Contacts & Metadata from MTProto'}
            disabled={loading || refreshCooldown}
            className="p-1.5 rounded-lg bg-slate-800/70 hover:bg-slate-700/80 text-slate-300 hover:text-sky-300 disabled:opacity-50 transition border border-slate-700/50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-400' : ''}`} />
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => onCategoryChange(cat.key)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-sm shadow-sky-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-950/30">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search contacts, @usernames, ID..."
            className="w-full bg-slate-900/90 border border-slate-700/70 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500/80 focus:ring-1 focus:ring-sky-500/30 transition shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Assigned Tags Filter Bar (SPEC-06 §4.2) */}
      {tags.length > 0 && onTagSelect && (
        <div className="px-3 py-2 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-[11px] bg-slate-900/50 no-scrollbar">
          <TagIcon className="w-3 h-3 text-slate-500 shrink-0" />
          <button
            type="button"
            onClick={() => onTagSelect(null)}
            className={`px-2 py-0.5 rounded-full transition whitespace-nowrap text-[10px] font-medium ${
              selectedTagId === null
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
            }`}
          >
            All Tags
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
                className={`px-2 py-0.5 rounded-full border transition whitespace-nowrap text-[10px] font-medium flex items-center gap-1 ${
                  isSelected ? 'shadow-sm' : 'bg-transparent hover:bg-slate-800/60'
                }`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: isSelected ? '#ffffff' : tag.color }}
                />
                {tag.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Contacts Scroll List with Infinite Scroll (SPEC-03) */}
      <div
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-2 space-y-1.5 select-none"
      >
        {loading && dialogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 space-y-2">
            <span className="inline-block w-5 h-5 border-2 border-sky-400/20 border-t-sky-400 rounded-full animate-spin" />
            <p className="text-slate-300 font-medium">Syncing directory...</p>
            <p className="text-[11px] text-slate-500">Retrieving contacts from Telegram MTProto</p>
          </div>
        ) : dialogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-xs space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 shadow-inner">
              <User className="w-6 h-6 text-slate-600" />
            </div>
            <p className="text-slate-300 font-medium">No contacts match</p>
            <p className="text-[11px] text-slate-500 max-w-[200px]">
              {searchQuery
                ? `No contacts match "${searchQuery}" in this view.`
                : 'No contacts found in this category.'}
            </p>
            {searchQuery && activeCategory !== 'all' && (
              <button
                type="button"
                onClick={() => onCategoryChange('all')}
                className="mt-2 px-3 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/40 text-sky-300 text-[11px] transition border border-sky-500/30 flex items-center gap-1.5 font-medium"
              >
                <Search className="w-3 h-3" /> Search in All
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
              const hasCustomData = Boolean(dialog.customProfile?.customDisplayName || dialog.customProfile?.hasNotes);

              return (
                <div
                  key={dialog.id}
                  onClick={() => onSelect(dialog)}
                  className={`relative p-3 rounded-xl cursor-pointer transition-all duration-150 border text-left group ${
                    isSelected
                      ? 'bg-gradient-to-r from-sky-950/50 to-slate-900/80 border-sky-500/60 shadow-lg shadow-sky-500/10'
                      : 'bg-slate-900/40 border-slate-800/60 hover:bg-slate-800/50 hover:border-slate-700/80'
                  }`}
                >
                  {/* Active selection bar indicator */}
                  {isSelected && (
                    <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-gradient-to-b from-sky-400 to-indigo-500" />
                  )}

                  <div className="flex items-start gap-2.5">
                    {/* Entity Avatar Badge */}
                    <div className="relative shrink-0 mt-0.5">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-md ${
                          isUser
                            ? 'bg-gradient-to-tr from-sky-600 to-blue-500'
                            : isSupergroup
                            ? 'bg-gradient-to-tr from-teal-600 to-emerald-500'
                            : isGroup
                            ? 'bg-gradient-to-tr from-indigo-600 to-purple-500'
                            : 'bg-gradient-to-tr from-amber-600 to-orange-500'
                        }`}
                      >
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-slate-900 border border-slate-700">
                        {isUser && <User className="w-2.5 h-2.5 text-sky-400" />}
                        {isSupergroup && <Users className="w-2.5 h-2.5 text-teal-400" />}
                        {isGroup && <Users className="w-2.5 h-2.5 text-indigo-400" />}
                        {isChannel && <Radio className="w-2.5 h-2.5 text-amber-400" />}
                      </div>
                    </div>

                    {/* Contact Content */}
                    <div className="flex-1 min-w-0">
                      {/* Name & Origin Badges */}
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className={`text-xs font-semibold truncate ${isSelected ? 'text-white' : 'text-slate-200 group-hover:text-white'}`}>
                          {displayName}
                        </span>

                        <div className="flex items-center gap-1 shrink-0">
                          {/* CRM Active Indicator */}
                          {hasCustomData && (
                            <span
                              title="Personal CRM metadata active"
                              className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 font-mono font-medium border border-emerald-500/30 flex items-center gap-0.5"
                            >
                              <Sparkles className="w-2.5 h-2.5" />
                              CRM
                            </span>
                          )}

                          {dialog.isArchived && (
                            <span
                              title="Archived in Telegram"
                              className="text-[8px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20"
                            >
                              <Archive className="w-2 h-2 inline mr-0.5" />
                              Archived
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Sub-header: Username / Peer ID / Original Name */}
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
                        {dialog.username ? (
                          <span className="text-sky-400 font-mono text-[10px] truncate">
                            @{dialog.username}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px] flex items-center gap-1">
                            <span className="text-slate-500 font-mono text-[9px]">ID: {dialog.telegramPeerId}</span>
                          </span>
                        )}

                        {dialog.customProfile?.customDisplayName && (
                          <>
                            <span className="text-slate-600">•</span>
                            <span className="text-[10px] text-slate-400 truncate max-w-[100px]" title={`Telegram Name: ${dialog.displayName}`}>
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
                              className="text-[9px] px-1.5 py-0.2 rounded border font-medium truncate max-w-[100px]"
                            >
                              {t.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Transient Preview (Ephemeral Telegram Message) */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <p className="truncate text-[10px] text-slate-400 flex-1 pr-2 italic">
                          {dialog.transientPreview.text}
                        </p>
                        {dialog.transientPreview.unreadCount > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 text-[9px] font-bold text-white shrink-0 shadow-sm shadow-sky-500/30">
                            {dialog.transientPreview.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Infinite Scroll Loaders */}
            {loadingMore && (
              <div className="py-3 text-center text-xs text-sky-400 flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-sky-400/20 border-t-sky-400 rounded-full animate-spin" />
                <span className="text-[11px]">Loading older contacts...</span>
              </div>
            )}

            {!hasMore && dialogs.length > 0 && (
              <div className="py-2.5 text-center text-[10px] text-slate-500 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-slate-600" />
                <span>All {dialogs.length} contacts loaded from MTProto</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
