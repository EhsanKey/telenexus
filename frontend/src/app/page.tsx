'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { apiFetch, apiFetchPaginated, setDashboardToken } from '@/lib/api-client';
import { AuthModal } from '@/components/auth/AuthModal';
import { DashboardLockScreen } from '@/components/auth/DashboardLockScreen';
import { PasscodeSetupModal } from '@/components/auth/PasscodeSetupModal';
import { ConversationList } from '@/components/chat/ConversationList';
import { MessageViewer } from '@/components/chat/MessageViewer';
import { CustomProfileDrawer } from '@/components/profile/CustomProfileDrawer';
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

  // SPEC-08: Desktop Three-Panel Layout & Unsaved Changes Guard State
  const [isProfileOpen, setIsProfileOpen] = useState(true);
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
    <div className="flex h-screen w-screen overflow-hidden bg-[#0B0E14] text-slate-100 font-sans">
      {/* PANEL A: Navigation Sidebar (240px) */}
      <aside className="w-[240px] shrink-0 bg-[#111827] border-r border-slate-800 flex flex-col justify-between p-4">
        <div>
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-md shadow-sky-500/20 text-xs">
              TN
            </div>
            <div>
              <h1 className="font-semibold text-sm leading-tight tracking-wide text-white">TeleNexus</h1>
              <p className="text-[11px] text-slate-400">Personal Intelligence & CRM</p>
            </div>
          </div>

          <nav className="space-y-1 text-xs">
            <button
              onClick={() => setActiveCategory('all')}
              className={`w-full px-3 py-2 rounded-md font-medium flex justify-between items-center transition text-left ${
                activeCategory === 'all'
                  ? 'bg-slate-800 text-sky-400'
                  : 'text-slate-400 hover:bg-slate-800/60'
              }`}
            >
              <span>All Dialogs</span>
              <span className="text-[10px] bg-slate-700/80 px-1.5 py-0.5 rounded text-slate-300">
                {dialogs.length}
              </span>
            </button>
            <button
              onClick={() => setActiveCategory('pv')}
              className={`w-full px-3 py-2 rounded-md transition text-left ${
                activeCategory === 'pv'
                  ? 'bg-slate-800 text-sky-400 font-medium'
                  : 'text-slate-400 hover:bg-slate-800/60'
              }`}
            >
              Private Chats (PV)
            </button>
            <button
              onClick={() => setActiveCategory('groups')}
              className={`w-full px-3 py-2 rounded-md transition text-left ${
                activeCategory === 'groups'
                  ? 'bg-slate-800 text-sky-400 font-medium'
                  : 'text-slate-400 hover:bg-slate-800/60'
              }`}
            >
              Groups
            </button>
            <button
              onClick={() => setActiveCategory('supergroups')}
              className={`w-full px-3 py-2 rounded-md transition text-left ${
                activeCategory === 'supergroups'
                  ? 'bg-slate-800 text-sky-400 font-medium'
                  : 'text-slate-400 hover:bg-slate-800/60'
              }`}
            >
              Supergroups
            </button>
            <button
              onClick={() => setActiveCategory('channels')}
              className={`w-full px-3 py-2 rounded-md transition text-left ${
                activeCategory === 'channels'
                  ? 'bg-slate-800 text-sky-400 font-medium'
                  : 'text-slate-400 hover:bg-slate-800/60'
              }`}
            >
              Channels
            </button>
            <button
              onClick={() => setActiveCategory('archived')}
              className={`w-full px-3 py-2 rounded-md transition text-left ${
                activeCategory === 'archived'
                  ? 'bg-slate-800 text-sky-400 font-medium'
                  : 'text-slate-400 hover:bg-slate-800/60'
              }`}
            >
              Archived
            </button>
          </nav>
        </div>

        <div>
          {/* Subsystem Health Indicator */}
          <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 text-[11px] space-y-1.5 mb-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Backend Core:</span>
              {loading ? (
                <span className="text-amber-400 animate-pulse">Checking...</span>
              ) : health ? (
                <span className="text-emerald-400 font-medium">● Connected (Port 4000)</span>
              ) : (
                <span className="text-rose-400 font-medium">Offline</span>
              )}
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span>Reverse Proxy:</span>
              <span className="text-sky-400">/api/backend/*</span>
            </div>
          </div>

          {/* Telegram MTProto Connection Card (SPEC-02) */}
          <div className="p-3 bg-[#0F172A] rounded-xl border border-sky-950/60 text-xs space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-300">Telegram Session</span>
              {authState === 'CONNECTED' && connectedAccount ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                  Disconnected
                </span>
              )}
            </div>

            {connectedAccount ? (
              <div className="text-[11px] text-slate-300 truncate">
                <span className="text-slate-400 block text-[10px]">Connected Account:</span>
                <strong className="text-white">{connectedAccount.displayName}</strong>{' '}
                {connectedAccount.username && (
                  <span className="text-sky-400">(@{connectedAccount.username})</span>
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
                className={`w-full py-2 px-3 rounded-lg text-xs font-medium transition shadow-sm ${
                  connectedAccount
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    : 'bg-[#0088CC] hover:bg-sky-500 text-white shadow-sky-500/20'
                }`}
              >
                {connectedAccount ? 'Manage Session' : 'Connect Telegram'}
              </button>

              {/* Master Passcode Lock Button */}
              {isPasscodeSet && connectedAccount && (
                <button
                  type="button"
                  onClick={handleLockDashboard}
                  className="w-full py-1.5 px-3 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition flex items-center justify-center gap-1.5"
                >
                  <span>🔒</span> Lock Dashboard
                </button>
              )}
            </div>
          </div>

          {/* Google Drive Backup & Recovery Trigger (SPEC-07) */}
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setBackupModalOpen(true)}
              className="w-full py-2 px-3 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-medium text-slate-300 hover:text-white transition flex items-center justify-between shadow-sm group"
            >
              <div className="flex items-center gap-2">
                <span className="text-sky-400">☁️</span>
                <span>Drive Backups</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 group-hover:bg-sky-900 font-mono">
                AES-256
              </span>
            </button>
          </div>
        </div>
      </aside>

      {/* PANEL B: Conversation List (340px) (SPEC-03) */}
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

      {/* PANEL C: Ephemeral Message Viewer & CRM Panel (SPEC-04 & SPEC-05) */}
      <main className="flex-1 flex bg-[#0B0E14] relative overflow-hidden">
        {/* Central Ephemeral Stream (SPEC-04) */}
        <section className="flex-1 flex flex-col h-full min-w-0">
          <MessageViewer
            dialog={selectedDialog}
            onRefreshMetadata={handleRefreshEntity}
            isProfileOpen={isProfileOpen}
            onToggleProfile={() => setIsProfileOpen((prev) => !prev)}
            onBackToList={() => setSelectedDialog(null)}
          />
        </section>

        {/* Right CRM Profile Drawer (360px) (SPEC-05 & SPEC-08) */}
        <CustomProfileDrawer
          dialog={selectedDialog}
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          onDirtyChange={(dirty) => setIsProfileDirty(dirty)}
          onProfileUpdated={handleProfileUpdated}
        />
      </main>

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
