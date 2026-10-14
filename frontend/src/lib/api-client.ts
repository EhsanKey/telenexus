import type {
  ApiSuccessResponse,
  ApiPaginatedResponse,
  ApiErrorResponse,
  PaginationMeta,
} from '@/types/api';
import { STORAGE_KEYS } from './constants';

export class ApiClientError extends Error {
  public readonly code: string;
  public readonly fields?: Record<string, string>;

  constructor(code: string, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.fields = fields;
  }
}

let inMemoryDashboardToken: string | null = null;

export function setDashboardToken(token: string | null): void {
  inMemoryDashboardToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem(STORAGE_KEYS.DASHBOARD_TOKEN, token);
    } else {
      localStorage.removeItem(STORAGE_KEYS.DASHBOARD_TOKEN);
    }
  }
}

export function getDashboardToken(): string | null {
  if (inMemoryDashboardToken) return inMemoryDashboardToken;
  if (typeof window !== 'undefined') {
    return localStorage.getItem(STORAGE_KEYS.DASHBOARD_TOKEN);
  }
  return null;
}

/**
 * Base HTTP fetcher for single-entity endpoints.
 * Invariant: Always prefixes calls with `/api/backend/*` (Reverse Proxy Enclosure).
 */
export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const targetUrl = normalizedPath.startsWith('/api/backend')
    ? normalizedPath
    : `/api/backend${normalizedPath}`;

  const token = getDashboardToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { 'x-dashboard-token': token } : {}),
    ...(options?.headers as Record<string, string>),
  };

  const response = await fetch(targetUrl, {
    headers,
    ...options,
  });

  let payload: ApiSuccessResponse<T> | ApiErrorResponse;
  const rawText = await response.text();
  try {
    payload = JSON.parse(rawText) as ApiSuccessResponse<T> | ApiErrorResponse;
  } catch {
    throw new ApiClientError(
      'SERVER_ERROR',
      `Server returned an invalid or non-JSON response (${response.status} ${response.statusText || 'Internal Server Error'}). The backend server may still be spinning up. Please try again in a few moments.`
    );
  }

  if (!payload.success) {
    throw new ApiClientError(
      payload.error.code,
      payload.error.message,
      payload.error.fields
    );
  }

  return payload.data;
}

/**
 * Base HTTP fetcher for paginated collection endpoints.
 */
export async function apiFetchPaginated<T>(
  path: string,
  options?: RequestInit
): Promise<{ data: T[]; meta: PaginationMeta }> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const targetUrl = normalizedPath.startsWith('/api/backend')
    ? normalizedPath
    : `/api/backend${normalizedPath}`;

  const token = getDashboardToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { 'x-dashboard-token': token } : {}),
    ...(options?.headers as Record<string, string>),
  };

  const response = await fetch(targetUrl, {
    headers,
    ...options,
  });

  let payload: ApiPaginatedResponse<T> | ApiErrorResponse;
  const rawText = await response.text();
  try {
    payload = JSON.parse(rawText) as ApiPaginatedResponse<T> | ApiErrorResponse;
  } catch {
    throw new ApiClientError(
      'SERVER_ERROR',
      `Server returned an invalid or non-JSON response (${response.status} ${response.statusText || 'Internal Server Error'}). The backend server may still be spinning up. Please try again in a few moments.`
    );
  }

  if (!payload.success) {
    throw new ApiClientError(
      payload.error.code,
      payload.error.message,
      payload.error.fields
    );
  }

  return { data: payload.data, meta: payload.meta };
}
