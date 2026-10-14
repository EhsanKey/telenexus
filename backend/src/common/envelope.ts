/**
 * Universal Response Envelope Standard (SPEC-01 & SPEC-09)
 * Authoritative SSOT: specs/SPEC-01-system-foundation.md
 */

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  nextCursor?: string | null;
  hasMore?: boolean;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiPaginatedResponse<T> {
  success: true;
  data: T[];
  meta: PaginationMeta;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  fields?: Record<string, string>;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorDetail;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiPaginatedResponse<T> | ApiErrorResponse;

/**
 * Creates a standard single-resource success envelope
 */
export function createSuccessEnvelope<T>(data: T): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
  };
}

/**
 * Creates a standard paginated collection success envelope
 */
export function createPaginatedEnvelope<T>(
  data: T[],
  meta: PaginationMeta
): ApiPaginatedResponse<T> {
  return {
    success: true,
    data,
    meta,
  };
}

/**
 * Creates a standard error envelope
 */
export function createErrorEnvelope(
  code: string,
  message: string,
  fields?: Record<string, string>
): ApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      ...(fields && Object.keys(fields).length > 0 ? { fields } : {}),
    },
  };
}
