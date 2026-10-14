import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env file (supports both backend/ and monorepo root execution)
dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().optional().default('postgresql://user:pass@localhost:5432/sot_db'),
  TELEGRAM_API_ID: z.coerce.number().optional().default(12345678),
  TELEGRAM_API_HASH: z.string().optional().default('sample_hash_for_dev_init'),
  TELEGRAM_SESSION_SECRET: z.string().optional().default('dev_session_secret_32bytes_long!'),
  TELEGRAM_PROXY_HOST: z.string().optional(),
  TELEGRAM_PROXY_PORT: z.coerce.number().optional(),
  TELEGRAM_PROXY_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional().default('http://localhost:3000/api/backend/backups/drive/callback'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('Invalid environment configuration:', parsedEnv.error.format());
  throw new Error('Environment configuration validation failed');
}

export const env = parsedEnv.data;
