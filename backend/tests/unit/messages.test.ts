import { describe, it, expect } from 'vitest';
import {
  classifyTelegramMedia,
  normalizeTelegramMessage,
  MEDIA_INDICATOR_LABELS,
  type MediaType,
} from '../../src/features/telegram/message-normalizer.js';
import { dialogsService } from '../../src/features/telegram/service.js';

describe('Ephemeral Message Viewer & Media Indicator Engine (SPEC-04)', () => {
  describe('Media Classification Taxonomy (SPEC-04 §4)', () => {
    it('classifies photo media', () => {
      const photoMedia = { className: 'MessageMediaPhoto', photo: { id: 'ph1' } };
      expect(classifyTelegramMedia(photoMedia)).toBe('photo');
    });

    it('classifies video document', () => {
      const videoMedia = {
        className: 'MessageMediaDocument',
        document: {
          mimeType: 'video/mp4',
          attributes: [{ className: 'DocumentAttributeVideo', roundMessage: false }],
        },
      };
      expect(classifyTelegramMedia(videoMedia)).toBe('video');
    });

    it('classifies round video note', () => {
      const videoNoteMedia = {
        className: 'MessageMediaDocument',
        document: {
          mimeType: 'video/mp4',
          attributes: [{ className: 'DocumentAttributeVideo', roundMessage: true }],
        },
      };
      expect(classifyTelegramMedia(videoNoteMedia)).toBe('video_note');
    });

    it('classifies voice message document', () => {
      const voiceMedia = {
        className: 'MessageMediaDocument',
        document: {
          mimeType: 'audio/ogg',
          attributes: [{ className: 'DocumentAttributeAudio', voice: true }],
        },
      };
      expect(classifyTelegramMedia(voiceMedia)).toBe('voice');
    });

    it('classifies general audio file', () => {
      const audioMedia = {
        className: 'MessageMediaDocument',
        document: {
          mimeType: 'audio/mpeg',
          attributes: [{ className: 'DocumentAttributeAudio', voice: false }],
        },
      };
      expect(classifyTelegramMedia(audioMedia)).toBe('audio');
    });

    it('classifies sticker', () => {
      const stickerMedia = {
        className: 'MessageMediaDocument',
        document: {
          mimeType: 'image/webp',
          attributes: [{ className: 'DocumentAttributeSticker' }],
        },
      };
      expect(classifyTelegramMedia(stickerMedia)).toBe('sticker');
    });

    it('classifies animation / GIF', () => {
      const animatedMedia = {
        className: 'MessageMediaDocument',
        document: {
          mimeType: 'video/mp4',
          attributes: [{ className: 'DocumentAttributeAnimated' }],
        },
      };
      expect(classifyTelegramMedia(animatedMedia)).toBe('animation');
    });

    it('classifies general document', () => {
      const docMedia = {
        className: 'MessageMediaDocument',
        document: {
          mimeType: 'application/pdf',
          attributes: [],
        },
      };
      expect(classifyTelegramMedia(docMedia)).toBe('document');
    });

    it('classifies location and contact', () => {
      expect(classifyTelegramMedia({ className: 'MessageMediaGeo' })).toBe('location');
      expect(classifyTelegramMedia({ className: 'MessageMediaContact' })).toBe('contact');
    });

    it('classifies unsupported media as unknown and null for no media', () => {
      expect(classifyTelegramMedia({ className: 'MessageMediaDice' })).toBe('unknown');
      expect(classifyTelegramMedia(null)).toBeNull();
      expect(classifyTelegramMedia(undefined)).toBeNull();
    });

    it('maps every MediaType to an exact UI visual placeholder according to SPEC-04 §4', () => {
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
  });

  describe('Message Normalization (SPEC-04 §5.1)', () => {
    it('normalizes incoming text message with ISO date and sender', () => {
      const raw = {
        id: 140293,
        senderId: '987654321',
        senderName: 'Farhad Majidi',
        out: false,
        date: 1776102340,
        message: 'Salam coach, tamrin saat chandeh?',
        media: null,
      };

      const normalized = normalizeTelegramMessage(raw, 'current_user');
      expect(normalized.messageId).toBe(140293);
      expect(normalized.sender.id).toBe('987654321');
      expect(normalized.sender.name).toBe('Farhad Majidi');
      expect(normalized.sender.isOutgoing).toBe(false);
      expect(normalized.text).toBe('Salam coach, tamrin saat chandeh?');
      expect(normalized.mediaType).toBeNull();
      expect(normalized.replyToMessageId).toBeNull();
      expect(normalized.date).toBe(new Date(1776102340 * 1000).toISOString());
    });

    it('normalizes outgoing media message with reply target', () => {
      const raw = {
        id: 140294,
        out: true,
        date: 1776102400,
        message: 'Check in contract file lotfan',
        media: {
          className: 'MessageMediaDocument',
          document: { mimeType: 'application/pdf', attributes: [] },
        },
        replyTo: { replyToMsgId: 140293 },
      };

      const normalized = normalizeTelegramMessage(raw, 'current_user');
      expect(normalized.messageId).toBe(140294);
      expect(normalized.sender.isOutgoing).toBe(true);
      expect(normalized.sender.name).toBe('You');
      expect(normalized.mediaType).toBe('document');
      expect(normalized.replyToMessageId).toBe(140293);
    });
  });

  describe('Transient Dialogs Service Message Fetching', () => {
    it('fetches transient message stream for peer without persistent storage', async () => {
      const result = await dialogsService.getMessages('987654321', { limit: 10 });
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items[0]).toHaveProperty('messageId');
      expect(result.items[0]).toHaveProperty('sender');
      expect(result.items[0]).toHaveProperty('date');
    });

    it('supports cursor pagination via offsetId', async () => {
      const all = await dialogsService.getMessages('987654321', { limit: 10 });
      if (all.items.length > 1) {
        const secondMsgId = all.items[1]?.messageId;
        const pageAfter = await dialogsService.getMessages('987654321', {
          offsetId: secondMsgId,
          limit: 10,
        });

        for (const item of pageAfter.items) {
          expect(item.messageId).toBeLessThan(secondMsgId!);
        }
      }
    });
  });
});
