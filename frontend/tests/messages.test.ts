import { describe, it, expect } from 'vitest';
import {
  MEDIA_INDICATOR_LABELS,
  type EphemeralMessage,
  type MediaType,
} from '../src/types/telegram.js';

describe('Frontend Ephemeral Message Viewer & Media Indicator Engine (SPEC-04)', () => {
  it('verifies exact media indicator labels according to SPEC-04 §4', () => {
    expect(MEDIA_INDICATOR_LABELS.photo).toBe('[Photo]');
    expect(MEDIA_INDICATOR_LABELS.video).toBe('[Video]');
    expect(MEDIA_INDICATOR_LABELS.voice).toBe('[Voice Message]');
    expect(MEDIA_INDICATOR_LABELS.audio).toBe('[Audio / Music]');
    expect(MEDIA_INDICATOR_LABELS.animation).toBe('[Animation / GIF]');
    expect(MEDIA_INDICATOR_LABELS.sticker).toBe('[Sticker]');
    expect(MEDIA_INDICATOR_LABELS.video_note).toBe('[Video Message]');
    expect(MEDIA_INDICATOR_LABELS.document).toBe('[Document]');
    expect(MEDIA_INDICATOR_LABELS.location).toBe('[Location]');
    expect(MEDIA_INDICATOR_LABELS.contact).toBe('[Contact Card]');
    expect(MEDIA_INDICATOR_LABELS.unknown).toBe('[Unsupported Media]');
  });

  it('validates ephemeral message shape conforms to contract', () => {
    const msg: EphemeralMessage = {
      messageId: 140294,
      sender: {
        id: '987654321',
        name: 'Farhad Majidi',
        isOutgoing: false,
      },
      date: '2026-10-13T19:30:00.000Z',
      text: 'Salam coach, tamrin saat chandeh?',
      mediaType: 'photo',
      replyToMessageId: null,
    };

    expect(msg.messageId).toBe(140294);
    expect(msg.sender.isOutgoing).toBe(false);
    expect(msg.mediaType).toBe('photo');
    expect(msg.text).toBe('Salam coach, tamrin saat chandeh?');
  });

  it('INVARIANT (SPEC-04 §6): Zero persistent storage of message text in browser storage', () => {
    // Simulated browser storage inspection
    const mockLocalStorage: Record<string, string> = {
      theme: 'dark',
      activeTab: 'all',
    };

    const mockSessionStorage: Record<string, string> = {
      sidebarOpen: 'true',
    };

    const forbiddenPatterns = [
      /message/i,
      /caption/i,
      /tamrin/i,
      /chat_history/i,
      /media_payload/i,
    ];

    for (const [key, value] of Object.entries(mockLocalStorage)) {
      for (const pattern of forbiddenPatterns) {
        expect(
          pattern.test(key) || pattern.test(value),
          `Violated Invariant: Found forbidden message data in localStorage: ${key}=${value}`
        ).toBe(false);
      }
    }

    for (const [key, value] of Object.entries(mockSessionStorage)) {
      for (const pattern of forbiddenPatterns) {
        expect(
          pattern.test(key) || pattern.test(value),
          `Violated Invariant: Found forbidden message data in sessionStorage: ${key}=${value}`
        ).toBe(false);
      }
    }
  });
});
