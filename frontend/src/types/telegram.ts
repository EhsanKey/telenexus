/**
 * Telegram Entity Normalization & Dialog Navigation Types (SPEC-03)
 */

export type NormalizedEntityType = 'user' | 'group' | 'supergroup' | 'channel';

export type DialogCategory = 'all' | 'pv' | 'groups' | 'supergroups' | 'channels' | 'archived';

export interface DialogCustomProfile {
  id: string;
  customDisplayName: string | null;
  hasNotes: boolean;
  tagsCount: number;
  tags?: Array<{ id: string; name: string; color: string }>;
}

export interface TransientMessagePreview {
  text: string;
  date: number;
  unreadCount: number;
}

export interface DialogItem {
  id: string;
  entityType: NormalizedEntityType;
  telegramPeerId: string;
  displayName: string;
  username: string | null;
  publicUrl: string | null;
  isArchived: boolean;
  customProfile: DialogCustomProfile | null;
  transientPreview: TransientMessagePreview;
}

/**
 * Ephemeral Message Viewer & Media Indicator Types (SPEC-04)
 */

export type MediaType =
  | 'photo'
  | 'video'
  | 'voice'
  | 'audio'
  | 'animation'
  | 'sticker'
  | 'video_note'
  | 'document'
  | 'location'
  | 'contact'
  | 'unknown';

export interface MessageSender {
  id: string;
  name: string;
  isOutgoing: boolean;
}

export interface EphemeralMessage {
  messageId: number;
  sender: MessageSender;
  date: string;
  text: string | null;
  mediaType: MediaType | null;
  replyToMessageId: number | null;
}

export const MEDIA_INDICATOR_LABELS: Record<MediaType, string> = {
  photo: '[Photo]',
  video: '[Video]',
  voice: '[Voice Message]',
  audio: '[Audio / Music]',
  animation: '[Animation / GIF]',
  sticker: '[Sticker]',
  video_note: '[Video Message]',
  document: '[Document]',
  location: '[Location]',
  contact: '[Contact Card]',
  unknown: '[Unsupported Media]',
};
