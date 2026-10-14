/**
 * Standard Application Error Taxonomy (SPEC-09)
 * Authoritative SSOT: specs/SPEC-09-security-privacy-error-taxonomy.md
 */

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly fields?: Record<string, string>;

  constructor(
    code: string,
    message: string,
    statusCode: number = 400,
    fields?: Record<string, string>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.fields = fields;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, fields?: Record<string, string>) {
    super('VALIDATION_FAILED', message, 400, fields);
  }
}

export class AuthRequiredError extends AppError {
  constructor(message: string = 'Telegram account authentication is required.') {
    super('AUTH_REQUIRED', message, 401);
  }
}

export class SessionInvalidError extends AppError {
  constructor(message: string = 'Telegram session has expired or been revoked.') {
    super('SESSION_INVALID', message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'You do not have permission to access this resource.') {
    super('FORBIDDEN', message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'The requested entity was not found.') {
    super('ENTITY_NOT_FOUND', message, 404);
  }
}

export class FloodWaitError extends AppError {
  public readonly retryAfterSeconds: number;

  constructor(seconds: number, message?: string) {
    super(
      'FLOOD_WAIT',
      message || `Telegram rate limit triggered. Please wait ${seconds} seconds before retrying.`,
      429,
      { retryAfterSeconds: String(seconds) }
    );
    this.retryAfterSeconds = seconds;
  }
}

export class TelegramUnavailableError extends AppError {
  constructor(message: string = 'Telegram service is temporarily unreachable.') {
    super('TELEGRAM_UNAVAILABLE', message, 503);
  }
}

export class DriveAuthExpiredError extends AppError {
  constructor(message: string = 'Google Drive authorization has expired.') {
    super('DRIVE_AUTH_EXPIRED', message, 401);
  }
}

export class BackupCorruptedError extends AppError {
  constructor(message: string = 'The backup file is malformed or corrupted.') {
    super('BACKUP_CORRUPTED', message, 422);
  }
}

export class BackupDecryptError extends AppError {
  constructor(message: string = 'Failed to decrypt backup. Invalid passphrase.') {
    super('BACKUP_DECRYPT_FAILED', message, 400);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'A resource with these parameters already exists.') {
    super('CONFLICT_ERROR', message, 409);
  }
}

export class InternalError extends AppError {
  constructor(message: string = 'An unexpected internal error occurred.') {
    super('INTERNAL_ERROR', message, 500);
  }
}
