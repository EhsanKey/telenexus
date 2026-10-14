import { describe, it, expect } from 'vitest';
import {
  normalizeTelegramPeer,
  resolveDisplayName,
} from '../../src/features/telegram/normalizer.js';
import { dialogsService } from '../../src/features/telegram/service.js';

describe('SPEC-03: Entity Normalization & Conversation Navigation', () => {
  describe('Peer Normalization Algorithm (SPEC-03 §3)', () => {
    it('normalizes a Private User (PeerUser)', () => {
      const rawUser = {
        id: '123456789',
        className: 'User',
        firstName: 'Ali',
        lastName: 'Daei',
        username: 'alidaei10',
        phone: '+989120000000',
        accessHash: '987654321',
      };

      const normalized = normalizeTelegramPeer(rawUser);

      expect(normalized.entityType).toBe('user');
      expect(normalized.telegramPeerId).toBe('123456789');
      expect(normalized.telegramUserId).toBe('123456789');
      expect(normalized.telegramChatId).toBeNull();
      expect(normalized.telegramDisplayName).toBe('Ali Daei');
      expect(normalized.telegramUsername).toBe('alidaei10');
      expect(normalized.telegramPublicUrl).toBe('https://t.me/alidaei10');
    });

    it('normalizes a Basic Group (PeerChat)', () => {
      const rawChat = {
        id: '998877',
        className: 'Chat',
        title: 'Football Friends Group',
        participantsCount: 15,
      };

      const normalized = normalizeTelegramPeer(rawChat);

      expect(normalized.entityType).toBe('group');
      expect(normalized.telegramPeerId).toBe('998877');
      expect(normalized.telegramChatId).toBe('998877');
      expect(normalized.telegramUserId).toBeNull();
      expect(normalized.telegramDisplayName).toBe('Football Friends Group');
      expect(normalized.telegramUsername).toBeNull();
      expect(normalized.telegramPublicUrl).toBeNull();
    });

    it('normalizes a Supergroup / Megagroup (PeerChannel with megagroup=true)', () => {
      const rawSupergroup = {
        id: '-1001555666777',
        className: 'Channel',
        megagroup: true,
        title: 'Open Source Community Supergroup',
        username: 'os_supergroup',
      };

      const normalized = normalizeTelegramPeer(rawSupergroup);

      expect(normalized.entityType).toBe('supergroup');
      expect(normalized.telegramPeerId).toBe('1555666777');
      expect(normalized.telegramChatId).toBe('1555666777');
      expect(normalized.telegramDisplayName).toBe('Open Source Community Supergroup');
      expect(normalized.telegramPublicUrl).toBe('https://t.me/os_supergroup');
    });

    it('normalizes a Broadcast Channel (PeerChannel with megagroup=false)', () => {
      const rawChannel = {
        id: '-1001888999000',
        className: 'Channel',
        megagroup: false,
        title: 'Global Tech News',
        username: 'global_tech',
      };

      const normalized = normalizeTelegramPeer(rawChannel);

      expect(normalized.entityType).toBe('channel');
      expect(normalized.telegramPeerId).toBe('1888999000');
      expect(normalized.telegramChatId).toBe('1888999000');
      expect(normalized.telegramDisplayName).toBe('Global Tech News');
      expect(normalized.telegramPublicUrl).toBe('https://t.me/global_tech');
    });
  });

  describe('Display Name Fallback Resolution (SPEC-03 §5)', () => {
    it('uses custom display name when set by user', () => {
      const resolved = resolveDisplayName({
        telegramDisplayName: 'Farhad Majidi',
        customProfile: { customDisplayName: 'Coach Farhad' },
      });
      expect(resolved).toBe('Coach Farhad');
    });

    it('falls back to telegram display name when custom name is empty or null', () => {
      const resolved = resolveDisplayName({
        telegramDisplayName: 'Farhad Majidi',
        customProfile: { customDisplayName: null },
      });
      expect(resolved).toBe('Farhad Majidi');
    });

    it('falls back to default when both names are absent', () => {
      const resolved = resolveDisplayName({
        telegramDisplayName: null,
        customProfile: null,
      });
      expect(resolved).toBe('Telegram User');
    });
  });

  describe('Categorized Dialogs & Filtering (FR-CHAT-001, FR-CHAT-005)', () => {
    it('filters dialogs by Private Chats (pv), including archived users without data loss', async () => {
      const result = await dialogsService.getDialogs({ category: 'pv' });
      expect(result.items.every((d) => d.entityType === 'user')).toBe(true);
      expect(result.items.some((d) => d.id === 'ent-105' && d.isArchived)).toBe(true);
    });

    it('filters dialogs by Groups (groups) combining groups and supergroups', async () => {
      const result = await dialogsService.getDialogs({ category: 'groups' });
      expect(
        result.items.every((d) => d.entityType === 'group' || d.entityType === 'supergroup')
      ).toBe(true);
    });

    it('filters dialogs by Supergroups (supergroups)', async () => {
      const result = await dialogsService.getDialogs({ category: 'supergroups' });
      expect(result.items.every((d) => d.entityType === 'supergroup')).toBe(true);
    });

    it('filters dialogs by Channels (channels)', async () => {
      const result = await dialogsService.getDialogs({ category: 'channels' });
      expect(result.items.every((d) => d.entityType === 'channel')).toBe(true);
    });

    it('filters dialogs by Archived (archived)', async () => {
      const result = await dialogsService.getDialogs({ category: 'archived' });
      expect(result.items.every((d) => d.isArchived)).toBe(true);
    });

    it('filters dialogs by search query (q) and handles @ prefix and normalization', async () => {
      const result = await dialogsService.getDialogs({ q: 'Farhad' });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].displayName).toBe('Farhad Majidi');

      const resultHandle = await dialogsService.getDialogs({ q: '@farhad7' });
      expect(resultHandle.items).toHaveLength(1);
      expect(resultHandle.items[0].username).toBe('farhad7');
    });

    it('refreshes entity metadata successfully without touching custom profile', async () => {
      const refreshed = await dialogsService.refreshEntity('ent-101');
      expect(refreshed.id).toBe('ent-101');
      expect(refreshed.customProfile?.customDisplayName).toBe('Coach Farhad');
    });
  });
});
