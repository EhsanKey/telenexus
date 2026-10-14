'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import type { DialogItem, EphemeralMessage, MediaType } from '@/types/telegram';
import { apiFetchPaginated } from '@/lib/api-client';
import {
  Image,
  Video,
  Mic,
  Music,
  FileText,
  MapPin,
  Sparkles,
  Film,
  Disc,
  UserCheck,
  HelpCircle,
  CheckCheck,
  Lock,
  RefreshCw,
  MessageSquare,
  User,
  Users,
  Radio,
  ExternalLink,
  ChevronUp,
  ChevronLeft,
} from 'lucide-react';

interface MessageViewerProps {
  dialog: DialogItem | null;
  onRefreshMetadata?: (dialogId: string) => void;
  isProfileOpen?: boolean;
  onToggleProfile?: () => void;
  onBackToList?: () => void;
}

export function MessageViewer({
  dialog,
  onRefreshMetadata,
  isProfileOpen = true,
  onToggleProfile,
  onBackToList,
}: MessageViewerProps) {
  const [messages, setMessages] = useState<EphemeralMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Fetch messages transiently for selected dialog
  const fetchMessages = useCallback(async (peerId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiFetchPaginated<EphemeralMessage>(
        `/api/backend/telegram/dialogs/${peerId}/messages?limit=50`
      );

      // Invariant Check: Never persist to localStorage or sessionStorage!
      // Messages are kept strictly in React component state in volatile memory.
      // Reverse messages so they display chronologically (oldest top, newest bottom)
      const chronological = [...response.data].reverse();
      setMessages(chronological);
      setHasMore(Boolean(response.meta.hasMore));
      setNextCursor(response.meta.nextCursor || null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch ephemeral messages';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Reset and fetch messages when dialog selection changes
  useEffect(() => {
    if (!dialog) {
      setMessages([]);
      return;
    }

    fetchMessages(dialog.telegramPeerId);

    // INVARIANT: Clean up ephemeral state on unmount / dialog change
    return () => {
      setMessages([]);
    };
  }, [dialog, fetchMessages]);

  // Auto-scroll to bottom on fresh message load
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isLoading, messages.length]);

  // Keyboard shortcut Alt+P to toggle CRM profile (SPEC-08 §5.1)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.altKey && (e.key === 'p' || e.key === 'P')) ||
        (e.ctrlKey && e.shiftKey && (e.key === 'p' || e.key === 'P'))
      ) {
        e.preventDefault();
        onToggleProfile?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleProfile]);

  // Load older messages (cursor pagination)
  const handleLoadMore = async () => {
    if (!dialog || !nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const response = await apiFetchPaginated<EphemeralMessage>(
        `/api/backend/telegram/dialogs/${dialog.telegramPeerId}/messages?limit=30&offsetId=${nextCursor}`
      );
      const olderChronological = [...response.data].reverse();
      setMessages((prev) => [...olderChronological, ...prev]);
      setHasMore(Boolean(response.meta.hasMore));
      setNextCursor(response.meta.nextCursor || null);
    } catch (err: unknown) {
      console.error('Failed to load older messages:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  if (!dialog) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-slate-950/40">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-4 shadow-xl">
          <MessageSquare className="w-8 h-8 text-indigo-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-200 mb-1">
          Select a Conversation
        </h3>
        <p className="text-sm text-slate-400 max-w-sm mb-6">
          Choose a chat from the navigation panel to stream live ephemeral messages directly from Telegram MTProto.
        </p>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/40 border border-emerald-800/50 text-emerald-400 text-xs font-medium">
          <Lock className="w-3.5 h-3.5" />
          <span>Zero-Persistence Privacy Enclosure Enforced</span>
        </div>
      </div>
    );
  }

  const resolvedDisplayName = dialog.customProfile?.customDisplayName || dialog.displayName;
  const isCustomName = Boolean(dialog.customProfile?.customDisplayName);

  return (
    <div className="flex flex-col h-full bg-slate-950/60 border-x border-slate-800/80">
      {/* 1. Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 z-10">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Back Button (SPEC-08 §6) */}
          {onBackToList && (
            <button
              type="button"
              onClick={onBackToList}
              className="md:hidden p-1.5 -ml-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition"
              title="Back to conversations"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          <div className="relative">
            <div
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-bold text-white shadow-md ${
                dialog.entityType === 'user'
                  ? 'bg-gradient-to-tr from-emerald-600 to-teal-500'
                  : dialog.entityType === 'group'
                  ? 'bg-gradient-to-tr from-indigo-600 to-purple-500'
                  : 'bg-gradient-to-tr from-amber-600 to-orange-500'
              }`}
            >
              {resolvedDisplayName.charAt(0).toUpperCase()}
            </div>
            <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-slate-900 border border-slate-700">
              {dialog.entityType === 'user' && <User className="w-2.5 h-2.5 text-emerald-400" />}
              {dialog.entityType === 'group' && <Users className="w-2.5 h-2.5 text-indigo-400" />}
              {dialog.entityType === 'channel' && <Radio className="w-2.5 h-2.5 text-amber-400" />}
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-100 truncate">
                {resolvedDisplayName}
              </h2>
              {isCustomName ? (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-mono">
                  [Personal Metadata]
                </span>
              ) : (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                  [Telegram Data]
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              {dialog.username ? (
                <a
                  href={`https://t.me/${dialog.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-indigo-400 flex items-center gap-1 transition-colors"
                >
                  @{dialog.username}
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </a>
              ) : (
                <span>ID: {dialog.telegramPeerId}</span>
              )}
              <span className="text-slate-600">•</span>
              <span className="capitalize">{dialog.entityType}</span>
              {isCustomName && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-400 truncate max-w-[200px]" title={`Original Name: ${dialog.displayName}`}>
                    Original: {dialog.displayName}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onToggleProfile && (
            <button
              type="button"
              onClick={onToggleProfile}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition border shadow-sm ${
                isProfileOpen
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-sky-500/20'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700/60'
              }`}
              title="Toggle CRM Profile Panel (Alt+P)"
            >
              <User className="w-3.5 h-3.5 text-sky-400" />
              <span>Profile</span>
              <span className="text-[10px] text-slate-400 font-mono hidden sm:inline ml-0.5">Alt+P</span>
            </button>
          )}

          {onRefreshMetadata && (
            <button
              type="button"
              onClick={() => onRefreshMetadata(dialog.id)}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-slate-200 transition-colors border border-slate-700/50"
              title="Refresh contact metadata from Telegram MTProto"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* 2. Privacy Notice Banner */}
      <div className="bg-slate-900/40 border-b border-slate-800/60 px-4 py-2 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>
            <strong className="text-slate-300">Ephemeral View:</strong> Messages are transiently streamed and never persisted in database or browser storage.
          </span>
        </div>
        <span className="hidden sm:inline-block text-[11px] text-slate-500 font-mono">
          SPEC-04 Compliant
        </span>
      </div>

      {/* 3. Messages Stream */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 select-text"
      >
        {/* Load More Button */}
        {hasMore && (
          <div className="flex justify-center pt-2 pb-1">
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 text-xs font-medium transition-colors disabled:opacity-50"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              {isLoadingMore ? 'Loading history...' : 'Load earlier messages'}
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <p className="text-xs text-slate-400">Streaming transient messages from Telegram...</p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-800/50 text-rose-300 text-sm">
            <p className="font-semibold mb-1">Failed to stream messages</p>
            <p className="text-xs text-rose-400">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <MessageSquare className="w-10 h-10 text-slate-600 mb-2" />
            <p className="text-sm font-medium text-slate-300">No messages in this chat yet</p>
            <p className="text-xs text-slate-500 mt-1">Start a conversation on Telegram to view it here.</p>
          </div>
        )}

        {/* Message Bubbles */}
        {!isLoading &&
          messages.map((message, index) => {
            const isOutgoing = message.sender.isOutgoing;
            const prevMessage = messages[index - 1];
            const isDifferentDay =
              !prevMessage ||
              new Date(prevMessage.date).toDateString() !==
                new Date(message.date).toDateString();

            return (
              <React.Fragment key={message.messageId}>
                {/* Date Group Separator */}
                {isDifferentDay && (
                  <div className="flex justify-center my-4">
                    <span className="px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-[11px] font-medium text-slate-400 shadow-sm">
                      {formatMessageDate(message.date)}
                    </span>
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`flex flex-col ${
                    isOutgoing ? 'items-end' : 'items-start'
                  } group`}
                >
                  <div
                    className={`relative max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 shadow-lg transition-shadow ${
                      isOutgoing
                        ? 'bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-800 text-white rounded-tr-sm'
                        : 'bg-slate-800/90 border border-slate-700/60 text-slate-100 rounded-tl-sm'
                    }`}
                  >
                    {/* Group Sender Name for Incoming Messages */}
                    {!isOutgoing && dialog.entityType !== 'user' && (
                      <p className="text-xs font-semibold text-indigo-400 mb-1">
                        {message.sender.name}
                      </p>
                    )}

                    {/* Reply Indicator if replied to another message */}
                    {message.replyToMessageId && (
                      <div className="mb-2 pl-2 border-l-2 border-indigo-400/80 bg-black/20 rounded py-1 text-xs text-slate-300">
                        <span className="opacity-75">Reply to #{message.replyToMessageId}</span>
                      </div>
                    )}

                    {/* Media Indicator Badge */}
                    {message.mediaType && (
                      <div className="mb-2">
                        <MediaIndicatorBadge mediaType={message.mediaType} />
                      </div>
                    )}

                    {/* Text / Caption */}
                    {message.text && (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {message.text}
                      </p>
                    )}

                    {/* Timestamp & Delivery Indicator */}
                    <div
                      className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                        isOutgoing ? 'text-indigo-200/80' : 'text-slate-400'
                      }`}
                    >
                      <span>{formatMessageTime(message.date)}</span>
                      {isOutgoing && <CheckCheck className="w-3 h-3 text-indigo-300" />}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

/**
 * Renders the canonical visual badge for classified media types matching SPEC-04 §4
 */
function MediaIndicatorBadge({ mediaType }: { mediaType: MediaType }) {
  const badgeConfig: Record<
    MediaType,
    { label: string; icon: React.ReactNode; colorClass: string }
  > = {
    photo: {
      label: '[Photo]',
      icon: <Image className="w-3.5 h-3.5" />,
      colorClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
    video: {
      label: '[Video]',
      icon: <Video className="w-3.5 h-3.5" />,
      colorClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    },
    voice: {
      label: '[Voice Message]',
      icon: <Mic className="w-3.5 h-3.5" />,
      colorClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    audio: {
      label: '[Audio / Music]',
      icon: <Music className="w-3.5 h-3.5" />,
      colorClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    },
    animation: {
      label: '[Animation / GIF]',
      icon: <Film className="w-3.5 h-3.5" />,
      colorClass: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30',
    },
    sticker: {
      label: '[Sticker]',
      icon: <Sparkles className="w-3.5 h-3.5" />,
      colorClass: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    },
    video_note: {
      label: '[Video Message]',
      icon: <Disc className="w-3.5 h-3.5" />,
      colorClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    },
    document: {
      label: '[Document]',
      icon: <FileText className="w-3.5 h-3.5" />,
      colorClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    },
    location: {
      label: '[Location]',
      icon: <MapPin className="w-3.5 h-3.5" />,
      colorClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    },
    contact: {
      label: '[Contact Card]',
      icon: <UserCheck className="w-3.5 h-3.5" />,
      colorClass: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    },
    unknown: {
      label: '[Unsupported Media]',
      icon: <HelpCircle className="w-3.5 h-3.5" />,
      colorClass: 'bg-slate-700 text-slate-300 border-slate-600',
    },
  };

  const config = badgeConfig[mediaType] || badgeConfig.unknown;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${config.colorClass}`}
    >
      {config.icon}
      <span>{config.label}</span>
    </div>
  );
}

function formatMessageTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function formatMessageDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  } catch {
    return '';
  }
}
