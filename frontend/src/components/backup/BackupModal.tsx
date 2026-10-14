'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch, ApiClientError } from '@/lib/api-client';
import type {
  DriveStatusDto,
  BackupRecordDto,
  BackupPreviewDto,
  RestoreResultDto,
} from '@/types/backup';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestoreComplete?: () => void;
}

export function BackupModal({ isOpen, onClose, onRestoreComplete }: BackupModalProps) {
  const [driveStatus, setDriveStatus] = useState<DriveStatusDto | null>(null);
  const [backups, setBackups] = useState<BackupRecordDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Preview / Restore state
  const [previewData, setPreviewData] = useState<BackupPreviewDto | null>(null);
  const [previewingBackupId, setPreviewingBackupId] = useState<string | null>(null);
  const [previewPassphrase, setPreviewPassphrase] = useState('');
  const [restoreInProgress, setRestoreInProgress] = useState(false);

  // Load status and backups list
  const loadBackupData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [status, list] = await Promise.all([
        apiFetch<DriveStatusDto>('/backups/drive/status'),
        apiFetch<BackupRecordDto[]>('/backups'),
      ]);
      setDriveStatus(status);
      setBackups(list);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Failed to load backup status from backend.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Listen for Google Drive OAuth Popup callback message
  useEffect(() => {
    function handleOAuthMessage(event: MessageEvent) {
      if (event.data?.type === 'GOOGLE_DRIVE_AUTH_RESULT') {
        if (event.data.success) {
          loadBackupData();
          setSuccessMsg('Google Drive connected successfully!');
          setErrorMsg(null);
        } else {
          setErrorMsg(event.data.error || 'Failed to authenticate Google Drive.');
          setSuccessMsg(null);
        }
        setActionLoading(false);
      }
    }

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [loadBackupData]);

  useEffect(() => {
    if (isOpen) {
      loadBackupData();
      setErrorMsg(null);
      setSuccessMsg(null);
      setPreviewData(null);
      setPreviewingBackupId(null);

      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const driveError = params.get('drive_error');
        const driveConnected = params.get('drive_connected');
        if (driveError) {
          setErrorMsg(decodeURIComponent(driveError));
          window.history.replaceState({}, '', window.location.pathname);
        } else if (driveConnected) {
          setSuccessMsg('Google Drive connected successfully!');
          window.history.replaceState({}, '', window.location.pathname);
        }
      }
    }
  }, [isOpen, loadBackupData]);

  // Connect Google Drive
  async function handleConnectDrive() {
    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const { authUrl } = await apiFetch<{ authUrl: string }>('/backups/drive/auth-url');
      if (authUrl && authUrl.includes('accounts.google.com')) {
        const width = 560;
        const height = 660;
        const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
        const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);
        const popup = window.open(
          authUrl,
          'TeleNexusGoogleDriveAuth',
          `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`
        );
        if (!popup || popup.closed || typeof popup.closed === 'undefined') {
          // If popup is blocked by browser, fallback to standard redirect
          window.location.href = authUrl;
        }
        return;
      }
      throw new Error('Google OAuth credentials are not properly configured.');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to connect Google Drive.');
      setActionLoading(false);
    }
  }

  // Disconnect Google Drive
  async function handleDisconnectDrive() {
    if (!confirm('Are you sure you want to disconnect Google Drive?')) return;
    setActionLoading(true);
    setErrorMsg(null);
    try {
      await apiFetch<{ disconnected: boolean }>('/backups/drive/disconnect', {
        method: 'POST',
      });
      setDriveStatus((prev) =>
        prev ? { ...prev, isConnected: false, email: null } : null
      );
      setSuccessMsg('Google Drive disconnected.');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to disconnect Google Drive.');
    } finally {
      setActionLoading(false);
    }
  }

  // Trigger Backup Creation
  async function handleCreateBackup() {
    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const newRecord = await apiFetch<BackupRecordDto>('/backups', {
        method: 'POST',
        body: JSON.stringify({ passphrase: passphrase.trim() || undefined }),
      });
      setBackups((prev) => [newRecord, ...prev]);
      setDriveStatus((prev) =>
        prev ? { ...prev, lastBackupAt: newRecord.createdAt } : null
      );
      setPassphrase('');
      setSuccessMsg(
        `Backup created successfully! Encrypted with AES-256-GCM (${newRecord.profilesCount} profiles, ${newRecord.tagsCount} tags).`
      );
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Failed to create backup.');
      }
    } finally {
      setActionLoading(false);
    }
  }

  // Sync CRM Excel with Google Drive
  async function handleSyncExcel() {
    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await apiFetch<{
        success: boolean;
        syncedProfilesCount: number;
        fileName: string;
        syncedAt: string;
      }>('/backups/sync-excel', {
        method: 'POST',
      });
      setSuccessMsg(
        `Google Drive Excel file updated successfully! (${res.syncedProfilesCount} contacts in ${res.fileName})`
      );
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update Excel file in Google Drive.');
    } finally {
      setActionLoading(false);
    }
  }

  // Direct Excel Download
  function handleDownloadExcel() {
    const link = document.createElement('a');
    link.href = '/api/backend/backups/excel/download';
    link.setAttribute('download', 'TeleNexus-CRM-Contacts.xlsx');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Request Backup Preview (Diff calculation)
  async function handleRequestPreview(backupId: string) {
    setPreviewingBackupId(backupId);
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const preview = await apiFetch<BackupPreviewDto>(`/backups/${backupId}/preview`, {
        method: 'POST',
        body: JSON.stringify({ passphrase: previewPassphrase.trim() || undefined }),
      });
      setPreviewData(preview);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMsg(`Preview error: ${err.message}`);
      } else {
        setErrorMsg('Failed to preview backup.');
      }
    } finally {
      setActionLoading(false);
    }
  }

  // Execute Safe Restoration
  async function handleExecuteRestore(backupId: string) {
    if (!confirm('Execute transactional restoration? Existing profiles and tags will be merged.')) {
      return;
    }
    setRestoreInProgress(true);
    setErrorMsg(null);
    try {
      const result = await apiFetch<RestoreResultDto>(`/backups/${backupId}/restore`, {
        method: 'POST',
        body: JSON.stringify({ passphrase: previewPassphrase.trim() || undefined }),
      });
      setSuccessMsg(
        `Restoration successful! Restored ${result.restoredProfilesCount} profiles and ${result.restoredTagsCount} tags.`
      );
      setPreviewData(null);
      setPreviewingBackupId(null);
      setPreviewPassphrase('');
      if (onRestoreComplete) {
        onRestoreComplete();
      }
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMsg(`Restore failed: ${err.message}`);
      } else {
        setErrorMsg('Restoration failed.');
      }
    } finally {
      setRestoreInProgress(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#111827] border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Google Drive Backup & Disaster Recovery</h2>
              <p className="text-xs text-slate-400">
                AES-256-GCM Encrypted CRM Backups (SPEC-07)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition p-1.5 rounded-lg hover:bg-slate-800"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Notifications */}
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center justify-between">
              <span>{errorMsg}</span>
              <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">✕</button>
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center justify-between">
              <span>{successMsg}</span>
              <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">✕</button>
            </div>
          )}

          {/* Section 1: Google Drive Account Status */}
          <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  driveStatus?.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                }`}
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white">
                    {driveStatus?.isConnected ? 'Google Drive Connected' : 'Google Drive Disconnected'}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 font-mono">
                    drive.file
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {driveStatus?.isConnected ? (
                    <>Account: <span className="text-slate-200">{driveStatus.email}</span></>
                  ) : (
                    'Connect your Google Account with least-privilege scope'
                  )}
                  {driveStatus?.lastBackupAt && (
                    <span className="ml-3 text-slate-500">
                      • Last backup: {new Date(driveStatus.lastBackupAt).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div>
              {driveStatus?.isConnected ? (
                <button
                  type="button"
                  onClick={handleDisconnectDrive}
                  disabled={actionLoading}
                  className="px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition border border-rose-900/50"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectDrive}
                  disabled={actionLoading}
                  className="px-3 py-1.5 text-xs bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition font-medium shadow-sm"
                >
                  {actionLoading ? 'Connecting...' : 'Connect Drive'}
                </button>
              )}
            </div>
          </div>

          {/* Section 2: Google Drive Excel CRM Sheet (Export & Live Update) */}
          <div className="p-4 bg-gradient-to-br from-[#121c2d] to-[#0d1522] rounded-xl border border-sky-900/60 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">📊</span>
                <div>
                  <h3 className="text-xs font-semibold text-white">Google Drive Excel Sheet (Live Export)</h3>
                  <p className="text-[10px] text-slate-400 font-mono">TeleNexus-CRM-Contacts.xlsx</p>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
                Unidirectional Push
              </span>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              Contacts, original names, notes, and tags are exported and updated in Google Drive automatically on app launch and whenever profiles change. TeleNexus is the authoritative source—your database is never overwritten by Google Sheets.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleSyncExcel}
                disabled={actionLoading || !driveStatus?.isConnected}
                className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition flex items-center gap-1.5 shadow-sm"
              >
                {actionLoading ? 'Updating...' : '📤 Update Drive Excel Now'}
              </button>
              <button
                type="button"
                onClick={handleDownloadExcel}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition border border-slate-700 flex items-center gap-1.5"
              >
                📥 Download Excel (.xlsx)
              </button>
            </div>
          </div>

          {/* Section 3: Create Encrypted Backup Card */}
          <div className="p-4 bg-gradient-to-br from-slate-900 to-slate-900/60 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">Create Encrypted Backup</span>
              <span className="text-[10px] text-slate-400 font-mono">Format v1.0.0</span>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] text-slate-400">
                Optional Custom Passphrase (AES-256-GCM derivation):
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showPassphrase ? 'text' : 'password'}
                    placeholder="Leave blank to use default master secret"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassphrase(!showPassphrase)}
                    className="absolute right-2.5 top-2.5 text-[10px] text-slate-500 hover:text-slate-300"
                  >
                    {showPassphrase ? 'Hide' : 'Show'}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleCreateBackup}
                  disabled={actionLoading || !driveStatus?.isConnected}
                  className="px-4 py-2 bg-[#0088CC] hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition flex items-center gap-1.5 shadow-sm"
                >
                  {actionLoading ? (
                    <>
                      <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Backing up...
                    </>
                  ) : (
                    <>
                      <span>Backup Now</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Zero Message Persistence Banner */}
            <div className="p-2.5 bg-emerald-950/20 border border-emerald-800/30 rounded-lg text-[10px] text-emerald-400 leading-relaxed flex items-start gap-2">
              <span className="font-bold text-emerald-300">🔒 INVARIANT:</span>
              <span>
                Backups contain <strong>ONLY</strong> application-owned metadata (profiles, notes, tags, social links).
                Under no circumstances are Telegram chat messages, media, or session credentials exported.
              </span>
            </div>
          </div>

          {/* Section 3: Pre-Restoration Preview Drawer */}
          {previewData && (
            <div className="p-4 bg-sky-950/20 border border-sky-800/50 rounded-xl space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-sky-900/40 pb-2">
                <span className="text-xs font-semibold text-sky-300">
                  Restoration Preview & Conflict Analysis
                </span>
                <button
                  onClick={() => {
                    setPreviewData(null);
                    setPreviewingBackupId(null);
                  }}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  ✕ Close
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Total Profiles</span>
                  <span className="text-sm font-bold text-white">{previewData.profilesCount}</span>
                </div>
                <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Existing Matches</span>
                  <span className="text-sm font-bold text-emerald-400">{previewData.matchingProfilesCount}</span>
                </div>
                <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">New Profiles</span>
                  <span className="text-sm font-bold text-sky-400">{previewData.newProfilesCount}</span>
                </div>
                <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Tags Catalog</span>
                  <span className="text-sm font-bold text-amber-400">{previewData.tagsCount}</span>
                </div>
              </div>

              {previewData.previewProfiles.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400">Sample Records in Archive:</span>
                  <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                    {previewData.previewProfiles.map((p, idx) => (
                      <div
                        key={idx}
                        className="px-2.5 py-1 bg-slate-900/80 rounded border border-slate-800 text-[11px] flex items-center justify-between"
                      >
                        <span className="text-white font-medium">{p.name}</span>
                        <span className="text-slate-400 text-[10px]">
                          {p.company || 'No Company'} • {p.tags.join(', ') || 'No tags'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between border-t border-sky-900/40">
                <span className="text-[10px] text-slate-400">
                  Strategy: <strong>Safe Merge</strong> (Preserves local records, updates conflicts)
                </span>
                <button
                  type="button"
                  onClick={() => previewingBackupId && handleExecuteRestore(previewingBackupId)}
                  disabled={restoreInProgress}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition shadow-sm disabled:opacity-50"
                >
                  {restoreInProgress ? 'Restoring...' : 'Confirm & Restore'}
                </button>
              </div>
            </div>
          )}

          {/* Section 4: Backup History Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Available Backups</span>
              <button
                type="button"
                onClick={loadBackupData}
                disabled={loading}
                className="text-[11px] text-sky-400 hover:text-sky-300"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500 animate-pulse">
                Loading Google Drive backups...
              </div>
            ) : backups.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
                No backups found. Click &quot;Backup Now&quot; to create your first encrypted backup.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {backups.map((bk) => (
                  <div
                    key={bk.id}
                    className="p-3 bg-slate-900/70 hover:bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between text-xs transition"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">
                          {bk.metadata?.fileName || `Backup ${bk.id.substring(0, 8)}`}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-mono">
                          {bk.status}
                        </span>
                        {bk.metadata?.isEncryptedWithPassphrase && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400">
                            🔑 Passphrase
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(bk.createdAt).toLocaleString()} • {bk.profilesCount} profiles • {bk.tagsCount} tags
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleRequestPreview(bk.id)}
                        disabled={actionLoading}
                        className="px-2.5 py-1 text-[11px] text-sky-400 hover:bg-sky-500/10 rounded transition border border-sky-800/60"
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExecuteRestore(bk.id)}
                        disabled={restoreInProgress}
                        className="px-2.5 py-1 text-[11px] text-emerald-400 hover:bg-emerald-500/10 rounded transition border border-emerald-800/60"
                      >
                        Restore
                      </button>
                      <a
                        href={`/api/backend/backups/${bk.id}/download`}
                        download
                        className="px-2 py-1 text-[11px] text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
                        title="Download .sotbkp"
                      >
                        ⬇
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between text-[11px] text-slate-500">
          <span>AES-256-GCM + PBKDF2 Key Derivation</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
