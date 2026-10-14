'use client';

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { apiFetch, setDashboardToken } from '@/lib/api-client';
import type { DashboardUnlockResponseData } from '@/types/auth';

interface DashboardLockScreenProps {
  onUnlockSuccess: () => void;
  onResetSession?: () => void;
}

export function DashboardLockScreen({
  onUnlockSuccess,
  onResetSession,
}: DashboardLockScreenProps) {
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (!passcode) return;

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiFetch<DashboardUnlockResponseData>('/auth/unlock', {
        method: 'POST',
        body: JSON.stringify({ passcode }),
      });

      if (res.token) {
        setDashboardToken(res.token);
      }
      onUnlockSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid master passcode. Access denied.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetSession() {
    const confirm = window.confirm(
      'Disconnecting will terminate the Telegram session on the server and completely reset the master passcode. Proceed?'
    );
    if (!confirm) return;

    setLoading(true);
    try {
      await apiFetch('/auth/disconnect', { method: 'POST' });
      setDashboardToken(null);
      if (onResetSession) {
        onResetSession();
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to disconnect session.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0E14] p-4 select-none">
      <div className="w-full max-w-sm bg-[#161F30] border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100 flex flex-col items-center text-center relative overflow-hidden backdrop-blur-xl">
        {/* Glow Accent */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Lock Icon Badge */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/25 mb-4 text-2xl font-bold">
          🔒
        </div>

        <h2 className="text-lg font-bold text-white tracking-wide">
          TeleNexus Dashboard
        </h2>
        <p className="text-xs text-slate-400 mt-1 mb-5">
          Enter your master passcode to unlock this device.
        </p>

        {errorMsg && (
          <div className="w-full mb-4 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs animate-shake">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleUnlock} className="w-full space-y-3.5">
          <div className="relative">
            <input
              type={showPasscode ? 'text' : 'password'}
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Enter Master Passcode"
              autoFocus
              required
              className="w-full bg-[#0B0E14] border border-slate-700 focus:border-sky-500 rounded-xl pl-10 pr-10 py-3 text-center text-base tracking-widest text-white placeholder-slate-500 focus:outline-none transition shadow-inner font-mono"
            />
            <button
              type="button"
              onClick={() => setShowPasscode(!showPasscode)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-200 transition focus:outline-none"
              title={showPasscode ? 'Hide passcode' : 'Show passcode'}
              aria-label={showPasscode ? 'Hide passcode' : 'Show passcode'}
            >
              {showPasscode ? (
                <EyeOff className="w-4 h-4 text-sky-400" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || !passcode}
            className="w-full py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-medium text-xs shadow-lg shadow-sky-500/20 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Unlocking...
              </>
            ) : (
              'Unlock Workspace'
            )}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-800/80 w-full flex flex-col items-center gap-2">
          <p className="text-[11px] text-slate-500">
            MTProto session remains active on server.
          </p>
          <button
            type="button"
            onClick={handleResetSession}
            className="text-[11px] text-rose-400/80 hover:text-rose-300 transition hover:underline"
          >
            Disconnect Telegram & Reset Passcode
          </button>
        </div>
      </div>
    </div>
  );
}
