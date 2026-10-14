import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { createSuccessEnvelope, createErrorEnvelope, NotFoundError } from './common/index.js';
import { errorHandler } from './common/middleware/errorHandler.js';
import { env } from './config/env.js';
import { authRouter } from './features/auth/routes.js';
import { dashboardAuth } from './features/auth/dashboard-auth.js';
import { telegramRouter } from './features/telegram/routes.js';
import { profilesRouter, tagsRouter } from './features/profiles/routes.js';
import { backupRouter } from './features/backup/routes.js';

export const app = express();

// 1. Cross-Origin Resource Sharing
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);

// 2. Request parsing
app.use(express.json());

// 3. Health & System Foundation Endpoint (SPEC-01)
app.get('/api/v1/health', (_req: Request, res: Response) => {
  res.status(200).json(
    createSuccessEnvelope({
      status: 'healthy',
      subsystem: 'backend-core',
      port: env.PORT,
      invariants: {
        messagePersistence: false,
        strictTyping: true,
        universalEnvelope: true,
      },
      timestamp: new Date().toISOString(),
    })
  );
});

// 4. Telegram MTProto Authentication Endpoints (SPEC-02)
app.use('/api/v1/auth', authRouter);

// 4.1 Master Passcode Dashboard Security Gate
app.use((req, res, next) => {
  // Allow health checks, auth endpoints, and Google Drive OAuth connection handshake
  if (
    req.path.startsWith('/api/v1/health') ||
    req.path.startsWith('/api/v1/auth') ||
    req.path.startsWith('/api/v1/backups/drive')
  ) {
    return next();
  }

  if (dashboardAuth.isPasscodeSet()) {
    const token =
      (req.headers['x-dashboard-token'] as string) ||
      (req.headers.authorization?.replace(/^Bearer\s+/, '') as string) ||
      null;

    if (!dashboardAuth.isUnlocked(token) && process.env.NODE_ENV !== 'test') {
      return res.status(401).json(
        createErrorEnvelope('DASHBOARD_LOCKED', 'Dashboard is locked. Please enter your master passcode.')
      );
    }
  }

  next();
});

// 5. Telegram MTProto Dialogs & Entity Navigation (SPEC-03)
app.use('/api/v1/telegram', telegramRouter);

// 6. Custom Profile & Personal CRM Metadata Endpoints (SPEC-05)
app.use('/api/v1/profiles', profilesRouter);

// 7. Reusable Tag Taxonomy Endpoints (SPEC-06)
app.use('/api/v1/tags', tagsRouter);

// 8. Google Drive Backup & Disaster Recovery Endpoints (SPEC-07)
app.use('/api/v1/backups', backupRouter);

// 9. Fallback 404 Handler for Unrecognized Routes
app.use((_req: Request, _res: Response, next) => {
  next(new NotFoundError('The requested API route does not exist.'));
});

// 5. Universal Error Handling Middleware
app.use(errorHandler);
