import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './common/index.js';
import { telegramService } from './features/auth/telegram-client.js';
import { dashboardAuth } from './features/auth/dashboard-auth.js';
import { backupService } from './features/backup/service.js';
import { profilesService } from './features/profiles/service.js';

async function bootstrap() {
  // Pre-load all persistent sessions and CRM metadata from Neon PostgreSQL on boot
  // This guarantees that when server restarts or Render container wakes up from sleep:
  // 1. Telegram session is already restored (no re-login or code required)
  // 2. Dashboard master passcode is already loaded (no recreate passcode modal)
  // 3. Google Drive OAuth tokens are restored (no re-authentication)
  // 4. Custom CRM profiles, tags, and notes are restored from database
  try {
    await Promise.allSettled([
      telegramService.initialize(),
      dashboardAuth.loadPasscode(),
      backupService.restorePersistentDriveSession(),
      profilesService.initialize(),
    ]);
  } catch (err) {
    logger.warn({ err }, 'Notice during pre-boot state restoration');
  }

  const server = app.listen(env.PORT, '0.0.0.0', () => {
    logger.info(
      `[TeleNexus] Backend server running on http://localhost:${env.PORT} in ${env.NODE_ENV} mode`
    );
    logger.info(`Health check available at http://localhost:${env.PORT}/api/v1/health`);
  });

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
      logger.info('Process terminated.');
      process.exit(0);
    });
  });
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Fatal error during server bootstrap');
  process.exit(1);
});

