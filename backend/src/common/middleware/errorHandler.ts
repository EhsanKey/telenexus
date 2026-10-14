import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors.js';
import { createErrorEnvelope } from '../envelope.js';

/**
 * Universal Error Handling Middleware
 * Converts all errors into the standard Universal Error Envelope (SPEC-01 & SPEC-09).
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 1. Domain Application Errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json(
      createErrorEnvelope(err.code, err.message, err.fields)
    );
    return;
  }

  // 2. Zod Validation Errors
  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) {
      const fieldPath = issue.path.join('.') || 'body';
      fields[fieldPath] = issue.message;
    }
    res.status(400).json(
      createErrorEnvelope('VALIDATION_FAILED', 'Input validation failed', fields)
    );
    return;
  }

  // 3. Fallback for Unhandled Internal Errors (Redact stack traces)
  const message = err instanceof Error ? err.message : 'Unknown internal server error';
  res.status(500).json(
    createErrorEnvelope('INTERNAL_ERROR', message)
  );
}
