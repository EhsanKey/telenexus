'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { apiFetch, apiFetchPaginated, setDashboardToken } from '@/lib/api-client';
import { AuthModal } from '@/components/auth/AuthModal';
import { DashboardLockScreen } from '@/components/auth/DashboardLockScreen';
import { PasscodeSetupModal } from '@/components/auth/PasscodeSetupModal';
import { ConversationList } from '@/components/chat/ConversationList';
import { ContactIntelligenceHub } from '@/components/profile/ContactIntelligenceHub';
import { EphemeralChatModal } from '@/components/chat/EphemeralChatModal';
import { BackupModal } from '@/components/backup/BackupModal';
import type {
  AuthState,
  ConnectedAccount,
  AuthStatusResponseData,
  DashboardStatusResponseData,
} from '@/types/auth';
import type { DialogItem, DialogCategory } from '@/types/telegram';
import type { CustomProfileDto, TagDto } from '@/types/profile';
import { PAGINATION_DEFAULTS } from '@/lib/constants';
import {
  Shield,
  Users,
  Lock,
  Cloud,
  MessageSquare,
  Sparkles,
  RotateCw,
  FolderArchive,
  Radio,
  User,
  Key,
} from 'lucide-react';

interface HealthData {
  status: string;
  subsystem: string;
  port: number;
  invariants: {
    messagePersistence: boolean;
    strictTyping: boolean;
    universalEnvelope: boolean;
  };
  timestamp: string;
}

export default function WorkspacePage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // SPEC-02: Telegram Auth & Session State
  const [authState, setAuthState] = useState<AuthState>('DISCONNECTED');
  const [connectedAccount, setConnectedAccount] = useState<ConnectedAccount | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Master Passcode Security Layer
  const [isPasscodeSet, setIsPasscodeSet] = useState(false);
  const [isDashboardUnlocked, setIsDashboardUnlocked] = useState(true);
  const [passcodeSetupModalOpen, setPasscodeSetupModalOpen] = useState(false);

  // SPEC-07: Google Drive Backup State
  const [backupModalOpen, setBackupModalOpen] = useState(false);

  // SPEC-08: CRM Focus & Ephemeral Chat Modal State
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [isProfileDirty, setIsProfileDirty] = useState(false);

  // SPEC-03 & SPEC-06: Dialogs, Infinite Scroll & Tags State
  const [activeCategory, setActiveCategory] = useState<DialogCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [tags, setTags] = useState<TagDto[]>([]);
  const [dialogs, setDialogs] = useState<DialogItem[]>([]);
  const [selectedDialog, setSelectedDialog] = useState<DialogItem | null>(null);
  const [dialogsLoading, setDialogsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshingEntity, setRefreshingEntity] = useState(false);

  // Debounce search query (250ms) to ensure smooth typing and zero API flooding
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Global Keyboard Shortcuts (SPEC-08 §5.1 & Alt+M for Ephemeral Chat)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+M or Alt+C toggles ephemeral chat modal
      if ((e.altKey && (e.key === 'm' || e.key === 'M')) || (e.altKey && (e.key === 'c' || e.key === 'C'))) {
        e.preventDefault();
        if (selectedDialog) {
          setIsChatModalOpen((prev) => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDialog]);

  // SPEC-08 §5.3: Dialog Selection Interceptor with Unsaved Changes Guard
  const handleSelectDialog = (d: DialogItem) => {
    if (isProfileDirty) {
      const confirmDiscard = window.confirm(
        'You have unsaved changes in the profile. Discard changes and switch conversation?'
      );
      if (!confirmDiscard) return;
    }
    setSelectedDialog(d);
    setIsProfileDirty(false);
  };

  // Fetch Tags taxonomy
  const loadTags = useCallback(async () => {
    try {
      const res = await apiFetchPaginated<TagDto>('/tags');
      setTags(res.data);
    } catch {
      // Tags table might be empty or initializing
    }
  }, []);

  // Fetch Dialogs (Page 1)
  const loadDialogs = useCallback(
    async (bypassCache = false) => {
      setDialogsLoading(true);
      setPage(1);
      try {
        const qParam = debouncedSearchQuery ? `&q=${encodeURIComponent(debouncedSearchQuery)}` : '';
        const tagParam = selectedTagId ? `&tagId=${encodeURIComponent(selectedTagId)}` : '';
        const refreshParam = bypassCache === true ? '&refresh=true' : '';
        const res = await apiFetchPaginated<DialogItem>(
          `/telegram/dialogs?page=1&limit=${PAGINATION_DEFAULTS.DEFAULT_LIMIT}&category=${activeCategory}${qParam}${tagParam}${refreshParam}`
        );
        setDialogs(res.data);
        setHasMore(Boolean(res.meta?.hasMore));
        setSelectedDialog((current) => {
          if (!current && res.data.length > 0) {
            return res.data[0];
          }
          if (current) {
            const updated = res.data.find((d) => d.id === current.id);
            return updated || current;
          }
          return null;
        });
      } catch (err: unknown) {
        console.warn('Could not load dialogs:', err);
      } finally {
        setDialogsLoading(false);
      }
    },
    [activeCategory, debouncedSearchQuery, selectedTagId]
  );

  // Load More Dialogs (Infinite Scroll Pagination)
  const handleLoadMoreDialogs = async () => {
    if (dialogsLoading || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const qParam = debouncedSearchQuery ? `&q=${encodeURIComponent(debouncedSearchQuery)}` : '';
      const tagParam = selectedTagId ? `&tagId=${encodeURIComponent(selectedTagId)}` : '';
      const res = await apiFetchPaginated<DialogItem>(
        `/telegram/dialogs?page=${nextPage}&limit=${PAGINATION_DEFAULTS.DEFAULT_LIMIT}&category=${activeCategory}${qParam}${tagParam}`
      );

      if (res.data.length > 0) {
        setDialogs((prev) => {
          const existingIds = new Set(prev.map((d) => d.id));
          const fresh = res.data.filter((d) => !existingIds.has(d.id));
          return [...prev, ...fresh];
        });
        setPage(nextPage);
      }
      setHasMore(Boolean(res.meta?.hasMore));
    } catch (err) {
      console.warn('Failed to load more dialogs:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Check Dashboard Lock Status & App Status
  const refreshSecurityStatus = useCallback(async () => {
    try {
      const dashStatus = await apiFetch<DashboardStatusResponseData>('/auth/dashboard-status').catch(() => null);
      if (dashStatus) {
        setIsPasscodeSet(dashStatus.isPasscodeSet);
        setIsDashboardUnlocked(dashStatus.isUnlocked);
        if (!dashStatus.isPasscodeSet && dashStatus.telegramState === 'CONNECTED') {
          setPasscodeSetupModalOpen(true);
        }
      }
    } catch (e) {
      console.warn('Security status probe failed:', e);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    async function initStatus() {
      try {
        const [healthData, authData] = await Promise.all([
          apiFetch<HealthData>('/health'),
          apiFetch<AuthStatusResponseData>('/auth/status').catch(() => null),
        ]);
        setHealth(healthData);
        if (authData) {
          setAuthState(authData.status);
          setConnectedAccount(authData.account);
        }

        await refreshSecurityStatus();
        await loadTags();

        // Auto-update Excel CRM in Google Drive on app launch (Unidirectional push)
        apiFetch('/backups/sync-excel', { method: 'POST' }).catch(() => null);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Backend offline or unreachable');
        }
      } finally {
        setLoading(false);
      }
    }
    initStatus();
  }, [refreshSecurityStatus, loadTags]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('drive_connected') || params.get('drive_error')) {
        setBackupModalOpen(true);
      }
    }
  }, []);

  useEffect(() => {
    if (isDashboardUnlocked) {
      loadDialogs();
    }
  }, [loadDialogs, isDashboardUnlocked]);

  // Lock Dashboard Action
  async function handleLockDashboard() {
    try {
      await apiFetch('/auth/dashboard-logout', { method: 'POST' });
    } catch (err) {
      console.warn('Dashboard logout exception:', err);
    } finally {
      setDashboardToken(null);
      setIsDashboardUnlocked(false);
    }
  }

  // SPEC-03: Refresh Metadata action
  async function handleRefreshEntity() {
    if (!selectedDialog) return;
    setRefreshingEntity(true);
    try {
      const refreshed = await apiFetch<DialogItem>(
        `/telegram/refresh/${selectedDialog.id}`,
        { method: 'POST' }
      );
      setSelectedDialog(refreshed);
      setDialogs((prev) =>
        prev.map((d) => (d.id === refreshed.id ? refreshed : d))
      );
    } catch (err) {
      console.error('Failed to refresh entity metadata:', err);
    } finally {
      setRefreshingEntity(false);
    }
  }

  // SPEC-05: Update profile metadata across conversation list & active view
  function handleProfileUpdated(updatedProfile: CustomProfileDto | null) {
    if (!selectedDialog) return;

    const newCustomProfile = updatedProfile
      ? {
          id: updatedProfile.id,
          customDisplayName: updatedProfile.customDisplayName,
          hasNotes: Boolean(updatedProfile.notes),
          tagsCount: updatedProfile.tags?.length || 0,
          tags: updatedProfile.tags?.map((t) => ({ id: t.id, name: t.name, color: t.color })),
        }
      : null;

    const updatedDialog: DialogItem = {
      ...selectedDialog,
      customProfile: newCustomProfile,
    };

    setSelectedDialog(updatedDialog);
    setDialogs((prev) =>
      prev.map((d) => (d.id === updatedDialog.id ? updatedDialog : d))
    );
    loadTags();
  }

  // If dashboard is locked by master passcode, display lock screen
  if (!loading && isPasscodeSet && !isDashboardUnlocked) {
    return (
      <DashboardLockScreen
        onUnlockSuccess={() => {
          setIsDashboardUnlocked(true);
          loadDialogs();
          if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('drive_connected') || params.get('drive_error')) {
              setBackupModalOpen(true);
            }
          }
        }}
        onResetSession={() => {
          setConnectedAccount(null);
          setAuthState('DISCONNECTED');
          setIsPasscodeSet(false);
          setIsDashboardUnlocked(true);
          loadDialogs();
        }}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#080B10] text-slate-100 font-sans select-none">
      {/* ========================================================================= */}
      {/* PANEL A: Navigation Sidebar (240px) (SPEC-08 Topology Invariant: 220-260px) */}
      {/* ========================================================================= */}
      <aside className="w-[240px] shrink-0 bg-[#0B0F19] border-r border-slate-800/80 flex flex-col justify-between p-4 z-20">
        <div>
          {/* Brand Logo & TeleNexus Identity */}
          <div className="flex items-center gap-2.5 mb-6 px-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-600 to-purple-600 flex items-center justify-center font-extrabold text-white shadow-lg shadow-sky-500/20 text-sm">
              TN
            </div>
            <div>
              <h1 className="font-bold text-sm leading-tight tracking-wide text-white flex items-center gap-1.5">
                <span>TeleNexus</span>
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
              </h1>
              <p className="text-[10px] text-slate-400 font-medium tracking-tight">
                Intelligence CRM Vault
              </p>
            </div>
          </div>

          {/* Navigation Category Filters */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider px-2 block mb-1">
              Views
            </span>
            <nav className="space-y-1 text-xs">
              <button
                onClick={() => setActiveCategory('all')}
                className={`w-full px-3 py-2 rounded-xl font-medium flex justify-between items-center transition text-left ${
                  activeCategory === 'all'
                    ? 'bg-slate-800/90 text-sky-400 shadow-sm border border-slate-700/60'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>All Contacts</span>
                </div>
                <span className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded-full text-slate-400 font-mono">
                  {dialogs.length}
                </span>
              </button>

              <button
                onClick={() => setActiveCategory('crm')}
                className={`w-full px-3 py-2 rounded-xl font-medium flex justify-between items-center transition text-left ${
                  activeCategory === 'crm'
                    ? 'bg-slate-800/90 text-emerald-400 shadow-sm border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>In CRM Vault</span>
                </div>
                <span className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded-full text-emerald-400 font-mono">
                  {dialogs.filter((d) => Boolean(d.customProfile)).length}
                </span>
              </button>

              <button
                onClick={() => setActiveCategory('pv')}
                className={`w-full px-3 py-2 rounded-xl transition text-left flex items-center gap-2 ${
                  activeCategory === 'pv'
                    ? 'bg-slate-800/90 text-sky-400 font-medium shadow-sm border border-slate-700/60'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Private Chats (PV)</span>
              </button>

              <button
                onClick={() => setActiveCategory('groups')}
                className={`w-full px-3 py-2 rounded-xl transition text-left flex items-center gap-2 ${
                  activeCategory === 'groups'
                    ? 'bg-slate-800/90 text-sky-400 font-medium shadow-sm border border-slate-700/60'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Groups</span>
              </button>

              <button
                onClick={() => setActiveCategory('supergroups')}
                className={`w-full px-3 py-2 rounded-xl transition text-left flex items-center gap-2 ${
                  activeCategory === 'supergroups'
                    ? 'bg-slate-800/90 text-sky-400 font-medium shadow-sm border border-slate-700/60'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-teal-400" />
                <span>Supergroups</span>
              </button>

              <button
                onClick={() => setActiveCategory('channels')}
                className={`w-full px-3 py-2 rounded-xl transition text-left flex items-center gap-2 ${
                  activeCategory === 'channels'
                    ? 'bg-slate-800/90 text-sky-400 font-medium shadow-sm border border-slate-700/60'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Channels</span>
              </button>

              <button
                onClick={() => setActiveCategory('archived')}
                className={`w-full px-3 py-2 rounded-xl transition text-left flex items-center gap-2 ${
                  activeCategory === 'archived'
                    ? 'bg-slate-800/90 text-sky-400 font-medium shadow-sm border border-slate-700/60'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <FolderArchive className="w-3.5 h-3.5" />
                <span>Archived</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Sidebar Bottom: Session Card, Security & Cloud Sync */}
        <div className="space-y-2.5">
          {/* Subsystem Health Indicator */}
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 text-[11px] space-y-1 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">Core API:</span>
              {loading ? (
                <span className="text-amber-400 animate-pulse text-[10px]">Checking...</span>
              ) : health ? (
                <span className="text-emerald-400 font-mono text-[10px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> 4000 OK
                </span>
              ) : (
                <span className="text-rose-400 font-mono text-[10px]">Offline</span>
              )}
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span>Proxy Isolation:</span>
              <span className="text-sky-400 font-mono">/api/backend/*</span>
            </div>
          </div>

          {/* Telegram MTProto Session Card (SPEC-02) */}
          <div className="p-3 bg-gradient-to-br from-slate-900/90 to-slate-950/90 rounded-2xl border border-slate-800/90 text-xs space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-300">Telegram Session</span>
              {authState === 'CONNECTED' && connectedAccount ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium flex items-center gap-1 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                  Disconnected
                </span>
              )}
            </div>

            {connectedAccount ? (
              <div className="text-[11px] text-slate-300 truncate">
                <span className="text-slate-400 block text-[10px]">Connected as:</span>
                <strong className="text-white font-medium">{connectedAccount.displayName}</strong>{' '}
                {connectedAccount.username && (
                  <span className="text-sky-400 block font-mono text-[10px]">@{connectedAccount.username}</span>
                )}
              </div>
            ) : (
              <p className="text-[10px] text-slate-400 leading-tight">
                Connect Telegram MTProto to stream live dialogs.
              </p>
            )}

            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className={`w-full py-2 px-3 rounded-xl text-xs font-semibold transition shadow-sm ${
                  connectedAccount
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60'
                    : 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-sky-500/20'
                }`}
              >
                {connectedAccount ? 'Manage Session' : 'Connect Telegram'}
              </button>

              {/* Master Passcode Lock Button */}
              {isPasscodeSet && connectedAccount && (
                <button
                  type="button"
                  onClick={handleLockDashboard}
                  className="w-full py-1.5 px-3 rounded-xl text-xs font-medium bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition flex items-center justify-center gap-1.5"
                >
                  <Lock className="w-3 h-3 text-amber-400" />
                  <span>Lock Dashboard</span>
                </button>
              )}
            </div>
          </div>

          {/* Google Drive Backup & Recovery Trigger (SPEC-07) */}
          <button
            type="button"
            onClick={() => setBackupModalOpen(true)}
            className="w-full py-2 px-3 bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-medium text-slate-300 hover:text-white transition flex items-center justify-between shadow-sm group"
          >
            <div className="flex items-center gap-2">
              <Cloud className="w-3.5 h-3.5 text-sky-400" />
              <span>Drive Backups</span>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 group-hover:bg-sky-900 font-mono">
              AES-256
            </span>
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* PANEL B: Contact Directory List (340px) (SPEC-08 Invariant: 300-380px)   */}
      {/* ========================================================================= */}
      <ConversationList
        dialogs={dialogs}
        selectedId={selectedDialog ? selectedDialog.id : null}
        onSelect={handleSelectDialog}
        activeCategory={activeCategory}
        onCategoryChange={(cat) => setActiveCategory(cat)}
        searchQuery={searchQuery}
        onSearchChange={(q) => setSearchQuery(q)}
        loading={dialogsLoading}
        onRefresh={loadDialogs}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadMore={handleLoadMoreDialogs}
        tags={tags}
        selectedTagId={selectedTagId}
        onTagSelect={(tId) => setSelectedTagId(tId)}
      />

      {/* ========================================================================= */}
      {/* PANEL C: Central Stage: Contact Intelligence & CRM Hub (Flexible Fill)    */}
      {/* ========================================================================= */}
      <main className="flex-1 flex bg-[#080B10] relative overflow-hidden">
        <ContactIntelligenceHub
          dialog={selectedDialog}
          allDialogsCount={dialogs.length}
          tags={tags}
          onRefreshMetadata={handleRefreshEntity}
          onOpenEphemeralChat={() => setIsChatModalOpen(true)}
          onProfileUpdated={handleProfileUpdated}
          onDirtyChange={(dirty) => setIsProfileDirty(dirty)}
          onOpenBackups={() => setBackupModalOpen(true)}
          onOpenAuth={() => setAuthModalOpen(true)}
          isConnected={authState === 'CONNECTED'}
        />
      </main>

      {/* ========================================================================= */}
      {/* MODAL: Ephemeral Chat Viewer (User Priority: Compact & Modular on-demand)   */}
      {/* ========================================================================= */}
      <EphemeralChatModal
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        dialog={selectedDialog}
        onRefreshMetadata={handleRefreshEntity}
      />

      {/* Telegram MTProto Authentication Modal (SPEC-02) */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        currentState={authState}
        account={connectedAccount}
        onAuthSuccess={(acc) => {
          setConnectedAccount(acc);
          setAuthState('CONNECTED');
          refreshSecurityStatus();
          loadDialogs();
        }}
        onDisconnectSuccess={() => {
          setConnectedAccount(null);
          setAuthState('DISCONNECTED');
          setIsPasscodeSet(false);
          setDashboardToken(null);
          loadDialogs();
        }}
      />

      {/* Passcode Setup Modal */}
      <PasscodeSetupModal
        isOpen={passcodeSetupModalOpen}
        onSuccess={() => {
          setPasscodeSetupModalOpen(false);
          setIsPasscodeSet(true);
          setIsDashboardUnlocked(true);
          loadDialogs();
        }}
      />

      {/* Google Drive Backup & Recovery Modal (SPEC-07) */}
      <BackupModal
        isOpen={backupModalOpen}
        onClose={() => setBackupModalOpen(false)}
        onRestoreComplete={() => {
          loadDialogs();
          loadTags();
        }}
      />
    </div>
  );
}
