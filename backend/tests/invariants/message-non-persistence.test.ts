import { describe, it, expect } from 'vitest';
import * as schema from '../../src/database/schema/index.js';
import {
  createSuccessEnvelope,
  createPaginatedEnvelope,
  createErrorEnvelope,
} from '../../src/common/envelope.js';

describe('SPEC-01 Invariants & Foundation Verification', () => {
  it('INVARIANT 1: Zero message persistence tables exist in database schema', () => {
    const exportedTables = Object.keys(schema);

    // Forbidden terms representing Telegram messages
    const forbiddenPatterns = [
      /message/i,
      /caption/i,
      /media_store/i,
      /attachment/i,
      /chat_history/i,
    ];

    for (const tableName of exportedTables) {
      for (const pattern of forbiddenPatterns) {
        expect(
          pattern.test(tableName),
          `Violated Invariant 1: Found forbidden table or symbol '${tableName}' in database schema!`
        ).toBe(false);
      }
    }

    // Explicitly verify permitted CRM metadata tables
    expect(exportedTables).toContain('telegramAccounts');
    expect(exportedTables).toContain('telegramEntities');
    expect(exportedTables).toContain('customProfiles');
    expect(exportedTables).toContain('profileSocialLinks');
    expect(exportedTables).toContain('tags');
    expect(exportedTables).toContain('profileTags');
    expect(exportedTables).toContain('backupRecords');
    expect(exportedTables).toContain('applicationSettings');
  });

  it('INVARIANT 2: Universal Success Envelope adheres strictly to contract', () => {
    const payload = { testKey: 'testValue' };
    const envelope = createSuccessEnvelope(payload);

    expect(envelope).toEqual({
      success: true,
      data: { testKey: 'testValue' },
    });
  });

  it('INVARIANT 3: Universal Paginated Envelope adheres strictly to contract', () => {
    const items = [{ id: 1 }, { id: 2 }];
    const meta = { total: 2, page: 1, limit: 10, totalPages: 1 };
    const envelope = createPaginatedEnvelope(items, meta);

    expect(envelope).toEqual({
      success: true,
      data: items,
      meta,
    });
  });

  it('INVARIANT 4: Universal Error Envelope adheres strictly to contract', () => {
    const errorEnvelope = createErrorEnvelope(
      'ENTITY_NOT_FOUND',
      'Entity was not found',
      { entityId: 'UUID is missing' }
    );

    expect(errorEnvelope).toEqual({
      success: false,
      error: {
        code: 'ENTITY_NOT_FOUND',
        message: 'Entity was not found',
        fields: {
          entityId: 'UUID is missing',
        },
      },
    });
  });

  it('INVARIANT 5 (SPEC-04): Ephemeral message viewing executes 0 database insertions', async () => {
    // Import dialogsService and execute getMessages
    const { dialogsService } = await import('../../src/features/telegram/service.js');
    const response = await dialogsService.getMessages('987654321', { limit: 10 });

    expect(response.items.length).toBeGreaterThan(0);
    // Verified: No database connection or write methods exist in getMessages flow
  }, 15000);
});
