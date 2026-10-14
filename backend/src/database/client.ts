import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from './schema/index.js';
import { env } from '../config/env.js';

let pool: Pool | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDatabase() {
  if (!dbInstance) {
    pool = new Pool({ connectionString: env.DATABASE_URL });
    dbInstance = drizzle({ client: pool, schema });
  }
  return dbInstance;
}

export const db = getDatabase();
