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
  Phone,
  FileText,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Layers,
  Globe,
  ExternalLink,
  Tag as TagIcon,
  Check,
} from 'lucide-react';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { PRESET_TAG_COLORS } from '@/lib/constants';

interface CustomProfileDrawerProps {
  dialog: DialogItem | null;
  isOpen?: boolean;
  onClose?: () => void;
  onProfileUpdated: (updatedProfile: CustomProfileDto | null) => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

export function CustomProfileDrawer({
  dialog,
  isOpen = true,
  onClose,
  onProfileUpdated,
  onDirtyChange,
}: CustomProfileDrawerProps) {
  const [profile, setProfile] = useState<CustomProfileDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Profile core form fields
  const [customDisplayName, setCustomDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [relationshipType, setRelationshipType] = useState('');
  const [reasonForJoining, setReasonForJoining] = useState('');
  const [notes, setNotes] = useState('');

  // Social Links management state (SPEC-06 §4.1)
  const [isAddingSocialLink, setIsAddingSocialLink] = useState(false);
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkDesc, setNewLinkDesc] = useState('');
  const [savingSocialLink, setSavingSocialLink] = useState(false);

  // Tag Taxonomy management state (SPEC-06 §4.2)
  const [availableTags, setAvailableTags] = useState<TagDto[]>([]);
  const [isManagingTags, setIsManagingTags] = useState(false);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState<string>(PRESET_TAG_COLORS[0]!);
  const [savingTag, setSavingTag] = useState(false);

  // Dirty state checking (SPEC-08 §5.3)
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

  const { confirmNavigation } = useUnsavedChangesGuard({
    isDirty,
    message: 'You have unsaved changes in this profile. Discard changes and continue?',
  });

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  // Fetch full profile for the active dialog
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
      setIsAddingSocialLink(false);
      setIsManagingTags(false);
      setIsCreatingTag(false);
    }
  }, []);

  // Fetch global available tags
  const fetchAvailableTags = useCallback(async () => {
    try {
      const data = await apiFetch<TagDto[]>('/api/backend/tags');
      setAvailableTags(data);
    } catch (err) {
      console.warn('Could not fetch available tags:', err);
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
      fetchAvailableTags();
    } else {
      setProfile(null);
      resetForm();
    }
  }, [dialog, fetchProfile, fetchAvailableTags]);

  const handleCreateProfile = async () => {
    if (!dialog) return;
    setSaving(true);
    setFeedback(null);
    try {
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
      setFeedback({ type: 'success', message: 'Custom CRM profile created successfully.' });
      onProfileUpdated(created);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create profile';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!profile) return;
    setSaving(true);
    setFeedback(null);
    try {
      const payload: UpdateProfileInput = {
        telegramPeerId: dialog?.telegramPeerId,
        telegramDisplayName: dialog?.displayName || profile.telegramDisplayName || null,
        username: dialog?.username,
        entityType: dialog?.entityType,
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
      setFeedback({ type: 'success', message: 'Profile changes saved in Neon PostgreSQL.' });
      onProfileUpdated(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!profile) return;
    setSaving(true);
    setFeedback(null);
    try {
      await apiFetch<{ deleted: boolean }>(`/api/backend/profiles/${profile.id}`, {
        method: 'DELETE',
      });

      setProfile(null);
      resetForm();
      setShowDeleteConfirm(false);
      setIsEditing(false);
      setFeedback({
        type: 'success',
        message: 'Custom CRM profile deleted. Telegram conversation remains intact.',
      });
      onProfileUpdated(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete profile';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // SOCIAL LINKS HANDLERS (SPEC-06 §4.1)
  // ==========================================

  const handleAddSocialLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const trimmedUrl = newLinkUrl.trim();
    if (!/^https?:\/\//i.test(trimmedUrl)) {
      setFeedback({
        type: 'error',
        message: 'URL must begin with http:// or https:// (SPEC-06 protocol whitelist)',
      });
      return;
    }

    setSavingSocialLink(true);
    setFeedback(null);
    try {
      const payload: CreateSocialLinkInput = {
        label: newLinkLabel.trim() || 'Link',
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

      const updatedProfile: CustomProfileDto = {
        ...profile,
        socialLinks: [...profile.socialLinks, createdLink],
      };

      setProfile(updatedProfile);
      setNewLinkLabel('');
      setNewLinkUrl('');
      setNewLinkDesc('');
      setIsAddingSocialLink(false);
      setFeedback({ type: 'success', message: 'Social link attached successfully.' });
      onProfileUpdated(updatedProfile);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add social link';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSavingSocialLink(false);
    }
  };

  const handleDeleteSocialLink = async (linkId: string) => {
    if (!profile) return;
    try {
      await apiFetch<{ deleted: boolean }>(
        `/api/backend/profiles/${profile.id}/social-links/${linkId}`,
        { method: 'DELETE' }
      );

      const updatedProfile: CustomProfileDto = {
        ...profile,
        socialLinks: profile.socialLinks.filter((l) => l.id !== linkId),
      };

      setProfile(updatedProfile);
      setFeedback({ type: 'success', message: 'Social link removed.' });
      onProfileUpdated(updatedProfile);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete social link';
      setFeedback({ type: 'error', message: msg });
    }
  };

  // ==========================================
  // TAG TAXONOMY HANDLERS (SPEC-06 §4.2)
  // ==========================================

  const handleToggleTag = async (tag: TagDto) => {
    if (!profile) return;
    setSavingTag(true);
    setFeedback(null);
    try {
      const isCurrentlyAssigned = profile.tags.some((t) => t.id === tag.id);
      const newTagIds = isCurrentlyAssigned
        ? profile.tags.filter((t) => t.id !== tag.id).map((t) => t.id)
        : [...profile.tags.map((t) => t.id), tag.id];

      const assignedTags = await apiFetch<TagDto[]>(
        `/api/backend/profiles/${profile.id}/tags`,
        {
          method: 'PUT',
          body: JSON.stringify({ tagIds: newTagIds }),
        }
      );

      const updatedProfile: CustomProfileDto = {
        ...profile,
        tags: assignedTags,
      };

      setProfile(updatedProfile);
      onProfileUpdated(updatedProfile);
      await fetchAvailableTags();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update tags';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSavingTag(false);
    }
  };

  const handleCreateNewTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !newTagName.trim()) return;

    setSavingTag(true);
    setFeedback(null);
    try {
      const payload: CreateTagInput = {
        name: newTagName.trim(),
        color: newTagColor,
      };

      const created = await apiFetch<TagDto>('/api/backend/tags', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Automatically assign new tag to active profile
      const newTagIds = [...profile.tags.map((t) => t.id), created.id];
      const assignedTags = await apiFetch<TagDto[]>(
        `/api/backend/profiles/${profile.id}/tags`,
        {
          method: 'PUT',
          body: JSON.stringify({ tagIds: newTagIds }),
        }
      );

      const updatedProfile: CustomProfileDto = {
        ...profile,
        tags: assignedTags,
      };

      setProfile(updatedProfile);
      setNewTagName('');
      setIsCreatingTag(false);
      onProfileUpdated(updatedProfile);
      await fetchAvailableTags();
      setFeedback({ type: 'success', message: `Tag #${created.name} created and attached.` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create tag';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSavingTag(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  const handleCancelEdit = () => {
    if (isDirty && !confirmNavigation()) {
      return;
    }
    if (profile) {
      setCustomDisplayName(profile.customDisplayName || '');
      setPhoneNumber(profile.phoneNumber || '');
      setCompany(profile.company || '');
      setJobTitle(profile.jobTitle || '');
      setRelationshipType(profile.relationshipType || '');
      setReasonForJoining(profile.reasonForJoining || '');
      setNotes(profile.notes || '');
    } else {
      resetForm();
    }
    setIsEditing(false);
  };

  const handleCloseDrawer = () => {
    if (isDirty && !confirmNavigation()) {
      return;
    }
    onClose?.();
  };

  if (!dialog) {
    return (
      <aside className="w-[360px] shrink-0 bg-[#161F30]/90 border-l border-slate-800 p-5 flex items-center justify-center text-slate-500 text-xs">
        Select a conversation to manage CRM profile
      </aside>
    );
  }

  return (
    <aside className="w-[360px] shrink-0 bg-[#161F30]/90 border-l border-slate-800 p-5 overflow-y-auto space-y-4 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Custom Profile CRM
            </h3>
            <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Neon DB
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {profile && !isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition border border-slate-700/60"
              >
                <Edit3 className="w-3 h-3 text-indigo-400" />
                <span>Edit</span>
              </button>
            )}

            {isEditing && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-400 text-xs transition"
              >
                <X className="w-3 h-3" />
                <span>Cancel</span>
              </button>
            )}

            {onClose && (
              <button
                type="button"
                onClick={handleCloseDrawer}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="Close Profile Panel"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Feedback Message */}
        {feedback && (
          <div
            className={`mt-3 p-2.5 rounded-lg text-xs flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-950/40 border border-emerald-800/50 text-emerald-300'
                : 'bg-rose-950/40 border border-rose-800/50 text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            )}
            <span className="flex-1 text-[11px] leading-tight">{feedback.message}</span>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="py-12 flex flex-col items-center justify-center space-y-2">
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
            <span className="text-xs text-slate-400">Loading custom profile...</span>
          </div>
        )}

        {/* No Profile State */}
        {!loading && !profile && !isEditing && (
          <div className="mt-4 p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 text-center space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-200">No Custom Profile Yet</h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Attach permanent CRM metadata, role, company, social links, and tags to this Telegram peer.
              </p>
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition shadow-sm shadow-indigo-600/30"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create CRM Profile</span>
            </button>
          </div>
        )}

        {/* Form / Profile Content */}
        {!loading && (profile || isEditing) && (
          <div className="mt-4 space-y-3.5 text-xs">
            {/* Telegram Display Name (Immutable Original Title) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] text-slate-300 font-medium">Telegram Original Name</label>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                  [Original Name]
                </span>
              </div>
              <input
                type="text"
                value={dialog?.displayName || profile?.telegramDisplayName || ''}
                readOnly
                className="w-full bg-slate-900/60 border border-slate-800/80 rounded-lg px-2.5 py-1.5 text-slate-300 text-xs cursor-default select-text"
              />
            </div>

            {/* Custom Display Name (CRM Override) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] text-slate-300 font-medium">Custom Display Name</label>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-mono">
                  [Personal Metadata]
                </span>
              </div>
              <input
                type="text"
                value={customDisplayName}
                onChange={(e) => setCustomDisplayName(e.target.value)}
                readOnly={!isEditing}
                placeholder="e.g. Coach Farhad (VIP Lead)"
                className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                  isEditing
                    ? 'bg-slate-900 border border-indigo-500/80 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500'
                    : 'bg-slate-900/90 border border-slate-700/80 text-slate-200'
                }`}
              />
            </div>

            {/* Manual Phone Number (Unverified) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] text-slate-300 font-medium flex items-center gap-1">
                  <Phone className="w-3 h-3 text-amber-400" />
                  <span>Manual Phone</span>
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-mono">
                    [Personal Metadata]
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-800/60 font-mono">
                    [Unverified Entry]
                  </span>
                </div>
              </div>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                readOnly={!isEditing}
                placeholder="+98912..."
                className={`w-full rounded-lg px-2.5 py-1.5 text-xs transition ${
                  isEditing
                    ? 'bg-slate-900 border border-indigo-500/80 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500'
                    : 'bg-slate-900/90 border border-slate-700/80 text-slate-200'
                }`}
              />
            </div>

            {/* Company & Job Title */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-400 font-medium block mb-1">Company</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  readOnly={!isEditing}
                  placeholder="Organization..."
                  className={`w-full rounded-lg px-2.5 py-1.5 text-xs transition ${
                    isEditing
                      ? 'bg-slate-900 border border-indigo-500/80 text-white'
                      : 'bg-slate-900/90 border border-slate-700/80 text-slate-200'
                  }`}
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 font-medium block mb-1">Role / Title</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  readOnly={!isEditing}
                  placeholder="Job title..."
                  className={`w-full rounded-lg px-2.5 py-1.5 text-xs transition ${
                    isEditing
                      ? 'bg-slate-900 border border-indigo-500/80 text-white'
                      : 'bg-slate-900/90 border border-slate-700/80 text-slate-200'
                  }`}
                />
              </div>
            </div>

            {/* Relationship Type */}
            <div>
              <label className="text-[11px] text-slate-400 font-medium block mb-1">
                Relationship Context
              </label>
              <input
                type="text"
                value={relationshipType}
                onChange={(e) => setRelationshipType(e.target.value)}
                readOnly={!isEditing}
                placeholder="e.g. Mentor, Client, Team Lead..."
                className={`w-full rounded-lg px-2.5 py-1.5 text-xs transition ${
                  isEditing
                    ? 'bg-slate-900 border border-indigo-500/80 text-white'
                    : 'bg-slate-900/90 border border-slate-700/80 text-slate-200'
                }`}
              />
            </div>

            {/* Multiline Notes (SPEC-05 §5.3) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] text-slate-300 font-medium flex items-center gap-1">
                  <FileText className="w-3 h-3 text-emerald-400" />
                  <span>Personal Notes</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-mono">
                    [Personal Metadata]
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {notes.length} chars
                  </span>
                </div>
              </div>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                readOnly={!isEditing}
                placeholder="Write private notes (markdown friendly, preserves newlines)..."
                className={`w-full rounded-lg px-2.5 py-2 text-xs transition leading-relaxed resize-y ${
                  isEditing
                    ? 'bg-slate-900 border border-indigo-500/80 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500'
                    : 'bg-slate-900/90 border border-slate-700/80 text-slate-200'
                }`}
              />
            </div>

            {/* ========================================== */}
            {/* SOCIAL LINKS SECTION (SPEC-06 §4.1)        */}
            {/* ========================================== */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-medium text-slate-300 flex items-center gap-1">
                  <Globe className="w-3 h-3 text-sky-400" />
                  <span>Social Links ({profile?.socialLinks.length || 0})</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-mono">
                    [Personal Metadata]
                  </span>
                  {profile && !isAddingSocialLink && (
                    <button
                      type="button"
                      onClick={() => setIsAddingSocialLink(true)}
                      className="flex items-center gap-0.5 text-[10px] text-sky-400 hover:text-sky-300 transition font-medium"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Link</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Add Social Link Inline Form */}
              {isAddingSocialLink && (
                <form
                  onSubmit={handleAddSocialLink}
                  className="p-2.5 rounded-lg bg-slate-900/90 border border-sky-900/60 space-y-2 text-xs animate-in fade-in"
                >
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      placeholder="Label (e.g. GitHub)"
                      value={newLinkLabel}
                      onChange={(e) => setNewLinkLabel(e.target.value)}
                      required
                      className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                    />
                    <input
                      type="url"
                      placeholder="https://..."
                      value={newLinkUrl}
                      onChange={(e) => setNewLinkUrl(e.target.value)}
                      required
                      className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={newLinkDesc}
                    onChange={(e) => setNewLinkDesc(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                  />
                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingSocialLink(false)}
                      className="px-2 py-0.5 rounded text-slate-400 hover:text-slate-200 text-[11px]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingSocialLink}
                      className="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-medium transition disabled:opacity-50 flex items-center gap-1"
                    >
                      {savingSocialLink && <Loader2 className="w-3 h-3 animate-spin" />}
                      <span>Save Link</span>
                    </button>
                  </div>
                </form>
              )}

              {/* List of Social Links */}
              {profile && profile.socialLinks.length > 0 ? (
                <div className="space-y-1.5">
                  {profile.socialLinks.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs hover:border-slate-700 transition"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-200">{link.label}:</span>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sky-400 hover:underline truncate max-w-[150px] inline-flex items-center gap-0.5"
                          >
                            <span>{link.url}</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-60 shrink-0" />
                          </a>
                        </div>
                        {link.description && (
                          <p className="text-[10px] text-slate-400 truncate">{link.description}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteSocialLink(link.id)}
                        className="text-slate-500 hover:text-rose-400 transition p-1"
                        title="Remove link"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                !isAddingSocialLink && (
                  <p className="text-[11px] text-slate-500 italic">No external social links attached yet.</p>
                )
              )}
            </div>

            {/* ========================================== */}
            {/* TAG TAXONOMY SECTION (SPEC-06 §4.2)        */}
            {/* ========================================== */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-medium text-slate-300 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-indigo-400" />
                  <span>Assigned Tags ({profile?.tags.length || 0})</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-mono">
                    [Personal Metadata]
                  </span>
                  {profile && (
                    <button
                      type="button"
                      onClick={() => setIsManagingTags(!isManagingTags)}
                      className="flex items-center gap-0.5 text-[10px] text-indigo-400 hover:text-indigo-300 transition font-medium"
                    >
                      <span>{isManagingTags ? 'Done' : '+ Manage Tags'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Tag Badges List */}
              <div className="flex flex-wrap gap-1.5">
                {profile && profile.tags.length > 0 ? (
                  profile.tags.map((tag) => (
                    <span
                      key={tag.id}
                      style={{
                        backgroundColor: `${tag.color}18`,
                        borderColor: `${tag.color}40`,
                        color: tag.color,
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-medium shadow-sm"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span>#{tag.name}</span>
                      {isManagingTags && (
                        <button
                          type="button"
                          onClick={() => handleToggleTag(tag)}
                          className="hover:opacity-75 ml-0.5"
                          title="Remove tag"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </span>
                  ))
                ) : (
                  <p className="text-[11px] text-slate-500 italic">No tags assigned yet.</p>
                )}
              </div>

              {/* Tag Selector & Creator Panel */}
              {isManagingTags && profile && (
                <div className="p-3 rounded-xl bg-slate-900 border border-indigo-950 space-y-3 animate-in fade-in">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1.5 font-medium uppercase tracking-wider">
                      Select Available Tags:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {availableTags.map((tag) => {
                        const isAssigned = profile.tags.some((t) => t.id === tag.id);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => handleToggleTag(tag)}
                            disabled={savingTag}
                            style={{
                              borderColor: tag.color,
                              backgroundColor: isAssigned ? tag.color : 'transparent',
                              color: isAssigned ? '#FFFFFF' : tag.color,
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium transition"
                          >
                            {isAssigned && <Check className="w-2.5 h-2.5" />}
                            <span>#{tag.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Create New Tag */}
                  {!isCreatingTag ? (
                    <button
                      type="button"
                      onClick={() => setIsCreatingTag(true)}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium pt-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Create New Tag Taxonomy</span>
                    </button>
                  ) : (
                    <form
                      onSubmit={handleCreateNewTag}
                      className="pt-2 border-t border-slate-800 space-y-2"
                    >
                      <input
                        type="text"
                        placeholder="Tag name (e.g. VIP Lead)..."
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        required
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">Color:</span>
                        <div className="flex items-center gap-1.5">
                          {PRESET_TAG_COLORS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setNewTagColor(color)}
                              style={{ backgroundColor: color }}
                              className={`w-4 h-4 rounded-full transition ${
                                newTagColor === color ? 'ring-2 ring-white scale-110' : ''
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsCreatingTag(false)}
                          className="px-2 py-0.5 rounded text-slate-400 hover:text-slate-200 text-[11px]"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={savingTag || !newTagName.trim()}
                          className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-medium transition disabled:opacity-50 flex items-center gap-1"
                        >
                          {savingTag && <Loader2 className="w-3 h-3 animate-spin" />}
                          <span>Create & Assign</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons in Edit Mode */}
            {isEditing && (
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={profile ? handleUpdateProfile : handleCreateProfile}
                  disabled={saving}
                  className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition disabled:opacity-50 shadow-md shadow-emerald-600/20"
                >
                  {saving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>{saving ? 'Saving...' : profile ? 'Save Changes' : 'Create Profile'}</span>
                </button>

                {profile && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="p-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/40 transition"
                    title="Delete custom profile"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal (FR-PROFILE-010) */}
      {showDeleteConfirm && (
        <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-800 text-xs space-y-2.5 shadow-xl animate-in fade-in">
          <div className="flex items-start gap-2 text-rose-300">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Delete Custom CRM Profile?</p>
              <p className="text-[11px] text-rose-300/80 mt-1 leading-normal">
                This deletes all private CRM notes, links, and tags from PostgreSQL. Your Telegram conversation and chat history will remain completely untouched.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteProfile}
              disabled={saving}
              className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-medium transition disabled:opacity-50"
            >
              {saving ? 'Deleting...' : 'Yes, Delete CRM Profile'}
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
