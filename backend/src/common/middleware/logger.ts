import pino from 'pino';

/**
 * Redacted Structured Logger
 * Enforces SPEC-01 & SPEC-09 Invariants:
 * - NO Telegram message text or captions in logs
 * - NO passwords, session keys, tokens, or hashes in logs
 */
const REDACTED_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'sessionString',
  'password',
  'code',
  'phoneCodeHash',
  'apiHash',
  'telegramApiHash',
  'telegramSessionSecret',
  'text',
  'caption',
  'message',
  'messages[*].text',
  'messages[*].caption',
];

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: REDACTED_PATHS,
    censor: '[REDACTED]',
  },
  transport:
    process.env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});
