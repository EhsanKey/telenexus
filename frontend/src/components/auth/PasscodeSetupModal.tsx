'use client';

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { apiFetch, setDashboardToken } from '@/lib/api-client';
import type { DashboardUnlockResponseData } from '@/types/auth';

interface PasscodeSetupModalProps {
  isOpen: boolean;
  onSuccess: () => void;
}

export function PasscodeSetupModal({
  isOpen,
  onSuccess,
}: PasscodeSetupModalProps) {
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [showConfirmPasscode, setShowConfirmPasscode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (passcode.length < 4) {
      setErrorMsg('Master passcode must be at least 4 characters.');
      return;
    }

    if (passcode !== confirmPasscode) {
      setErrorMsg('Passcodes do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch<DashboardUnlockResponseData>(
        '/auth/setup-passcode',
        {
          method: 'POST',
          body: JSON.stringify({ passcode }),
        }
      );

      if (res.token) {
        setDashboardToken(res.token);
      }
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to setup master passcode.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md bg-[#161F30] border border-slate-700 rounded-2xl shadow-2xl p-6 text-slate-100 relative">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-sky-500/20">
            🛡️
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">
              Set Master Dashboard Passcode
            </h2>
            <p className="text-xs text-slate-400">
              Protect your workspace across multiple devices
            </p>
          </div>
        </div>

        <div className="p-3 bg-sky-950/40 border border-sky-800/40 rounded-xl text-xs text-sky-200 leading-relaxed mb-4">
          Your Telegram account is connected on the server. To prevent other browsers or devices from accessing your messages and CRM data, set a master passcode.
        </div>

        {errorMsg && (
          <div className="mb-4 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Master Passcode (min 4 characters)
            </label>
            <div className="relative">
              <input
                type={showPasscode ? 'text' : 'password'}
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="••••••••"
                autoFocus
                required
                className="w-full bg-[#0B0E14] border border-slate-700 rounded-lg pl-3.5 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPasscode(!showPasscode)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 transition focus:outline-none"
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
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Confirm Master Passcode
            </label>
            <div className="relative">
              <input
                type={showConfirmPasscode ? 'text' : 'password'}
                value={confirmPasscode}
                onChange={(e) => setConfirmPasscode(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-[#0B0E14] border border-slate-700 rounded-lg pl-3.5 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPasscode(!showConfirmPasscode)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 transition focus:outline-none"
                title={showConfirmPasscode ? 'Hide passcode' : 'Show passcode'}
                aria-label={showConfirmPasscode ? 'Hide passcode' : 'Show passcode'}
              >
                {showConfirmPasscode ? (
                  <EyeOff className="w-4 h-4 text-sky-400" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !passcode || !confirmPasscode}
            className="w-full py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 font-medium text-xs text-white shadow-lg shadow-sky-500/20 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Configuring Security...
              </>
            ) : (
              'Save Passcode & Access Workspace'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
