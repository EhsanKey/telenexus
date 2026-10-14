'use client';

import React, { useEffect } from 'react';
import type { DialogItem } from '@/types/telegram';
import { MessageViewer } from './MessageViewer';
import { X, MessageSquare, Maximize2, Minimize2, Lock } from 'lucide-react';

interface EphemeralChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  dialog: DialogItem | null;
  onRefreshMetadata?: (dialogId: string) => void;
}

export function EphemeralChatModal({
  isOpen,
  onClose,
  dialog,
  onRefreshMetadata,
}: EphemeralChatModalProps) {
  const [isMaximized, setIsMaximized] = React.useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !dialog) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      {/* Click outside to dismiss backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div
        className={`relative z-10 w-full flex flex-col bg-[#0F172A] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 ${
          isMaximized
            ? 'h-[94vh] max-w-5xl'
            : 'h-[750px] max-h-[88vh] max-w-2xl'
        }`}
      >
        {/* Modal Top Control Bar */}
        <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-slate-200">Ephemeral Telegram Chat</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-mono">
              Zero Persistent Storage
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsMaximized((prev) => !prev)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title={isMaximized ? 'Restore size' : 'Maximize viewer'}
            >
              {isMaximized ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Close modal (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Embedded Message Stream */}
        <div className="flex-1 overflow-hidden relative">
          <MessageViewer
            dialog={dialog}
            onRefreshMetadata={onRefreshMetadata}
            onBackToList={onClose}
          />
        </div>
      </div>
    </div>
  );
}
