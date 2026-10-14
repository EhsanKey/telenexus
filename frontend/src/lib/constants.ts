/**
 * TeleNexus Frontend Application Constants
 */

export const STORAGE_KEYS = {
  DASHBOARD_TOKEN: 'tn_dashboard_token',
} as const;

export const PAGINATION_DEFAULTS = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 30,
  SCROLL_THRESHOLD_PX: 120,
} as const;

export const PRESET_TAG_COLORS: readonly string[] = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EF4444', // Rose
  '#EC4899', // Pink
  '#06B6D4', // Cyan
];
