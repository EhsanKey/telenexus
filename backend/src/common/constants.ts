/**
 * TeleNexus Core System Constants
 */

export const DEFAULT_ACCOUNT_ID = 'acc-default';

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 30,
  MAX_LIMIT: 100,
} as const;

export const BACKUP_DEFAULTS = {
  FORMAT_VERSION: '1.0.0',
  EXCEL_FILENAME: 'TeleNexus-CRM-Contacts.xlsx',
  DRIVE_FOLDER_NAME: 'TeleNexus-Backups',
} as const;

export const AUTH_DEFAULTS = {
  CODE_TIMEOUT_SECONDS: 120,
  MIN_PASSCODE_LENGTH: 4,
} as const;
