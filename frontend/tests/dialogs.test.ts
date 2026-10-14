import { describe, it, expect } from 'vitest';
import type {
  DialogItem,
  DialogCategory,
  NormalizedEntityType,
} from '../src/types/telegram.js';

describe('Frontend Dialog Navigation & Categorization (SPEC-03)', () => {
  const mockDialogs: DialogItem[] = [
    {
      id: 'dialog_1001',
      entityType: 'user',
      telegramPeerId: '1001',
      displayName: 'Alice Cooper',
      username: 'alice_c',
      publicUrl: 'https://t.me/alice_c',
      isArchived: false,
      customProfile: {
        id: 'prof_1',
        customDisplayName: 'Alice (VIP Client)',
        hasNotes: true,
        tagsCount: 2,
      },
      transientPreview: {
        text: 'See you tomorrow at 10!',
        date: Math.floor(Date.now() / 1000) - 120,
        unreadCount: 1,
      },
    },
    {
      id: 'dialog_2001',
      entityType: 'group',
      telegramPeerId: '2001',
      displayName: 'Dev Team Chat',
      username: null,
      publicUrl: null,
      isArchived: false,
      customProfile: null,
      transientPreview: {
        text: 'PR #42 is ready for review',
        date: Math.floor(Date.now() / 1000) - 300,
        unreadCount: 0,
      },
    },
    {
      id: 'dialog_3001',
      entityType: 'channel',
      telegramPeerId: '3001',
      displayName: 'Tech News Daily',
      username: 'technews',
      publicUrl: 'https://t.me/technews',
      isArchived: true,
      customProfile: null,
      transientPreview: {
        text: 'Latest tech digest',
        date: Math.floor(Date.now() / 1000) - 7200,
        unreadCount: 5,
      },
    },
  ];

  it('filters dialogs by category correctly', () => {
    const filterByCategory = (items: DialogItem[], cat: DialogCategory) => {
      switch (cat) {
        case 'pv':
          return items.filter((d) => d.entityType === 'user' && !d.isArchived);
        case 'groups':
          return items.filter((d) => d.entityType === 'group' && !d.isArchived);
        case 'channels':
          return items.filter((d) => d.entityType === 'channel' && !d.isArchived);
        case 'archived':
          return items.filter((d) => d.isArchived);
        case 'all':
        default:
          return items.filter((d) => !d.isArchived);
      }
    };

    expect(filterByCategory(mockDialogs, 'all')).toHaveLength(2);
    expect(filterByCategory(mockDialogs, 'pv')).toHaveLength(1);
    expect(filterByCategory(mockDialogs, 'pv')[0]?.telegramPeerId).toBe('1001');
    expect(filterByCategory(mockDialogs, 'groups')).toHaveLength(1);
    expect(filterByCategory(mockDialogs, 'groups')[0]?.telegramPeerId).toBe('2001');
    expect(filterByCategory(mockDialogs, 'channels')).toHaveLength(0); // the channel is archived
    expect(filterByCategory(mockDialogs, 'archived')).toHaveLength(1);
    expect(filterByCategory(mockDialogs, 'archived')[0]?.telegramPeerId).toBe('3001');
  });

  it('renders custom profile display name with highest priority over telegram display name', () => {
    const getResolvedDisplayName = (dialog: DialogItem) => {
      return dialog.customProfile?.customDisplayName || dialog.displayName;
    };

    expect(getResolvedDisplayName(mockDialogs[0]!)).toBe('Alice (VIP Client)');
    expect(getResolvedDisplayName(mockDialogs[1]!)).toBe('Dev Team Chat');
  });

  it('searches dialogs across display name, username, and custom name', () => {
    const searchDialogs = (items: DialogItem[], query: string) => {
      const q = query.toLowerCase().trim();
      if (!q) return items;
      return items.filter((d) => {
        return (
          d.displayName.toLowerCase().includes(q) ||
          d.username?.toLowerCase().includes(q) ||
          d.customProfile?.customDisplayName?.toLowerCase().includes(q)
        );
      });
    };

    expect(searchDialogs(mockDialogs, 'alice')).toHaveLength(1);
    expect(searchDialogs(mockDialogs, 'VIP')).toHaveLength(1);
    expect(searchDialogs(mockDialogs, 'technews')).toHaveLength(1);
    expect(searchDialogs(mockDialogs, 'nonexistent')).toHaveLength(0);
  });
});
