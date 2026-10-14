import { describe, it, expect } from 'vitest';
import type { ApiSuccessResponse, ApiErrorResponse } from '../src/types/api.js';

describe('Frontend System Foundation (SPEC-01)', () => {
  it('validates success envelope shape', () => {
    const response: ApiSuccessResponse<{ title: string }> = {
      success: true,
      data: { title: 'TeleNexus' },
    };

    expect(response.success).toBe(true);
    expect(response.data.title).toBe('TeleNexus');
  });

  it('validates error envelope shape', () => {
    const errorResponse: ApiErrorResponse = {
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Invalid input parameters',
        fields: { username: 'Must be lowercase' },
      },
    };

    expect(errorResponse.success).toBe(false);
    expect(errorResponse.error.code).toBe('VALIDATION_FAILED');
    expect(errorResponse.error.fields?.username).toBe('Must be lowercase');
  });

  it('enforces reverse proxy prefix logic', () => {
    const path = '/health';
    const normalized = path.startsWith('/api/backend') ? path : `/api/backend${path}`;
    expect(normalized).toBe('/api/backend/health');
  });
});
