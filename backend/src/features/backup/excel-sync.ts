import * as XLSX from 'xlsx';

export interface ExcelProfileRow {
  'Telegram Peer ID': string;
  'Username': string;
  'Original Name': string;
  'Custom Name': string;
  'Entity Type': string;
  'Phone Number': string;
  'Company': string;
  'Job Title': string;
  'Relationship': string;
  'Reason For Joining': string;
  'Tags': string;
  'Notes': string;
  'Social Links': string;
  'Last Updated': string;
}

export interface ProfileExportData {
  entityPeerId: string;
  username?: string | null;
  entityType?: string | null;
  telegramDisplayName?: string | null;
  customDisplayName?: string | null;
  phoneNumber?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  relationshipType?: string | null;
  reasonForJoining?: string | null;
  notes?: string | null;
  tags?: string[];
  socialLinks?: Array<{ label: string; url: string }>;
  updatedAt?: string;
}

/**
 * Converts CRM profiles into a formatted Excel workbook buffer (.xlsx)
 */
export function generateExcelWorkbook(profiles: ProfileExportData[]): Buffer {
  const rows: ExcelProfileRow[] = profiles.map((p) => ({
    'Telegram Peer ID': p.entityPeerId,
    'Username': p.username ? (p.username.startsWith('@') ? p.username : `@${p.username}`) : '',
    'Original Name': p.telegramDisplayName || '',
    'Custom Name': p.customDisplayName || '',
    'Entity Type': p.entityType ? p.entityType.toUpperCase() : 'USER',
    'Phone Number': p.phoneNumber || '',
    'Company': p.company || '',
    'Job Title': p.jobTitle || '',
    'Relationship': p.relationshipType || '',
    'Reason For Joining': p.reasonForJoining || '',
    'Tags': (p.tags || []).join(', '),
    'Notes': p.notes || '',
    'Social Links': (p.socialLinks || []).map((l) => `${l.label}: ${l.url}`).join(' | '),
    'Last Updated': p.updatedAt || new Date().toISOString().split('T')[0],
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths for comfortable reading in Excel / Google Sheets
  worksheet['!cols'] = [
    { wch: 18 }, // Telegram Peer ID
    { wch: 18 }, // Username
    { wch: 24 }, // Original Name
    { wch: 22 }, // Custom Name
    { wch: 14 }, // Entity Type
    { wch: 16 }, // Phone Number
    { wch: 20 }, // Company
    { wch: 20 }, // Job Title
    { wch: 22 }, // Relationship
    { wch: 28 }, // Reason For Joining
    { wch: 24 }, // Tags
    { wch: 40 }, // Notes
    { wch: 35 }, // Social Links
    { wch: 14 }, // Last Updated
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'CRM Contacts');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/**
 * Parses an Excel (.xlsx) file buffer back into structured profile records for DB sync
 */
export function parseExcelWorkbook(buffer: Buffer): ProfileExportData[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) return [];

  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet);

  return rawRows.map((row) => {
    const peerId = String(row['Telegram Peer ID'] || row['peerId'] || '').trim();
    const rawUsername = String(row['Username'] || row['username'] || '').trim();
    const username = rawUsername.replace(/^@/, '') || null;
    const rawEntityType = String(row['Entity Type'] || row['entityType'] || 'user').toLowerCase().trim();
    const entityType =
      rawEntityType === 'supergroup'
        ? 'supergroup'
        : rawEntityType === 'group'
        ? 'group'
        : rawEntityType === 'channel'
        ? 'channel'
        : 'user';
    const originalName = String(
      row['Original Name'] || row['Telegram Name'] || row['originalName'] || ''
    ).trim();
    const customName = String(row['Custom Name'] || row['name'] || '').trim();
    const phone = String(row['Phone Number'] || row['phone'] || '').trim();
    const company = String(row['Company'] || '').trim();
    const jobTitle = String(row['Job Title'] || '').trim();
    const relationship = String(row['Relationship'] || '').trim();
    const reason = String(row['Reason For Joining'] || '').trim();
    const notes = String(row['Notes'] || '').trim();
    const rawTags = String(row['Tags'] || '').trim();
    const rawSocial = String(row['Social Links'] || '').trim();

    const tags = rawTags ? rawTags.split(',').map((t) => t.trim()).filter(Boolean) : [];
    const socialLinks = rawSocial
      ? rawSocial.split('|').map((item) => {
          const parts = item.split(':');
          const label = parts[0]?.trim() || 'Link';
          const url = parts.slice(1).join(':').trim() || '';
          return { label, url };
        }).filter((l) => Boolean(l.url))
      : [];

    return {
      entityPeerId: peerId,
      username,
      entityType,
      telegramDisplayName: originalName || null,
      customDisplayName: customName || null,
      phoneNumber: phone || null,
      company: company || null,
      jobTitle: jobTitle || null,
      relationshipType: relationship || null,
      reasonForJoining: reason || null,
      notes: notes || null,
      tags,
      socialLinks,
      updatedAt: new Date().toISOString(),
    };
  }).filter((p) => Boolean(p.entityPeerId));
}
