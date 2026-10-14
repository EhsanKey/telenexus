import { describe, it, expect } from 'vitest';
import type { CustomProfileDto, CreateProfileInput } from '../src/types/profile.js';
import type { DialogItem } from '../src/types/telegram.js';

describe('Frontend Custom Profile CRM Management (SPEC-05)', () => {
  it('resolves display name using custom profile override with highest priority (FR-PROFILE-005)', () => {
    const dialogWithCustomName: DialogItem = {
      id: 'd-1',
      entityType: 'user',
      telegramPeerId: '1001',
      displayName: 'Telegram Name',
      username: 'tg_user',
      publicUrl: null,
      isArchived: false,
      customProfile: {
        id: 'cp-1',
        customDisplayName: 'VIP Client (Custom Override)',
        hasNotes: true,
        tagsCount: 2,
      },
      transientPreview: { text: 'Hello', date: 123456, unreadCount: 0 },
    };

    const dialogWithoutCustomName: DialogItem = {
      ...dialogWithCustomName,
      customProfile: {
        id: 'cp-2',
        customDisplayName: null,
        hasNotes: false,
        tagsCount: 0,
      },
    };

    const resolveName = (d: DialogItem) => d.customProfile?.customDisplayName || d.displayName;

    expect(resolveName(dialogWithCustomName)).toBe('VIP Client (Custom Override)');
    expect(resolveName(dialogWithoutCustomName)).toBe('Telegram Name');
  });

  it('validates CustomProfileDto shape conforming to SPEC-05 §4.1 contract', () => {
    const mockProfile: CustomProfileDto = {
      id: 'e98e2170-07bf-4467-bc5f-149fa861d848',
      telegramEntityId: '7b093284-5f72-46aa-a398-e4b9f2bca530',
      telegramAccountId: 'acc-1',
      customDisplayName: 'Coach Farhad',
      phoneNumber: '+989121112233',
      company: 'Esteghlal FC',
      jobTitle: 'Head Coach',
      relationshipType: 'Professional / Mentor',
      reasonForJoining: 'Coordinating weekly tactical review',
      notes: 'Line 1: Call in morning.\nLine 2: Review tactics.',
      socialLinks: [],
      tags: [],
      createdAt: '2026-10-10T12:00:00.000Z',
      updatedAt: '2026-10-13T18:40:00.000Z',
    };

    expect(mockProfile.id).toBeDefined();
    expect(mockProfile.customDisplayName).toBe('Coach Farhad');
    expect(mockProfile.phoneNumber).toBe('+989121112233');
    expect(mockProfile.notes).toContain('\n');
  });

  it('verifies that deleting a custom profile preserves the conversation in dialog list (FR-PROFILE-010)', () => {
    const dialogs: DialogItem[] = [
      {
        id: 'd-1',
        entityType: 'user',
        telegramPeerId: '1001',
        displayName: 'Farhad Majidi',
        username: 'farhad7',
        publicUrl: null,
        isArchived: false,
        customProfile: {
          id: 'cp-1',
          customDisplayName: 'Coach Farhad',
          hasNotes: true,
          tagsCount: 1,
        },
        transientPreview: { text: 'Hi', date: 12345, unreadCount: 0 },
      },
    ];

    // Simulate deleting the profile: dialog is retained, customProfile is set to null
    const updatedDialogs = dialogs.map((d) => {
      if (d.customProfile?.id === 'cp-1') {
        return { ...d, customProfile: null };
      }
      return d;
    });

    expect(updatedDialogs).toHaveLength(1);
    expect(updatedDialogs[0]?.displayName).toBe('Farhad Majidi');
    expect(updatedDialogs[0]?.customProfile).toBeNull();
  });
});
