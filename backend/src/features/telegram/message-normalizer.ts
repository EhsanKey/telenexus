/**
 * Telegram Message Normalizer & Media Classifier (SPEC-04)
 * Authoritative SSOT: specs/SPEC-04-ephemeral-message-viewer.md
 * 
 * ARCHITECTURAL INVARIANT:
 * Zero message persistence. This module exclusively converts raw MTProto
 * message structures into transient presentation DTOs in volatile memory.
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

export interface EphemeralMessageDto {
  messageId: number;
  sender: MessageSender;
  date: string; // ISO 8601 string
  text: string | null;
  mediaType: MediaType | null;
  replyToMessageId: number | null;
}

/**
 * Human-readable indicator tags matching SPEC-04 §4 table
 */
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

/**
 * Classifies Telegram MTProto message media into canonical MediaType enum
 * without reading or persisting binary streams.
 */
export function classifyTelegramMedia(media: unknown): MediaType | null {
  if (!media || typeof media !== 'object') {
    return null;
  }

  const mediaObj = media as Record<string, unknown>;
  const className = (mediaObj.className || mediaObj.constructor?.name || '') as string;

  // 1. Photo
  if (className === 'MessageMediaPhoto' || 'photo' in mediaObj) {
    return 'photo';
  }

  // 2. Document-based media (Voice, Video, Audio, Sticker, Animation, Round Video, Doc)
  if (className === 'MessageMediaDocument' || 'document' in mediaObj) {
    const doc = (mediaObj.document || mediaObj) as Record<string, unknown>;
    const mimeType = String(doc.mimeType || '').toLowerCase();
    const attributes = Array.isArray(doc.attributes) ? doc.attributes : [];

    // Inspect attributes
    for (const attr of attributes) {
      if (!attr || typeof attr !== 'object') continue;
      const attrClass = String((attr as Record<string, unknown>).className || '');

      if (attrClass === 'DocumentAttributeVideo') {
        const isRound = Boolean((attr as Record<string, unknown>).roundMessage);
        return isRound ? 'video_note' : 'video';
      }

      if (attrClass === 'DocumentAttributeAudio') {
        const isVoice = Boolean((attr as Record<string, unknown>).voice);
        return isVoice ? 'voice' : 'audio';
      }

      if (attrClass === 'DocumentAttributeAnimated') {
        return 'animation';
      }

      if (attrClass === 'DocumentAttributeSticker') {
        return 'sticker';
      }
    }

    // Inspect MIME types if attributes did not specify
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('gif')) return 'animation';

    return 'document';
  }

  // 3. Location / Geo
  if (className === 'MessageMediaGeo' || 'geo' in mediaObj) {
    return 'location';
  }

  // 4. Contact
  if (className === 'MessageMediaContact' || 'phoneNumber' in mediaObj) {
    return 'contact';
  }

  // 5. Unsupported / Other
  if (className.startsWith('MessageMedia')) {
    return 'unknown';
  }

  return null;
}

/**
 * Normalizes raw MTProto Message into canonical EphemeralMessageDto
 */
export function normalizeTelegramMessage(
  rawMessage: unknown,
  currentUserId?: string,
  defaultSenderName = 'Unknown'
): EphemeralMessageDto {
  if (!rawMessage || typeof rawMessage !== 'object') {
    throw new Error('Invalid raw message object for normalization');
  }

  const msg = rawMessage as Record<string, unknown>;
  const messageId = Number(msg.id || msg.messageId || 0);
  const out = Boolean(msg.out ?? msg.isOutgoing ?? false);

  // Sender details
  let senderId = '';
  if (msg.fromId && typeof msg.fromId === 'object') {
    const from = msg.fromId as Record<string, unknown>;
    senderId = String(from.userId || from.chatId || from.channelId || '');
  } else if (msg.senderId) {
    senderId = String(msg.senderId);
  } else if (out && currentUserId) {
    senderId = currentUserId;
  }

  const isOutgoing = out || (Boolean(currentUserId) && senderId === currentUserId);
  const senderName = isOutgoing
    ? 'You'
    : String(msg.senderName || defaultSenderName || 'Telegram User');

  // Date parsing
  let dateIso: string;
  if (typeof msg.date === 'number') {
    dateIso = new Date(msg.date * 1000).toISOString();
  } else if (typeof msg.date === 'string') {
    dateIso = new Date(msg.date).toISOString();
  } else {
    dateIso = new Date().toISOString();
  }

  // Text / Caption
  const rawText = msg.message ?? msg.text;
  const text = typeof rawText === 'string' && rawText.trim().length > 0 ? rawText.trim() : null;

  // Media classification
  const mediaType = classifyTelegramMedia(msg.media);

  // Reply reference
  let replyToMessageId: number | null = null;
  if (msg.replyTo && typeof msg.replyTo === 'object') {
    const replyTo = msg.replyTo as Record<string, unknown>;
    replyToMessageId = Number(replyTo.replyToMsgId || replyTo.replyToMessageId || 0) || null;
  } else if (typeof msg.replyToMessageId === 'number') {
    replyToMessageId = msg.replyToMessageId;
  }

  return {
    messageId,
    sender: {
      id: senderId,
      name: senderName,
      isOutgoing,
    },
    date: dateIso,
    text,
    mediaType,
    replyToMessageId,
  };
}
