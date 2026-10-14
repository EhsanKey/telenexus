/**
 * TeleNexus Database Cleanup Script
 * 
 * Supports granular and full database purges:
 *   --all        (-a) : Complete factory reset (clears all tables, settings, sessions, tokens)
 *   --mock-only  (-m) : Purges synthetic/mock seed data (Farhad, Sara, Esteghlal FC, etc.) while preserving real user contacts and sessions
 *   --crm-only   (-c) : Clears all CRM profiles, notes, social links, tags (keeps Telegram & Drive auth)
 *   --auth-only  (-s) : Clears Telegram sessions, accounts, Google Drive tokens, Dashboard passcode
 *   --backups    (-b) : Clears backup records history
 *   --dry-run    (-d) : Inspects and previews changes without executing
 *   --help       (-h) : Shows help message
 */

import { db } from './client.js';
import { sql, eq } from 'drizzle-orm';
import { applicationSettings } from './schema/settings.js';

// ANSI color styling
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

// Known synthetic/mock identifiers
const MOCK_PEER_IDS = new Set([
  '987654321',
  '123456789',
  '556677889',
  '998877665',
  '101',
  '102',
  '103',
  '104',
]);

const MOCK_NAMES = new Set([
  'Coach Farhad',
  'Sara (Backend Lead)',
  'Sara',
  'Esteghlal FC',
  'Core Architecture Group',
  'AI News Channel',
  'AI News & Tech Intel',
  'AI News',
]);

const MOCK_USERNAMES = new Set([
  'farhad7',
  'sara_dev',
  'telenexus_devs',
  'tech_intel_feed',
]);

const MOCK_PROFILE_IDS = new Set([
  'e98e2170-07bf-4467-bc5f-149fa861d848',
  'f12e2170-07bf-4467-bc5f-149fa861d849',
  'c34e2170-07bf-4467-bc5f-149fa861d850',
  'd56e2170-07bf-4467-bc5f-149fa861d851',
]);

type CleanMode = 'all' | 'mock-only' | 'empty-only' | 'crm-only' | 'auth-only' | 'backups-only' | 'help' | 'status';

interface ParsedOptions {
  mode: CleanMode;
  dryRun: boolean;
  force: boolean;
}

function parseArgs(args: string[]): ParsedOptions {
  const options: ParsedOptions = {
    mode: 'status',
    dryRun: false,
    force: false,
  };

  for (const arg of args) {
    const lower = arg.toLowerCase();
    if (lower === '--all' || lower === '-a' || lower === 'all' || lower === 'reset') {
      options.mode = 'all';
    } else if (lower === '--mock-only' || lower === '-m' || lower === '--mock' || lower === 'mock' || lower === 'mock-only') {
      options.mode = 'mock-only';
    } else if (lower === '--empty-only' || lower === '-e' || lower === '--empty' || lower === 'empty' || lower === 'empty-only') {
      options.mode = 'empty-only';
    } else if (lower === '--crm-only' || lower === '-c' || lower === '--crm' || lower === 'crm' || lower === 'crm-only') {
      options.mode = 'crm-only';
    } else if (lower === '--auth-only' || lower === '-s' || lower === '--auth' || lower === 'auth' || lower === 'auth-only') {
      options.mode = 'auth-only';
    } else if (lower === '--backups' || lower === '-b' || lower === 'backups' || lower === 'backups-only') {
      options.mode = 'backups-only';
    } else if (lower === '--dry-run' || lower === '-d' || lower === 'dry-run') {
      options.dryRun = true;
    } else if (lower === '--force' || lower === '-f' || lower === 'force') {
      options.force = true;
    } else if (lower === '--help' || lower === '-h' || lower === 'help') {
      options.mode = 'help';
    } else if (lower === '--status' || lower === 'status') {
      options.mode = 'status';
    }
  }

  return options;
}

function printBanner(): void {
  console.log(`\n${c.cyan}${c.bold}====================================================${c.reset}`);
  console.log(`${c.cyan}${c.bold}     TeleNexus Database Management & Purge Tool     ${c.reset}`);
  console.log(`${c.cyan}${c.bold}====================================================${c.reset}\n`);
}

function printHelp(): void {
  printBanner();
  console.log(`${c.bold}Usage:${c.reset}`);
  console.log(`  pnpm run db:clean [options]\n`);
  console.log(`${c.bold}Options:${c.reset}`);
  console.log(`  ${c.green}-m, --mock-only${c.reset}     Purge ONLY fake/mock seed data (Farhad, Sara, etc.).`);
  console.log(`                      ${c.dim}Preserves real contacts, Telegram sessions, and Google Drive auth.${c.reset}`);
  console.log(`  ${c.green}-e, --empty-only${c.reset}    Purge empty/unfilled profile shells (no name, notes, company, or tags).`);
  console.log(`  ${c.yellow}-c, --crm-only${c.reset}      Purge all CRM data (custom profiles, tags, notes, social links).`);
  console.log(`                      ${c.dim}Keeps Telegram session and Drive tokens intact.${c.reset}`);
  console.log(`  ${c.yellow}-s, --auth-only${c.reset}     Purge Telegram MTProto sessions, accounts, and Drive tokens.`);
  console.log(`                      ${c.dim}Keeps CRM profiles and tags.${c.reset}`);
  console.log(`  ${c.yellow}-b, --backups${c.reset}       Purge backup history records.`);
  console.log(`  ${c.red}-a, --all${c.reset}           ${c.bold}FACTORY RESET:${c.reset} Purges all tables, sessions, and settings.`);
  console.log(`  ${c.cyan}-d, --dry-run${c.reset}       Inspect and preview changes without modifying database.`);
  console.log(`  ${c.white}--status${c.reset}            Display current counts of all tables and settings (default).`);
  console.log(`  ${c.white}-h, --help${c.reset}          Display this help message.\n`);
  console.log(`${c.bold}Examples:${c.reset}`);
  console.log(`  ${c.dim}# Check database status:${c.reset}`);
  console.log(`  pnpm run db:clean --status\n`);
  console.log(`  ${c.dim}# Clean only synthetic mock data:${c.reset}`);
  console.log(`  pnpm run db:clean --mock-only\n`);
  console.log(`  ${c.dim}# Clean empty/blank profile placeholders:${c.reset}`);
  console.log(`  pnpm run db:clean --empty-only\n`);
  console.log(`  ${c.dim}# Full database reset:${c.reset}`);
  console.log(`  pnpm run db:clean --all\n`);
}

/**
 * Checks if a table exists in public schema
 */
async function tableExists(tableName: string): Promise<boolean> {
  try {
    const res = await db.execute(sql`
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = ${tableName}
    `);
    return (res.rows && res.rows.length > 0);
  } catch {
    return false;
  }
}

/**
 * Gets count of rows in table safely
 */
async function getRowCount(tableName: string): Promise<number> {
  try {
    const exists = await tableExists(tableName);
    if (!exists) return 0;
    const res = await db.execute(sql.raw(`SELECT COUNT(*)::int as count FROM ${tableName}`));
    return (res.rows[0] as { count: number }).count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Displays current state of the database
 */
async function showStatus(): Promise<void> {
  printBanner();
  console.log(`${c.bold}${c.white}Current Database Status:${c.reset}`);
  console.log(`${c.dim}----------------------------------------------------${c.reset}`);

  const tables = [
    'telegram_accounts',
    'telegram_sessions',
    'custom_profiles',
    'profile_social_links',
    'social_links',
    'tags',
    'profile_tags',
    'backup_records',
    'telegram_entities',
    'application_settings',
  ];

  for (const t of tables) {
    const exists = await tableExists(t);
    if (exists) {
      const count = await getRowCount(t);
      const color = count > 0 ? c.green : c.dim;
      console.log(`  ${color}• ${t.padEnd(24)}: ${count} row(s)${c.reset}`);
    } else {
      console.log(`  ${c.dim}• ${t.padEnd(24)}: [not created]${c.reset}`);
    }
  }

  // Inspect application settings keys
  try {
    const settings = await db.select().from(applicationSettings);
    console.log(`\n${c.bold}${c.white}Application Settings Keys (${settings.length}):${c.reset}`);
    console.log(`${c.dim}----------------------------------------------------${c.reset}`);
    for (const s of settings) {
      let preview = '';
      if (s.key === 'crm_profiles_state') {
        try {
          const parsed = JSON.parse(s.value);
          const pCount = parsed.profiles?.length ?? 0;
          const tCount = parsed.tags?.length ?? 0;
          preview = `(${pCount} profiles, ${tCount} tags stored in JSON state)`;
        } catch {
          preview = '(unparseable json)';
        }
      } else if (s.key === 'dashboard_master_passcode') {
        preview = '(configured)';
      } else if (s.key === 'google_drive_tokens') {
        preview = '(OAuth token stored)';
      } else if (s.key === 'dashboard_active_tokens') {
        preview = '(active sessions stored)';
      }
      console.log(`  ${c.cyan}• ${s.key.padEnd(28)} ${c.dim}${preview}${c.reset}`);
    }
  } catch (err) {
    console.log(`  ${c.dim}Could not read application_settings (${err})${c.reset}`);
  }

  console.log(`\n${c.dim}Run ${c.cyan}pnpm run db:clean --help${c.dim} to see cleanup options.${c.reset}\n`);
}

/**
 * Purges mock/synthetic data only
 */
async function cleanMockOnly(dryRun: boolean): Promise<void> {
  printBanner();
  console.log(`${c.bold}${c.yellow}Purging Synthetic & Mock Seed Data...${c.reset}`);
  if (dryRun) console.log(`${c.magenta}[DRY RUN] No changes will be applied.${c.reset}`);

  let removedProfilesCount = 0;
  let remainingRealProfilesCount = 0;

  // 1. Clean from application_settings (crm_profiles_state)
  const settingsRow = await db
    .select()
    .from(applicationSettings)
    .where(eq(applicationSettings.key, 'crm_profiles_state'))
    .limit(1);

  if (settingsRow.length > 0 && settingsRow[0].value) {
    try {
      const data = JSON.parse(settingsRow[0].value);
      const originalProfiles: Array<{
        id: string;
        telegramPeerId?: string | null;
        customDisplayName?: string | null;
        username?: string | null;
      }> = Array.isArray(data.profiles) ? data.profiles : [];

      const realProfiles = originalProfiles.filter((p) => {
        const isMockPeer = p.telegramPeerId && MOCK_PEER_IDS.has(p.telegramPeerId);
        const isMockName = p.customDisplayName && MOCK_NAMES.has(p.customDisplayName);
        const isMockUser = p.username && MOCK_USERNAMES.has(p.username);
        const isMockId = p.id && MOCK_PROFILE_IDS.has(p.id);
        const isMock = isMockPeer || isMockName || isMockUser || isMockId;
        if (isMock) {
          console.log(`  ${c.red}✖ Removing mock profile:${c.reset} ${p.customDisplayName || p.username || p.telegramPeerId}`);
        }
        return !isMock;
      });

      removedProfilesCount = originalProfiles.length - realProfiles.length;
      remainingRealProfilesCount = realProfiles.length;

      const realProfileIds = new Set(realProfiles.map((p) => p.id));
      const realSocialLinks = (data.socialLinks || []).filter((l: { customProfileId: string }) =>
        realProfileIds.has(l.customProfileId)
      );
      const realProfileTags = (data.profileTags || []).filter((pt: { customProfileId: string }) =>
        realProfileIds.has(pt.customProfileId)
      );

      const cleanedData = {
        profiles: realProfiles,
        socialLinks: realSocialLinks,
        tags: data.tags || [],
        profileTags: realProfileTags,
        updatedAt: new Date().toISOString(),
      };

      if (!dryRun) {
        await db
          .update(applicationSettings)
          .set({
            value: JSON.stringify(cleanedData),
            updatedAt: new Date(),
          })
          .where(eq(applicationSettings.key, 'crm_profiles_state'));
      }
    } catch (e) {
      console.log(`  ${c.red}Error parsing crm_profiles_state:${c.reset}`, e);
    }
  }

  // 2. Clean from relational custom_profiles table if populated
  if (await tableExists('custom_profiles')) {
    try {
      const query = sql`
        DELETE FROM custom_profiles 
        WHERE custom_display_name IN ('Coach Farhad', 'Sara (Backend Lead)', 'Sara', 'Esteghlal FC', 'Core Architecture Group', 'AI News Channel')
           OR entity_peer_id IN ('987654321', '123456789', '556677889', '998877665', '101', '102', '103', '104')
      `;
      if (!dryRun) {
        await db.execute(query);
      }
    } catch (err) {
      // Non-fatal if table doesn't have entity_peer_id column
    }
  }

  console.log(`\n${c.green}${c.bold}✔ Mock cleanup completed successfully!${c.reset}`);
  console.log(`  • Mock profiles removed: ${c.red}${removedProfilesCount}${c.reset}`);
  console.log(`  • Real profiles preserved: ${c.green}${remainingRealProfilesCount}${c.reset}`);
  console.log(`  • Telegram sessions & Drive OAuth: ${c.green}Untouched${c.reset}\n`);
}

/**
 * Purges empty / uncustomized profile shells (no name, notes, company, tags, or links)
 */
async function cleanEmptyOnly(dryRun: boolean): Promise<void> {
  printBanner();
  console.log(`${c.bold}${c.yellow}Purging Empty / Uncustomized CRM Profile Shells...${c.reset}`);
  if (dryRun) console.log(`${c.magenta}[DRY RUN] No changes will be applied.${c.reset}`);

  let removedCount = 0;
  let preservedCount = 0;

  const settingsRow = await db
    .select()
    .from(applicationSettings)
    .where(eq(applicationSettings.key, 'crm_profiles_state'))
    .limit(1);

  if (settingsRow.length > 0 && settingsRow[0].value) {
    try {
      const data = JSON.parse(settingsRow[0].value);
      const originalProfiles: Array<{
        id: string;
        telegramPeerId?: string | null;
        customDisplayName?: string | null;
        username?: string | null;
        phoneNumber?: string | null;
        company?: string | null;
        jobTitle?: string | null;
        relationshipType?: string | null;
        notes?: string | null;
      }> = Array.isArray(data.profiles) ? data.profiles : [];

      const tagProfileIds = new Set(
        (data.profileTags || []).map((pt: { customProfileId: string }) => pt.customProfileId)
      );
      const linkProfileIds = new Set(
        (data.socialLinks || []).map((sl: { customProfileId: string }) => sl.customProfileId)
      );

      const keptProfiles = originalProfiles.filter((p) => {
        const hasName = Boolean(p.customDisplayName && p.customDisplayName.trim().length > 0);
        const hasNotes = Boolean(p.notes && p.notes.trim().length > 0);
        const hasCompany = Boolean(p.company && p.company.trim().length > 0);
        const hasJob = Boolean(p.jobTitle && p.jobTitle.trim().length > 0);
        const hasPhone = Boolean(p.phoneNumber && p.phoneNumber.trim().length > 0);
        const hasRelation = Boolean(p.relationshipType && p.relationshipType.trim().length > 0);
        const hasTags = tagProfileIds.has(p.id);
        const hasLinks = linkProfileIds.has(p.id);

        const hasAnyData =
          hasName ||
          hasNotes ||
          hasCompany ||
          hasJob ||
          hasPhone ||
          hasRelation ||
          hasTags ||
          hasLinks;

        if (!hasAnyData) {
          console.log(
            `  ${c.red}✖ Removing empty shell:${c.reset} id=${p.id} peerId=${p.telegramPeerId || 'none'}`
          );
          return false;
        }
        return true;
      });

      removedCount = originalProfiles.length - keptProfiles.length;
      preservedCount = keptProfiles.length;

      const keptProfileIds = new Set(keptProfiles.map((p) => p.id));
      const keptSocialLinks = (data.socialLinks || []).filter((l: { customProfileId: string }) =>
        keptProfileIds.has(l.customProfileId)
      );
      const keptProfileTags = (data.profileTags || []).filter((pt: { customProfileId: string }) =>
        keptProfileIds.has(pt.customProfileId)
      );

      const cleanedData = {
        profiles: keptProfiles,
        socialLinks: keptSocialLinks,
        tags: data.tags || [],
        profileTags: keptProfileTags,
        updatedAt: new Date().toISOString(),
      };

      if (!dryRun) {
        await db
          .update(applicationSettings)
          .set({
            value: JSON.stringify(cleanedData),
            updatedAt: new Date(),
          })
          .where(eq(applicationSettings.key, 'crm_profiles_state'));
      }
    } catch (e) {
      console.log(`  ${c.red}Error parsing crm_profiles_state:${c.reset}`, e);
    }
  }

  console.log(`\n${c.green}${c.bold}✔ Empty profile cleanup completed!${c.reset}`);
  console.log(`  • Empty shells removed: ${c.red}${removedCount}${c.reset}`);
  console.log(`  • Active customized profiles preserved: ${c.green}${preservedCount}${c.reset}\n`);
}

/**
 * Purges CRM data only (profiles, tags, notes, social links)
 */
async function cleanCrmOnly(dryRun: boolean): Promise<void> {
  printBanner();
  console.log(`${c.bold}${c.yellow}Purging ALL CRM Data (profiles, notes, tags, social links)...${c.reset}`);
  if (dryRun) console.log(`${c.magenta}[DRY RUN] No changes will be applied.${c.reset}`);

  const tablesToClean = [
    'profile_tags',
    'profile_social_links',
    'social_links',
    'custom_profiles',
    'tags',
  ];

  for (const t of tablesToClean) {
    if (await tableExists(t)) {
      const count = await getRowCount(t);
      console.log(`  ${c.red}✖ Clearing table ${t}${c.reset} (${count} rows)`);
      if (!dryRun) {
        await db.execute(sql.raw(`DELETE FROM ${t}`));
      }
    }
  }

  // Clear crm_profiles_state from application_settings
  if (!dryRun) {
    await db
      .delete(applicationSettings)
      .where(eq(applicationSettings.key, 'crm_profiles_state'));
  }
  console.log(`  ${c.red}✖ Removed 'crm_profiles_state' setting${c.reset}`);

  console.log(`\n${c.green}${c.bold}✔ CRM Data purge completed.${c.reset}`);
  console.log(`  • Telegram MTProto sessions and Drive tokens are preserved.\n`);
}

/**
 * Purges authentication & sessions only
 */
async function cleanAuthOnly(dryRun: boolean): Promise<void> {
  printBanner();
  console.log(`${c.bold}${c.yellow}Purging Authentication & Session Data...${c.reset}`);
  if (dryRun) console.log(`${c.magenta}[DRY RUN] No changes will be applied.${c.reset}`);

  if (await tableExists('telegram_sessions')) {
    const count = await getRowCount('telegram_sessions');
    console.log(`  ${c.red}✖ Clearing telegram_sessions${c.reset} (${count} rows)`);
    if (!dryRun) await db.execute(sql`DELETE FROM telegram_sessions`);
  }

  if (await tableExists('telegram_accounts')) {
    const count = await getRowCount('telegram_accounts');
    console.log(`  ${c.red}✖ Clearing telegram_accounts${c.reset} (${count} rows)`);
    if (!dryRun) await db.execute(sql`DELETE FROM telegram_accounts`);
  }

  // Clear auth settings keys
  const authKeys = [
    'dashboard_master_passcode',
    'dashboard_active_tokens',
    'google_drive_tokens',
  ];

  for (const key of authKeys) {
    console.log(`  ${c.red}✖ Removing setting key: ${key}${c.reset}`);
    if (!dryRun) {
      await db.delete(applicationSettings).where(eq(applicationSettings.key, key));
    }
  }

  console.log(`\n${c.green}${c.bold}✔ Authentication & session purge completed.${c.reset}`);
  console.log(`  • Dashboard passcode reset. Next visit will prompt for passcode setup.\n`);
}

/**
 * Purges backup records
 */
async function cleanBackupsOnly(dryRun: boolean): Promise<void> {
  printBanner();
  console.log(`${c.bold}${c.yellow}Purging Backup History Records...${c.reset}`);
  if (dryRun) console.log(`${c.magenta}[DRY RUN] No changes will be applied.${c.reset}`);

  if (await tableExists('backup_records')) {
    const count = await getRowCount('backup_records');
    console.log(`  ${c.red}✖ Clearing backup_records${c.reset} (${count} rows)`);
    if (!dryRun) await db.execute(sql`DELETE FROM backup_records`);
  }

  console.log(`\n${c.green}${c.bold}✔ Backup records purge completed.${c.reset}\n`);
}

/**
 * Complete factory reset
 */
async function cleanAll(dryRun: boolean): Promise<void> {
  printBanner();
  console.log(`${c.bold}${c.red}⚠ FULL FACTORY RESET: Purging ALL database tables and settings...${c.reset}`);
  if (dryRun) console.log(`${c.magenta}[DRY RUN] No changes will be applied.${c.reset}`);

  const tablesInOrder = [
    'profile_tags',
    'profile_social_links',
    'social_links',
    'custom_profiles',
    'tags',
    'backup_records',
    'telegram_entities',
    'telegram_sessions',
    'telegram_accounts',
    'application_settings',
  ];

  for (const t of tablesInOrder) {
    if (await tableExists(t)) {
      const count = await getRowCount(t);
      console.log(`  ${c.red}✖ Truncating ${t.padEnd(24)}${c.reset} (${count} rows)`);
      if (!dryRun) {
        try {
          await db.execute(sql.raw(`TRUNCATE TABLE ${t} CASCADE`));
        } catch {
          await db.execute(sql.raw(`DELETE FROM ${t}`));
        }
      }
    }
  }

  console.log(`\n${c.green}${c.bold}✔ Full factory reset completed successfully!${c.reset}`);
  console.log(`  • Database is now completely fresh and empty.\n`);
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  try {
    switch (options.mode) {
      case 'help':
        printHelp();
        break;
      case 'status':
        await showStatus();
        break;
      case 'mock-only':
        await cleanMockOnly(options.dryRun);
        break;
      case 'empty-only':
        await cleanEmptyOnly(options.dryRun);
        break;
      case 'crm-only':
        await cleanCrmOnly(options.dryRun);
        break;
      case 'auth-only':
        await cleanAuthOnly(options.dryRun);
        break;
      case 'backups-only':
        await cleanBackupsOnly(options.dryRun);
        break;
      case 'all':
        await cleanAll(options.dryRun);
        break;
    }
  } catch (error) {
    console.error(`\n${c.red}${c.bold}Error executing database cleanup:${c.reset}`, error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();
