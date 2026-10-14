'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { DialogItem } from '@/types/telegram';
import type {
  CustomProfileDto,
  CreateProfileInput,
  UpdateProfileInput,
  SocialLinkDto,
  TagDto,
  CreateSocialLinkInput,
  CreateTagInput,
} from '@/types/profile';
import { apiFetch } from '@/lib/api-client';
import {
  User,
  Users,
  Radio,
  Sparkles,
  Phone,
  Building2,
  Briefcase,
  Tag as TagIcon,
  Globe,
  FileText,
  Lock,
  RefreshCw,
  Edit3,
  Save,
  Trash2,
  Plus,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  MessageSquare,
  ShieldCheck,
  Calendar,
  Hash,
  Database,
  Cloud,
  CheckCheck,
  Layers,
  Search,
} from 'lucide-react';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { PRESET_TAG_COLORS } from '@/lib/constants';

interface ContactIntelligenceHubProps {
  dialog: DialogItem | null;
  allDialogsCount: number;
  tags: TagDto[];
  onRefreshMetadata?: (dialogId: string) => void;
  onOpenEphemeralChat: () => void;
  onProfileUpdated: (updatedProfile: CustomProfileDto | null) => void;
  onDirtyChange?: (isDirty: boolean) => void;
  onOpenBackups?: () => void;
  onOpenAuth?: () => void;
  isConnected: boolean;
}

export function ContactIntelligenceHub({
  dialog,
  allDialogsCount,
  tags,
  onRefreshMetadata,
  onOpenEphemeralChat,
  onProfileUpdated,
  onDirtyChange,
  onOpenBackups,
  onOpenAuth,
  isConnected,
}: ContactIntelligenceHubProps) {
  const [profile, setProfile] = useState<CustomProfileDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'tags' | 'social'>('overview');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Profile Form state
  const [customDisplayName, setCustomDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [relationshipType, setRelationshipType] = useState('');
  const [reasonForJoining, setReasonForJoining] = useState('');
  const [notes, setNotes] = useState('');

  // Social Links state (SPEC-06 §4.1)
  const [isAddingSocialLink, setIsAddingSocialLink] = useState(false);
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkDesc, setNewLinkDesc] = useState('');
  const [savingSocialLink, setSavingSocialLink] = useState(false);

  // Tag creation state (SPEC-06 §4.2)
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState<string>(PRESET_TAG_COLORS[0]!);
  const [savingTag, setSavingTag] = useState(false);

  // Dirty State Guard (SPEC-08 §5.3)
  const isDirty = Boolean(
    isEditing &&
      (customDisplayName !== (profile?.customDisplayName || '') ||
        phoneNumber !== (profile?.phoneNumber || '') ||
        company !== (profile?.company || '') ||
        jobTitle !== (profile?.jobTitle || '') ||
        relationshipType !== (profile?.relationshipType || '') ||
        reasonForJoining !== (profile?.reasonForJoining || '') ||
        notes !== (profile?.notes || ''))
  );

  useUnsavedChangesGuard({
    isDirty,
    message: 'You have unsaved changes in this profile. Discard changes and continue?',
  });

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  // Fetch full profile for active dialog
  const fetchProfile = useCallback(async (entityId: string) => {
    setLoading(true);
    setFeedback(null);
    try {
      const data = await apiFetch<CustomProfileDto | null>(`/api/backend/profiles/${entityId}`);
      setProfile(data);
      if (data) {
        setCustomDisplayName(data.customDisplayName || '');
        setPhoneNumber(data.phoneNumber || '');
        setCompany(data.company || '');
        setJobTitle(data.jobTitle || '');
        setRelationshipType(data.relationshipType || '');
        setReasonForJoining(data.reasonForJoining || '');
        setNotes(data.notes || '');
      } else {
        resetForm();
      }
    } catch (err: unknown) {
      console.warn('Could not fetch custom profile:', err);
      setProfile(null);
      resetForm();
    } finally {
      setLoading(false);
      setIsEditing(false);
    }
  }, []);

  const resetForm = () => {
    setCustomDisplayName('');
    setPhoneNumber('');
    setCompany('');
    setJobTitle('');
    setRelationshipType('');
    setReasonForJoining('');
    setNotes('');
  };

  useEffect(() => {
    if (dialog) {
      fetchProfile(dialog.id);
    } else {
      setProfile(null);
      resetForm();
    }
  }, [dialog, fetchProfile]);

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSaveProfile = async () => {
    if (!dialog) return;
    setSaving(true);
    setFeedback(null);
    try {
      if (!profile) {
        // Create new profile
        const payload: CreateProfileInput = {
          telegramEntityId: dialog.id,
          telegramPeerId: dialog.telegramPeerId,
          telegramDisplayName: dialog.displayName || null,
          username: dialog.username,
          entityType: dialog.entityType,
          customDisplayName: customDisplayName.trim() || null,
          phoneNumber: phoneNumber.trim() || null,
          company: company.trim() || null,
          jobTitle: jobTitle.trim() || null,
          relationshipType: relationshipType.trim() || null,
          reasonForJoining: reasonForJoining.trim() || null,
          notes: notes.trim() || null,
        };

        const created = await apiFetch<CustomProfileDto>('/api/backend/profiles', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        setProfile(created);
        setIsEditing(false);
        setFeedback({ type: 'success', message: 'Personal CRM profile saved successfully.' });
        onProfileUpdated(created);
      } else {
        // Update existing profile
        const payload: UpdateProfileInput = {
          telegramPeerId: dialog.telegramPeerId,
          telegramDisplayName: dialog.displayName || profile.telegramDisplayName || null,
          username: dialog.username,
          entityType: dialog.entityType,
          customDisplayName: customDisplayName.trim() || null,
          phoneNumber: phoneNumber.trim() || null,
          company: company.trim() || null,
          jobTitle: jobTitle.trim() || null,
          relationshipType: relationshipType.trim() || null,
          reasonForJoining: reasonForJoining.trim() || null,
          notes: notes.trim() || null,
        };

        const updated = await apiFetch<CustomProfileDto>(`/api/backend/profiles/${profile.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });

        setProfile(updated);
        setIsEditing(false);
        setFeedback({ type: 'success', message: 'Profile changes updated in Neon PostgreSQL.' });
        onProfileUpdated(updated);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save profile';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!profile) return;
    const confirmed = window.confirm('Are you sure you want to delete this custom CRM profile? Telegram data will remain untouched.');
    if (!confirmed) return;

    setSaving(true);
    setFeedback(null);
    try {
      await apiFetch<{ deleted: boolean }>(`/api/backend/profiles/${profile.id}`, {
        method: 'DELETE',
      });
      setProfile(null);
      resetForm();
      setIsEditing(false);
      setFeedback({ type: 'success', message: 'Personal CRM profile deleted.' });
      onProfileUpdated(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete profile';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  };

  // Add Social Link
  const handleAddSocialLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const trimmedUrl = newLinkUrl.trim();
    if (!/^https?:\/\//i.test(trimmedUrl)) {
      setFeedback({ type: 'error', message: 'URL must start with http:// or https://' });
      return;
    }

    setSavingSocialLink(true);
    setFeedback(null);
    try {
      const payload: CreateSocialLinkInput = {
        label: newLinkLabel.trim() || 'Website',
        url: trimmedUrl,
        description: newLinkDesc.trim() || null,
      };

      const createdLink = await apiFetch<SocialLinkDto>(
        `/api/backend/profiles/${profile.id}/social-links`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );

      const updated = {
        ...profile,
        socialLinks: [...profile.socialLinks, createdLink],
      };
      setProfile(updated);
      setIsAddingSocialLink(false);
      setNewLinkLabel('');
      setNewLinkUrl('');
      setNewLinkDesc('');
      setFeedback({ type: 'success', message: 'Social link added.' });
      onProfileUpdated(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add link';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSavingSocialLink(false);
    }
  };

  // Delete Social Link
  const handleDeleteSocialLink = async (linkId: string) => {
    if (!profile) return;
    try {
      await apiFetch(`/api/backend/profiles/${profile.id}/social-links/${linkId}`, {
        method: 'DELETE',
      });
      const updated = {
        ...profile,
        socialLinks: profile.socialLinks.filter((l) => l.id !== linkId),
      };
      setProfile(updated);
      setFeedback({ type: 'success', message: 'Social link removed.' });
      onProfileUpdated(updated);
    } catch (err) {
      console.warn('Failed to delete social link:', err);
    }
  };

  // Toggle Tag on Profile (SPEC-06 §4.2)
  const handleToggleTag = async (tag: TagDto) => {
    if (!dialog) return;
    setFeedback(null);

    let activeProfile = profile;
    if (!activeProfile) {
      try {
        const payload: CreateProfileInput = {
          telegramEntityId: dialog.id,
          telegramPeerId: dialog.telegramPeerId,
          telegramDisplayName: dialog.displayName || null,
          username: dialog.username,
          entityType: dialog.entityType,
        };
        activeProfile = await apiFetch<CustomProfileDto>('/api/backend/profiles', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setProfile(activeProfile);
        onProfileUpdated(activeProfile);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to create profile for tag';
        setFeedback({ type: 'error', message: msg });
        return;
      }
    }

    const isAssigned = activeProfile.tags.some((t) => t.id === tag.id);
    const newTags = isAssigned
      ? activeProfile.tags.filter((t) => t.id !== tag.id)
      : [...activeProfile.tags, tag];

    const optimisticProfile: CustomProfileDto = {
      ...activeProfile,
      tags: newTags,
    };
    setProfile(optimisticProfile);
    onProfileUpdated(optimisticProfile);

    try {
      const assignedTags = await apiFetch<TagDto[]>(
        `/api/backend/profiles/${activeProfile.id}/tags`,
        {
          method: 'PUT',
          body: JSON.stringify({ tagIds: newTags.map((t) => t.id) }),
        }
      );
      const confirmed: CustomProfileDto = {
        ...activeProfile,
        tags: assignedTags,
      };
      setProfile(confirmed);
      onProfileUpdated(confirmed);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update tag';
      setFeedback({ type: 'error', message: msg });
      setProfile(activeProfile);
      onProfileUpdated(activeProfile);
    }
  };

  // Create New Global Tag (SPEC-06 §4.2)
  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim() || !dialog) return;
    setSavingTag(true);
    setFeedback(null);
    try {
      const payload: CreateTagInput = {
        name: newTagName.trim(),
        color: newTagColor,
      };
      const createdTag = await apiFetch<TagDto>('/api/backend/tags', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      let activeProfile = profile;
      if (!activeProfile) {
        try {
          const profilePayload: CreateProfileInput = {
            telegramEntityId: dialog.id,
            telegramPeerId: dialog.telegramPeerId,
            telegramDisplayName: dialog.displayName || null,
            username: dialog.username,
            entityType: dialog.entityType,
          };
          activeProfile = await apiFetch<CustomProfileDto>('/api/backend/profiles', {
            method: 'POST',
            body: JSON.stringify(profilePayload),
          });
          setProfile(activeProfile);
          onProfileUpdated(activeProfile);
        } catch {
          // Non-fatal
        }
      }

      if (activeProfile) {
        const newTags = [...activeProfile.tags, createdTag];
        const assignedTags = await apiFetch<TagDto[]>(
          `/api/backend/profiles/${activeProfile.id}/tags`,
          {
            method: 'PUT',
            body: JSON.stringify({ tagIds: newTags.map((t) => t.id) }),
          }
        );
        const updated: CustomProfileDto = {
          ...activeProfile,
          tags: assignedTags,
        };
        setProfile(updated);
        onProfileUpdated(updated);
      }

      setIsCreatingTag(false);
      setNewTagName('');
      setFeedback({ type: 'success', message: `Tag "${createdTag.name}" created and assigned.` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create tag';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSavingTag(false);
    }
  };

  // ==========================================
  // EMPTY STATE: EXECUTIVE CRM OVERVIEW
  // ==========================================
  if (!dialog) {
    return (
      <div className="flex-1 flex flex-col h-full bg-[#080B10] overflow-y-auto p-6 lg:p-10 select-none">
        {/* Top Executive Header */}
        <div className="max-w-5xl mx-auto w-full space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-mono font-medium">
                  Personal Intelligence Engine
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Zero Persistence
                </span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
                TeleNexus Intelligence Hub
              </h1>
              <p className="text-sm text-slate-400 mt-1 max-w-xl">
                Unified Telegram contact management and personal CRM vault. Organize relationships, record private intelligence, and manage tags without exposing private data.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {onOpenBackups && (
                <button
                  type="button"
                  onClick={onOpenBackups}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 hover:border-slate-600 transition flex items-center gap-2 text-xs font-semibold shadow-sm"
                >
                  <Cloud className="w-4 h-4 text-sky-400" />
                  <span>Drive Backup</span>
                </button>
              )}

              {!isConnected && onOpenAuth && (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white transition flex items-center gap-2 text-xs font-semibold shadow-md shadow-sky-500/25"
                >
                  <User className="w-4 h-4" />
                  <span>Connect Session</span>
                </button>
              )}
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card p-5 rounded-2xl border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Directory Contacts</span>
                <Users className="w-4 h-4 text-sky-400" />
              </div>
              <p className="text-2xl font-bold text-white font-mono">{allDialogsCount}</p>
              <p className="text-[11px] text-slate-500">Live contacts & chats in Telegram</p>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Active CRM Tags</span>
                <TagIcon className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-white font-mono">{tags.length}</p>
              <p className="text-[11px] text-slate-500">Taxonomy tags in personal database</p>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Cloud Sync Protocol</span>
                <Cloud className="w-4 h-4 text-indigo-400" />
              </div>
              <p className="text-2xl font-bold text-white font-mono">AES-256</p>
              <p className="text-[11px] text-slate-500">Google Drive automated Excel backup</p>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Persistence Shield</span>
                <Lock className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-bold text-emerald-400 font-mono">Zero Logs</p>
              <p className="text-[11px] text-slate-500">Chats never touch database or storage</p>
            </div>
          </div>

          {/* Quick Guidance Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900/90 to-indigo-950/40 border border-slate-800 text-left space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-200">Select any contact to open Intelligence CRM</h3>
                <p className="text-xs text-slate-400">
                  Select a contact from the Directory on the left to inspect, record personal notes, assign tags, or open their ephemeral chat stream.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-1">
                <span className="font-semibold text-slate-200 block">1. Personal Metadata Vault</span>
                <p className="text-[11px] text-slate-400">
                  Override display names, record unverified phone numbers, company, and relationships safely.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-1">
                <span className="font-semibold text-slate-200 block">2. On-Demand Ephemeral Chat</span>
                <p className="text-[11px] text-slate-400">
                  Click &ldquo;View Ephemeral Chat&rdquo; or press <code className="text-sky-300 font-mono">Alt+M</code> to open transient messages in a floating modal.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-1">
                <span className="font-semibold text-slate-200 block">3. Excel CRM Drive Sync</span>
                <p className="text-[11px] text-slate-400">
                  Contacts, notes, and tags automatically sync to your Google Drive CRM spreadsheet.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // ACTIVE CONTACT: INTELLIGENCE WORKSPACE
  // ==========================================
  const resolvedDisplayName = customDisplayName.trim() || dialog.customProfile?.customDisplayName || dialog.displayName;
  const isCustomName = Boolean(customDisplayName.trim() || dialog.customProfile?.customDisplayName);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#080B10] overflow-hidden select-none">
      {/* 1. Hero Contact Header */}
      <header className="px-6 py-4 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-4 z-10">
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Avatar with Gradient & Entity Icon */}
          <div className="relative shrink-0">
            <div
              className={`w-13 h-13 rounded-2xl flex items-center justify-center font-bold text-lg text-white shadow-lg ${
                dialog.entityType === 'user'
                  ? 'bg-gradient-to-tr from-sky-600 to-blue-500 shadow-sky-500/20'
                  : dialog.entityType === 'supergroup'
                  ? 'bg-gradient-to-tr from-teal-600 to-emerald-500 shadow-teal-500/20'
                  : dialog.entityType === 'group'
                  ? 'bg-gradient-to-tr from-indigo-600 to-purple-500 shadow-indigo-500/20'
                  : 'bg-gradient-to-tr from-amber-600 to-orange-500 shadow-amber-500/20'
              }`}
            >
              {resolvedDisplayName.charAt(0).toUpperCase()}
            </div>
            <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-slate-950 border border-slate-700">
              {dialog.entityType === 'user' && <User className="w-3 h-3 text-sky-400" />}
              {dialog.entityType === 'supergroup' && <Users className="w-3 h-3 text-teal-400" />}
              {dialog.entityType === 'group' && <Users className="w-3 h-3 text-indigo-400" />}
              {dialog.entityType === 'channel' && <Radio className="w-3 h-3 text-amber-400" />}
            </div>
          </div>

          {/* Name & Origin Badges */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h2 className="text-base sm:text-lg font-bold text-white truncate">
                {resolvedDisplayName}
              </h2>

              {/* SPEC-08 §4.1 Visual Distinction Badging */}
              {isCustomName ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono font-medium flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  [Personal Metadata]
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono font-medium">
                  [Telegram Data]
                </span>
              )}
            </div>

            {/* Telegram technical line */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              {dialog.username ? (
                <a
                  href={`https://t.me/${dialog.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 hover:text-sky-300 font-mono flex items-center gap-0.5 transition"
                >
                  @{dialog.username}
                  <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                </a>
              ) : (
                <span className="font-mono text-slate-400">ID: {dialog.telegramPeerId}</span>
              )}

              <span className="text-slate-600">•</span>
              <span className="capitalize text-slate-300 font-medium">{dialog.entityType}</span>

              {isCustomName && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-400 truncate max-w-[220px]" title={`Original Telegram Name: ${dialog.displayName}`}>
                    Telegram Name: <em>{dialog.displayName}</em>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Ephemeral Chat Viewer Trigger Button (User Priority: Chat is modular/modal) */}
          <button
            type="button"
            onClick={onOpenEphemeralChat}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-medium text-xs transition shadow-md shadow-sky-500/20 flex items-center gap-2 group"
            title="Open Ephemeral Messages Viewer (Alt+M)"
          >
            <MessageSquare className="w-3.5 h-3.5 text-white" />
            <span>View Ephemeral Chat</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/20 text-white font-mono">
              Alt+M
            </span>
          </button>

          {/* Sync MTProto Metadata Button */}
          {onRefreshMetadata && (
            <button
              type="button"
              onClick={() => onRefreshMetadata(dialog.id)}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700/60"
              title="Refresh contact metadata from Telegram MTProto"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          {/* Save / Edit Profile Button */}
          {isEditing ? (
            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={saving}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Profile'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition border border-slate-700/80 flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5 text-sky-400" />
              <span>Edit Details</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. Feedback Notification Banner */}
      {feedback && (
        <div
          className={`px-4 py-2.5 text-xs flex items-center justify-between border-b ${
            feedback.type === 'success'
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50'
              : 'bg-rose-950/40 text-rose-300 border-rose-800/50'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* 3. Navigation Tabs within CRM Hub */}
      <div className="px-6 border-b border-slate-800/80 bg-slate-950/40 flex items-center gap-4 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`py-3 font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'text-sky-400 border-sky-400'
              : 'text-slate-400 hover:text-slate-200 border-transparent'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Identity & Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('notes')}
          className={`py-3 font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'notes'
              ? 'text-sky-400 border-sky-400'
              : 'text-slate-400 hover:text-slate-200 border-transparent'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Intelligence Notes</span>
          {notes && (
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tags')}
          className={`py-3 font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'tags'
              ? 'text-sky-400 border-sky-400'
              : 'text-slate-400 hover:text-slate-200 border-transparent'
          }`}
        >
          <TagIcon className="w-3.5 h-3.5" />
          <span>Tags Taxonomy</span>
          {profile?.tags && profile.tags.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
              {profile.tags.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('social')}
          className={`py-3 font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'social'
              ? 'text-sky-400 border-sky-400'
              : 'text-slate-400 hover:text-slate-200 border-transparent'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Digital Footprint & Links</span>
          {profile?.socialLinks && profile.socialLinks.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
              {profile.socialLinks.length}
            </span>
          )}
        </button>
      </div>

      {/* 4. CRM Stage Content */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-400 space-y-3">
            <span className="inline-block w-6 h-6 border-2 border-sky-400/20 border-t-sky-400 rounded-full animate-spin" />
            <p>Loading personal CRM record...</p>
          </div>
        ) : (
          <>
            {/* TAB 1: IDENTITY & OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Personal CRM Information Card */}
                <div className="glass-card p-6 rounded-2xl border border-slate-800/80 space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-sm font-bold text-white">Personal Metadata</h3>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                      [Personal Metadata]
                    </span>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Custom Display Name Override
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={customDisplayName}
                          onChange={(e) => setCustomDisplayName(e.target.value)}
                          placeholder="e.g. Dr. Alireza (Client VIP)"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                        />
                      ) : (
                        <p className="text-slate-200 font-medium py-1.5 px-3 bg-slate-950/60 rounded-xl border border-slate-800">
                          {customDisplayName || <em className="text-slate-500">No custom name set</em>}
                        </p>
                      )}
                    </div>

                    {/* Unverified Phone Field (SPEC-08 §4.1) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-medium text-slate-400">
                          Private Phone Number
                        </label>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-mono">
                          [Unverified Entry]
                        </span>
                      </div>
                      {isEditing ? (
                        <input
                          type="text"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="+98 912 345 6789"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                        />
                      ) : (
                        <div className="flex items-center justify-between py-1.5 px-3 bg-slate-950/60 rounded-xl border border-slate-800">
                          <span className="font-mono text-slate-200">
                            {phoneNumber || <em className="text-slate-500">Not recorded</em>}
                          </span>
                          {phoneNumber && (
                            <button
                              type="button"
                              onClick={() => handleCopy(phoneNumber, 'phone')}
                              className="text-slate-400 hover:text-white transition"
                              title="Copy phone"
                            >
                              {copiedField === 'phone' ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">
                          Company / Organization
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={company}
                            onChange={(e) => setCompany(e.target.value)}
                            placeholder="e.g. Nexus Tech"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                          />
                        ) : (
                          <p className="text-slate-200 py-1.5 px-3 bg-slate-950/60 rounded-xl border border-slate-800">
                            {company || <em className="text-slate-500">Not specified</em>}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">
                          Role / Job Title
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={jobTitle}
                            onChange={(e) => setJobTitle(e.target.value)}
                            placeholder="e.g. Lead Architect"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                          />
                        ) : (
                          <p className="text-slate-200 py-1.5 px-3 bg-slate-950/60 rounded-xl border border-slate-800">
                            {jobTitle || <em className="text-slate-500">Not specified</em>}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Relationship Stage / Category
                      </label>
                      {isEditing ? (
                        <select
                          value={relationshipType}
                          onChange={(e) => setRelationshipType(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
                        >
                          <option value="">Select relationship...</option>
                          <option value="Client">Client</option>
                          <option value="Lead">Lead</option>
                          <option value="VIP">VIP</option>
                          <option value="Partner">Partner</option>
                          <option value="Colleague">Colleague</option>
                          <option value="Friend">Friend</option>
                          <option value="Vendor">Vendor</option>
                        </select>
                      ) : (
                        <p className="text-slate-200 py-1.5 px-3 bg-slate-950/60 rounded-xl border border-slate-800">
                          {relationshipType ? (
                            <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                              {relationshipType}
                            </span>
                          ) : (
                            <em className="text-slate-500">Unclassified</em>
                          )}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Reason for Joining / Origin Context
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={reasonForJoining}
                          onChange={(e) => setReasonForJoining(e.target.value)}
                          placeholder="e.g. Met at Web3 Conference Tehran"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                        />
                      ) : (
                        <p className="text-slate-200 py-1.5 px-3 bg-slate-950/60 rounded-xl border border-slate-800">
                          {reasonForJoining || <em className="text-slate-500">No context recorded</em>}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Telegram Verified Data Card */}
                <div className="glass-card p-6 rounded-2xl border border-slate-800/80 space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-sky-400" />
                      <h3 className="text-sm font-bold text-white">Telegram MTProto Identity</h3>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                      [Telegram Data]
                    </span>
                  </div>

                  <div className="space-y-3.5 text-xs">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Telegram Display Name</span>
                        <span className="text-slate-200 font-semibold">{dialog.displayName}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">[Telegram Data]</span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Telegram Peer ID</span>
                        <span className="text-slate-200 font-mono">{dialog.telegramPeerId}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(dialog.telegramPeerId, 'peerId')}
                        className="text-slate-400 hover:text-white transition"
                        title="Copy Peer ID"
                      >
                        {copiedField === 'peerId' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Telegram Handle</span>
                        <span className="text-sky-400 font-mono">
                          {dialog.username ? `@${dialog.username}` : 'No public username'}
                        </span>
                      </div>
                      {dialog.username && (
                        <a
                          href={`https://t.me/${dialog.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-sky-300 transition"
                          title="Open in Telegram"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Entity Classification</span>
                        <span className="capitalize text-slate-200 font-medium">{dialog.entityType}</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                        MTProto
                      </span>
                    </div>

                    {/* Ephemeral Message Snapshot Card */}
                    <div className="p-4 rounded-xl bg-sky-950/20 border border-sky-900/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-sky-300">Transient Message Stream</span>
                        <span className="text-[10px] text-slate-400 font-mono">Zero Persistent Logs</span>
                      </div>
                      <p className="text-xs text-slate-300 italic">
                        &ldquo;{dialog.transientPreview.text}&rdquo;
                      </p>
                      <button
                        type="button"
                        onClick={onOpenEphemeralChat}
                        className="w-full mt-2 py-2 px-3 rounded-lg bg-sky-600/30 hover:bg-sky-600/50 text-sky-200 text-xs font-medium transition border border-sky-500/30 flex items-center justify-center gap-1.5"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Inspect Transient History</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: INTELLIGENCE NOTES */}
            {activeTab === 'notes' && (
              <div className="glass-card p-6 rounded-2xl border border-slate-800/80 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-bold text-white">Private Intelligence Notes</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                      [Personal Metadata]
                    </span>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition flex items-center gap-1"
                      >
                        <Save className="w-3 h-3" />
                        <span>Save Notes</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <textarea
                    rows={12}
                    value={notes}
                    onChange={(e) => {
                      setNotes(e.target.value);
                      if (!isEditing) setIsEditing(true);
                    }}
                    placeholder="Record detailed notes, context, meetings, agreements, or reminders about this contact..."
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl p-4 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500/80 focus:ring-1 focus:ring-sky-500/20 font-mono leading-relaxed resize-y"
                  />

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>
                      {notes ? `${notes.length} characters • ${notes.split(/\s+/).filter(Boolean).length} words` : 'Empty notes'}
                    </span>
                    <span className="text-slate-500">Supports standard Markdown</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: TAG TAXONOMY */}
            {activeTab === 'tags' && (
              <div className="glass-card p-6 rounded-2xl border border-slate-800/80 space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <TagIcon className="w-4 h-4 text-sky-400" />
                    <h3 className="text-sm font-bold text-white">Contact Tags & Classification</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCreatingTag((prev) => !prev)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition border border-slate-700 flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 text-sky-400" />
                    <span>Create New Tag</span>
                  </button>
                </div>

                {/* Create Tag Form */}
                {isCreatingTag && (
                  <form onSubmit={handleCreateTag} className="p-4 rounded-xl bg-slate-900 border border-slate-700/80 space-y-3">
                    <h4 className="text-xs font-semibold text-slate-200">Create New Taxonomy Tag</h4>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        placeholder="Tag name (e.g. VIP, Investor, Dev)"
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                        required
                      />
                      <div className="flex items-center gap-1.5">
                        {PRESET_TAG_COLORS.slice(0, 6).map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setNewTagColor(color)}
                            style={{ backgroundColor: color }}
                            className={`w-6 h-6 rounded-full transition-transform ${
                              newTagColor === color ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'opacity-80 hover:opacity-100'
                            }`}
                          />
                        ))}
                      </div>
                      <button
                        type="submit"
                        disabled={savingTag || !newTagName.trim()}
                        className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition disabled:opacity-50"
                      >
                        {savingTag ? 'Creating...' : 'Create'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Active Assigned Tags */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-300 mb-2.5">
                    Attached to this contact:
                  </h4>
                  {profile?.tags && profile.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {profile.tags.map((tag) => (
                        <div
                          key={tag.id}
                          style={{
                            backgroundColor: `${tag.color}20`,
                            borderColor: `${tag.color}60`,
                            color: tag.color,
                          }}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium"
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                          <span>{tag.name}</span>
                          <button
                            type="button"
                            onClick={() => handleToggleTag(tag)}
                            className="ml-1 opacity-70 hover:opacity-100 hover:text-white"
                            title="Remove tag"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No tags attached to this contact yet.</p>
                  )}
                </div>

                {/* Available Global Tags Picker */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-300 mb-2.5">
                    Available Tags in Repository:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => {
                      const isAssigned = profile?.tags.some((t) => t.id === tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => handleToggleTag(tag)}
                          style={
                            isAssigned
                              ? { backgroundColor: tag.color, color: '#ffffff' }
                              : { borderColor: `${tag.color}40`, color: tag.color }
                          }
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium transition ${
                            isAssigned ? 'shadow-md shadow-black/20' : 'bg-transparent hover:bg-slate-800/80'
                          }`}
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: isAssigned ? '#ffffff' : tag.color }}
                          />
                          <span>{tag.name}</span>
                          <span className="text-[10px] ml-0.5">
                            {isAssigned ? '✓' : '+'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: SOCIAL LINKS */}
            {activeTab === 'social' && (
              <div className="glass-card p-6 rounded-2xl border border-slate-800/80 space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-sky-400" />
                    <h3 className="text-sm font-bold text-white">Digital Footprint & Social Links</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddingSocialLink((prev) => !prev)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition border border-slate-700 flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 text-sky-400" />
                    <span>Add Link</span>
                  </button>
                </div>

                {/* Add Link Form */}
                {isAddingSocialLink && (
                  <form onSubmit={handleAddSocialLink} className="p-4 rounded-xl bg-slate-900 border border-slate-700/80 space-y-3">
                    <h4 className="text-xs font-semibold text-slate-200">Add External Link (SPEC-06)</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Platform Label</label>
                        <input
                          type="text"
                          value={newLinkLabel}
                          onChange={(e) => setNewLinkLabel(e.target.value)}
                          placeholder="e.g. GitHub, LinkedIn, X"
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">URL (http:// or https://)</label>
                        <input
                          type="url"
                          value={newLinkUrl}
                          onChange={(e) => setNewLinkUrl(e.target.value)}
                          placeholder="https://github.com/..."
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Description (Optional)</label>
                      <input
                        type="text"
                        value={newLinkDesc}
                        onChange={(e) => setNewLinkDesc(e.target.value)}
                        placeholder="e.g. Personal Portfolio or Repository"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAddingSocialLink(false)}
                        className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingSocialLink}
                        className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition disabled:opacity-50"
                      >
                        {savingSocialLink ? 'Saving...' : 'Add Link'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Social Links Cards Grid */}
                {profile?.socialLinks && profile.socialLinks.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {profile.socialLinks.map((link) => (
                      <div
                        key={link.id}
                        className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3 group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                            <span className="text-xs font-semibold text-slate-200 truncate">{link.label}</span>
                          </div>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-sky-400 hover:text-sky-300 truncate block mt-0.5"
                          >
                            {link.url}
                          </a>
                          {link.description && (
                            <p className="text-[10px] text-slate-500 truncate mt-0.5">{link.description}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                            title="Open link"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDeleteSocialLink(link.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                            title="Delete link"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-slate-500 italic">
                    No social profiles or websites recorded for this contact.
                  </div>
                )}
              </div>
            )}

            {/* Bottom Actions: Delete Profile */}
            {profile && (
              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleDeleteProfile}
                  className="px-3 py-1.5 rounded-xl text-rose-400 hover:bg-rose-950/40 border border-rose-900/40 transition text-xs flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Custom Profile</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
