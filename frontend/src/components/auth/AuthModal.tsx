'use client';

import React, { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import type {
  AuthState,
  ConnectedAccount,
  SendPhoneResponseData,
  VerifyCodeResponseData,
  VerifyPasswordResponseData,
} from '@/types/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentState: AuthState;
  account: ConnectedAccount | null;
  onAuthSuccess: (acc: ConnectedAccount) => void;
  onDisconnectSuccess: () => void;
}

export function AuthModal({
  isOpen,
  onClose,
  currentState,
  account,
  onAuthSuccess,
  onDisconnectSuccess,
}: AuthModalProps) {
  const [step, setStep] = useState<'PHONE' | 'CODE' | 'PASSWORD' | 'CONNECTED'>('PHONE');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneCodeHash, setPhoneCodeHash] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(120);

  useEffect(() => {
    if (account && currentState === 'CONNECTED') {
      setStep('CONNECTED');
    } else {
      setStep('PHONE');
    }
    setErrorMsg(null);
  }, [isOpen, account, currentState]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'CODE' && countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  if (!isOpen) return null;

  async function handleSendPhone(e: React.FormEvent) {
    e.preventDefault();
    if (!phoneNumber.startsWith('+')) {
      setErrorMsg('Phone number must start with international code (e.g. +98 or +1)');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiFetch<SendPhoneResponseData>('/auth/phone', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber }),
      });
      setPhoneCodeHash(res.phoneCodeHash);
      setCountdown(res.timeoutSeconds || 120);
      setStep('CODE');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send verification code.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiFetch<VerifyCodeResponseData>('/auth/code', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber, phoneCodeHash, code }),
      });

      if (res.status === 'PASSWORD_REQUIRED') {
        setStep('PASSWORD');
      } else if (res.account) {
        setStep('CONNECTED');
        onAuthSuccess(res.account);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiFetch<VerifyPasswordResponseData>('/auth/password', {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      setStep('CONNECTED');
      onAuthSuccess(res.account);
    } catch (err: any) {
      setErrorMsg(err.message || 'Incorrect 2FA password.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    setLoading(true);
    setErrorMsg(null);
    try {
      await apiFetch('/auth/disconnect', { method: 'POST' });
      onDisconnectSuccess();
      setStep('PHONE');
      setPhoneNumber('');
      setCode('');
      setPassword('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to disconnect account.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#161F30] border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#0088CC] flex items-center justify-center font-bold text-white shadow-lg shadow-sky-500/20">
            TG
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Telegram MTProto Connection</h2>
            <p className="text-xs text-slate-400">Direct User Session • AES-256-GCM Encrypted</p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {errorMsg}
          </div>
        )}

        {/* STEP 1: Phone Input */}
        {step === 'PHONE' && (
          <form onSubmit={handleSendPhone} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Phone Number (International Format)
              </label>
              <input
                type="tel"
                placeholder="+989123456789 or +12025550123"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
                className="w-full bg-[#0B0E14] border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Any valid country code is supported. Telegram will send an SMS or in-app code.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-[#0088CC] hover:bg-sky-500 font-medium text-xs text-white shadow transition disabled:opacity-50"
            >
              {loading ? 'Sending Code...' : 'Send Verification Code'}
            </button>
          </form>
        )}

        {/* STEP 2: Verification Code Input */}
        {step === 'CODE' && (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-medium text-slate-300">Enter Verification Code</label>
                <span className="text-[11px] text-sky-400 font-mono">
                  {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <input
                type="text"
                placeholder="12345"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                className="w-full bg-[#0B0E14] border border-slate-700 rounded-lg px-3.5 py-2.5 text-center text-lg tracking-widest text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1 text-center">
                Code sent to Telegram app or SMS for {phoneNumber}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep('PHONE')}
                className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
              >
                Change Phone
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 rounded-lg bg-[#0088CC] hover:bg-sky-500 font-medium text-xs text-white shadow transition disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Submit Code'}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: 2FA Cloud Password */}
        {step === 'PASSWORD' && (
          <form onSubmit={handleVerifyPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Two-Step Verification Password (2FA)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter Telegram Cloud Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-[#0B0E14] border border-slate-700 rounded-lg pl-3.5 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 transition focus:outline-none"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-sky-400" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Your account is protected by Telegram Two-Step Verification.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-[#0088CC] hover:bg-sky-500 font-medium text-xs text-white shadow transition disabled:opacity-50"
            >
              {loading ? 'Verifying Password...' : 'Confirm Password'}
            </button>
          </form>
        )}

        {/* STEP 4: Connected Account Details (FR-AUTH-013) */}
        {step === 'CONNECTED' && account && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#0B0E14] border border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Connection Status:</span>
                <span className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Connected
                </span>
              </div>

              <div className="border-t border-slate-800 pt-2 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Display Name:</span>
                  <span className="font-medium text-slate-200">{account.displayName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Username:</span>
                  <span className="font-mono text-sky-400">
                    {account.username ? `@${account.username}` : 'No username'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Telegram User ID:</span>
                  <span className="font-mono text-slate-400">{account.telegramUserId}</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[11px] text-amber-300 leading-relaxed">
              <strong>Notice:</strong> Disconnecting removes local session keys. Your personal notes, custom profiles, and tags remain safely preserved in Neon PostgreSQL.
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={loading}
                className="flex-1 py-2 px-3 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-medium transition"
              >
                {loading ? 'Disconnecting...' : 'Disconnect Account'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
