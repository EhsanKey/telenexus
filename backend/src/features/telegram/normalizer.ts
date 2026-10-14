/**
 * Telegram MTProto Peer Normalization & Display Name Resolution (SPEC-03)
 * Authoritative SSOT: specs/SPEC-03-entity-normalization-navigation.md
 */

export type NormalizedEntityType = 'user' | 'group' | 'supergroup' | 'channel';

export interface RawPeerEntity {
  id: string | number;
  className?: string; // 'User' | 'Chat' | 'Channel'
  megagroup?: boolean;
  firstName?: string | null;
  lastName?: string | null;
  title?: string | null;
  username?: string | null;
  phone?: string | null;
  accessHash?: string | number | null;
}

export interface NormalizedEntity {
  entityType: NormalizedEntityType;
  telegramPeerId: string;
  telegramUserId: string | null;
  telegramChatId: string | null;
  telegramAccessHash: string | null;
  telegramUsername: string | null;
  telegramDisplayName: string;
  telegramPublicUrl: string | null;
}

/**
 * Normalizes Telegram raw peer entities into canonical format (SPEC-03 §3)
 */
export function normalizeTelegramPeer(raw: RawPeerEntity): NormalizedEntity {
  const peerIdStr = String(raw.id).replace(/^-100/, '').replace(/^-/, '');

  let entityType: NormalizedEntityType = 'user';
  let telegramUserId: string | null = null;
  let telegramChatId: string | null = null;

  if (raw.className === 'Channel' || (raw as any).broadcast) {
    if (raw.megagroup) {
      entityType = 'supergroup'; // Supergroup (megagroup channel)
      telegramChatId = peerIdStr;
    } else {
      entityType = 'channel'; // Broadcast Channel
      telegramChatId = peerIdStr;
    }
  } else if (raw.className === 'Chat' || (raw as any).participantsCount !== undefined) {
    entityType = 'group'; // Basic Group
    telegramChatId = peerIdStr;
  } else {
    entityType = 'user'; // Private user
    telegramUserId = peerIdStr;
  }

  // Determine display name
  let telegramDisplayName = 'Telegram User';
  if (raw.title) {
    telegramDisplayName = raw.title.trim();
  } else if (raw.firstName || raw.lastName) {
    telegramDisplayName = [raw.firstName, raw.lastName].filter(Boolean).join(' ').trim();
  }

  const telegramUsername = raw.username ? raw.username.trim() : null;
  const telegramPublicUrl = telegramUsername ? `https://t.me/${telegramUsername}` : null;

  return {
    entityType,
    telegramPeerId: peerIdStr,
    telegramUserId,
    telegramChatId,
    telegramAccessHash: raw.accessHash ? String(raw.accessHash) : null,
    telegramUsername,
    telegramDisplayName,
    telegramPublicUrl,
  };
}

/**
 * Resolves active display name according to SPEC-03 §5
 * If custom display name is set by user, it takes precedence; otherwise falls back to Telegram name.
 */
export function resolveDisplayName(entity: {
  telegramDisplayName: string | null;
  customProfile?: { customDisplayName: string | null } | null;
}): string {
  if (entity.customProfile?.customDisplayName?.trim()) {
    return entity.customProfile.customDisplayName.trim();
  }
  return entity.telegramDisplayName?.trim() || 'Telegram User';
}
