import {
  type CreateProfileInput,
  type UpdateProfileInput,
  type CustomProfileResponseDto,
  type CreateSocialLinkInput,
  type UpdateSocialLinkInput,
  type SocialLinkDto,
  type CreateTagInput,
  type TagDto,
  createProfileSchema,
  updateProfileSchema,
  createSocialLinkSchema,
  updateSocialLinkSchema,
  createTagSchema,
  assignTagsSchema,
} from './dto.js';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  logger,
  DEFAULT_ACCOUNT_ID,
} from '../../common/index.js';
import { telegramService } from '../auth/telegram-client.js';
import type { BackupArchive } from '../backup/types.js';
import { db } from '../../database/client.js';
import { applicationSettings } from '../../database/schema/settings.js';
import { eq } from 'drizzle-orm';

interface ProfileRecord {
  id: string;
  telegramAccountId: string;
  telegramEntityId: string;
  telegramPeerId?: string | null;
  telegramDisplayName?: string | null;
  username?: string | null;
  entityType?: 'user' | 'group' | 'supergroup' | 'channel';
  customDisplayName: string | null;
  phoneNumber: string | null;
  company: string | null;
  jobTitle: string | null;
  relationshipType: string | null;
  reasonForJoining: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SocialLinkRecord {
  id: string;
  customProfileId: string;
  label: string;
  url: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TagRecord {
  id: string;
  telegramAccountId: string;
  name: string;
  color: string;
  createdAt: string;
}

interface ProfileTagRecord {
  customProfileId: string;
  tagId: string;
  createdAt: string;
}

const INITIAL_PROFILES: ProfileRecord[] = [
  {
    id: 'e98e2170-07bf-4467-bc5f-149fa861d848',
    telegramAccountId: 'acc-default',
    telegramEntityId: 'ent-101',
    telegramPeerId: '987654321',
    username: 'farhad7',
    entityType: 'user',
    customDisplayName: 'Coach Farhad',
    phoneNumber: '+989121112233',
    company: 'Esteghlal FC',
    jobTitle: 'Head Coach',
    relationshipType: 'Professional / Mentor',
    reasonForJoining: 'Coordinating weekly tactical review',
    notes: 'Best time to call is mornings before 10 AM.\nCoordinating tactical sessions.',
    createdAt: '2026-10-10T12:00:00.000Z',
    updatedAt: '2026-10-13T18:40:00.000Z',
  },
  {
    id: 'f12e2170-07bf-4467-bc5f-149fa861d849',
    telegramAccountId: 'acc-default',
    telegramEntityId: 'ent-102',
    telegramPeerId: '123456789',
    username: 'sara_dev',
    entityType: 'user',
    customDisplayName: 'Sara (Backend Lead)',
    phoneNumber: '+989123334455',
    company: 'Tech Corp',
    jobTitle: 'Lead Architect',
    relationshipType: 'Team Member',
    reasonForJoining: 'Core platform development',
    notes: 'Handles backend MTProto pipeline and CI gates.',
    createdAt: '2026-10-11T09:00:00.000Z',
    updatedAt: '2026-10-13T19:00:00.000Z',
  },
  {
    id: 'g34e2170-07bf-4467-bc5f-149fa861d850',
    telegramAccountId: 'acc-default',
    telegramEntityId: 'ent-103',
    telegramPeerId: '556677889',
    username: 'telenexus_devs',
    entityType: 'group',
    customDisplayName: 'Core Architecture Group',
    phoneNumber: null,
    company: 'TeleNexus Core Team',
    jobTitle: 'Engineering Working Group',
    relationshipType: 'Internal Working Group',
    reasonForJoining: 'Weekly system sprints',
    notes: 'Strict zero message persistence policy enforced.',
    createdAt: '2026-10-12T14:00:00.000Z',
    updatedAt: '2026-10-13T19:15:00.000Z',
  },
  {
    id: 'prof-204',
    telegramAccountId: 'acc-default',
    telegramEntityId: 'ent-104',
    telegramPeerId: '998877665',
    username: 'tech_intel_feed',
    entityType: 'channel',
    customDisplayName: 'AI News Channel',
    phoneNumber: null,
    company: 'Tech Intelligence Feed',
    jobTitle: 'Broadcast Channel',
    relationshipType: 'Media / Channel',
    reasonForJoining: 'AI & MTProto technology updates',
    notes: 'Official Telegram news broadcast.',
    createdAt: '2026-10-12T16:00:00.000Z',
    updatedAt: '2026-10-13T19:30:00.000Z',
  },
];

const INITIAL_SOCIAL_LINKS: SocialLinkRecord[] = [
  {
    id: 'link-101',
    customProfileId: 'e98e2170-07bf-4467-bc5f-149fa861d848',
    label: 'Instagram',
    url: 'https://instagram.com/farhad.majidi',
    description: 'Official verified profile',
    createdAt: '2026-10-10T12:00:00.000Z',
    updatedAt: '2026-10-10T12:00:00.000Z',
  },
  {
    id: 'link-102',
    customProfileId: 'f12e2170-07bf-4467-bc5f-149fa861d849',
    label: 'GitHub',
    url: 'https://github.com/sara-dev',
    description: 'MTProto core contributor',
    createdAt: '2026-10-11T09:00:00.000Z',
    updatedAt: '2026-10-11T09:00:00.000Z',
  },
];

const INITIAL_TAGS: TagRecord[] = [
  {
    id: 'tag-1',
    telegramAccountId: 'acc-default',
    name: 'VIP Client',
    color: '#10B981',
    createdAt: '2026-10-10T10:00:00.000Z',
  },
  {
    id: 'tag-2',
    telegramAccountId: 'acc-default',
    name: 'Tactical',
    color: '#8B5CF6',
    createdAt: '2026-10-10T10:00:00.000Z',
  },
  {
    id: 'tag-3',
    telegramAccountId: 'acc-default',
    name: 'Work',
    color: '#3B82F6',
    createdAt: '2026-10-10T10:00:00.000Z',
  },
  {
    id: 'tag-4',
    telegramAccountId: 'acc-default',
    name: 'Lead',
    color: '#F59E0B',
    createdAt: '2026-10-10T10:00:00.000Z',
  },
];

const INITIAL_PROFILE_TAGS: ProfileTagRecord[] = [
  {
    customProfileId: 'e98e2170-07bf-4467-bc5f-149fa861d848',
    tagId: 'tag-1',
    createdAt: '2026-10-10T12:00:00.000Z',
  },
  {
    customProfileId: 'e98e2170-07bf-4467-bc5f-149fa861d848',
    tagId: 'tag-2',
    createdAt: '2026-10-10T12:00:00.000Z',
  },
  {
    customProfileId: 'f12e2170-07bf-4467-bc5f-149fa861d849',
    tagId: 'tag-3',
    createdAt: '2026-10-11T09:00:00.000Z',
  },
  {
    customProfileId: 'g34e2170-07bf-4467-bc5f-149fa861d850',
    tagId: 'tag-3',
    createdAt: '2026-10-12T14:00:00.000Z',
  },
];

export class ProfilesService {
  private profiles: ProfileRecord[] =
    process.env.NODE_ENV === 'test' ? [...INITIAL_PROFILES] : [];
  private socialLinks: SocialLinkRecord[] =
    process.env.NODE_ENV === 'test' ? [...INITIAL_SOCIAL_LINKS] : [];
  private tags: TagRecord[] =
    process.env.NODE_ENV === 'test' ? [...INITIAL_TAGS] : [];
  private profileTags: ProfileTagRecord[] =
    process.env.NODE_ENV === 'test' ? [...INITIAL_PROFILE_TAGS] : [];

  constructor() {
    this.initialize().catch((err) => {
      logger.warn({ err }, 'ProfilesService background initialization failed');
    });
  }

  public async initialize(): Promise<void> {
    if (process.env.NODE_ENV === 'test') return;
    try {
      const records = await db
        .select()
        .from(applicationSettings)
        .where(eq(applicationSettings.key, 'crm_profiles_state'))
        .limit(1)
        .catch(() => []);
      if (records.length > 0 && records[0].value) {
        const data = JSON.parse(records[0].value);
        const mockNames = new Set([
          'Coach Farhad',
          'Sara (Backend Lead)',
          'Core Architecture Group',
          'AI News Channel',
        ]);
        const mockPeerIds = new Set(['987654321', '123456789', '556677889', '998877665']);

        if (Array.isArray(data.profiles)) {
          // Strictly filter out any mock/seed profiles from DB
          this.profiles = data.profiles.filter(
            (p: ProfileRecord) =>
              (!p.customDisplayName || !mockNames.has(p.customDisplayName)) &&
              (!p.telegramPeerId || !mockPeerIds.has(p.telegramPeerId))
          );
        }
        const validProfileIds = new Set(this.profiles.map((p) => p.id));

        if (Array.isArray(data.socialLinks)) {
          this.socialLinks = data.socialLinks.filter((s: SocialLinkRecord) =>
            validProfileIds.has(s.customProfileId)
          );
        }
        if (Array.isArray(data.tags) && data.tags.length > 0) {
          this.tags = data.tags;
        }
        if (Array.isArray(data.profileTags)) {
          this.profileTags = data.profileTags.filter((pt: ProfileTagRecord) =>
            validProfileIds.has(pt.customProfileId)
          );
        }
        logger.info(
          { profilesCount: this.profiles.length, tagsCount: this.tags.length },
          'Restored CRM profiles, tags, and notes from Neon PostgreSQL database.'
        );
      }
    } catch (err) {
      logger.warn({ err }, 'Could not load CRM profiles from database');
    }
  }

  private async persistState(): Promise<void> {
    if (process.env.NODE_ENV === 'test') return;
    try {
      const payload = {
        profiles: this.profiles,
        socialLinks: this.socialLinks,
        tags: this.tags,
        profileTags: this.profileTags,
        updatedAt: new Date().toISOString(),
      };
      await db
        .insert(applicationSettings)
        .values({
          key: 'crm_profiles_state',
          value: JSON.stringify(payload),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: applicationSettings.key,
          set: {
            value: JSON.stringify(payload),
            updatedAt: new Date(),
          },
        });
      logger.info('CRM profiles state successfully persisted to Neon PostgreSQL database.');
    } catch (err) {
      logger.warn({ err }, 'Failed to persist CRM profiles state to database');
    }
  }

  private getCurrentAccountId(): string {
    const account = telegramService.getAccount();
    return account ? account.id : DEFAULT_ACCOUNT_ID;
  }

  // ==========================================
  // PROFILE CRUD (SPEC-05)
  // ==========================================

  public async getProfileByEntityId(
    entityId: string,
    accountId?: string
  ): Promise<CustomProfileResponseDto | null> {
    const accId = accountId || this.getCurrentAccountId();
    
    const found = this.profiles.find(
      (p) =>
        (p.telegramEntityId === entityId ||
         p.telegramEntityId === `ent-${entityId}` ||
         p.id === entityId) &&
        (p.telegramAccountId === accId || p.telegramAccountId === 'acc-default')
    );

    if (!found) {
      return null;
    }

    return this.mapToDto(found);
  }

  public async createProfile(
    rawInput: CreateProfileInput,
    accountId?: string
  ): Promise<CustomProfileResponseDto> {
    const parsed = createProfileSchema.safeParse(rawInput);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path.join('.')] = issue.message;
      }
      throw new ValidationError('Invalid profile input data', fieldErrors);
    }

    const accId = accountId || this.getCurrentAccountId();
    const data = parsed.data;

    const existing = this.profiles.find(
      (p) =>
        p.telegramAccountId === accId &&
        (p.telegramEntityId === data.telegramEntityId ||
         p.telegramEntityId === `ent-${data.telegramEntityId}`)
    );

    if (existing) {
      throw new ConflictError(
        'A custom CRM profile already exists for this Telegram entity.'
      );
    }

    const now = new Date().toISOString();
    const cleanPeerId = data.telegramPeerId
      ? data.telegramPeerId.replace(/^ent-/, '')
      : data.telegramEntityId.replace(/^ent-/, '');

    const newRecord: ProfileRecord = {
      id: `prof-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      telegramAccountId: accId,
      telegramEntityId: data.telegramEntityId,
      telegramPeerId: cleanPeerId,
      telegramDisplayName: data.telegramDisplayName ?? null,
      username: data.username ?? null,
      entityType: data.entityType ?? 'user',
      customDisplayName: data.customDisplayName ?? null,
      phoneNumber: data.phoneNumber ?? null,
      company: data.company ?? null,
      jobTitle: data.jobTitle ?? null,
      relationshipType: data.relationshipType ?? null,
      reasonForJoining: data.reasonForJoining ?? null,
      notes: data.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };

    this.profiles.push(newRecord);
    await this.persistState();
    logger.info({ profileId: newRecord.id, entityId: newRecord.telegramEntityId }, 'Created custom profile');

    return this.mapToDto(newRecord);
  }

  public async updateProfile(
    profileId: string,
    rawInput: UpdateProfileInput,
    accountId?: string
  ): Promise<CustomProfileResponseDto> {
    const parsed = updateProfileSchema.safeParse(rawInput);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path.join('.')] = issue.message;
      }
      throw new ValidationError('Invalid profile update data', fieldErrors);
    }

    const accId = accountId || this.getCurrentAccountId();
    const targetIndex = this.profiles.findIndex(
      (p) =>
        (p.id === profileId || p.telegramEntityId === profileId) &&
        (p.telegramAccountId === accId || p.telegramAccountId === 'acc-default')
    );

    if (targetIndex === -1) {
      throw new NotFoundError(`Profile with ID '${profileId}' not found.`);
    }

    const current = this.profiles[targetIndex]!;
    const updates = parsed.data;

    const updatedRecord: ProfileRecord = {
      ...current,
      customDisplayName:
        updates.customDisplayName !== undefined
          ? updates.customDisplayName
          : current.customDisplayName,
      telegramDisplayName:
        updates.telegramDisplayName !== undefined
          ? updates.telegramDisplayName
          : current.telegramDisplayName,
      phoneNumber:
        updates.phoneNumber !== undefined ? updates.phoneNumber : current.phoneNumber,
      company: updates.company !== undefined ? updates.company : current.company,
      jobTitle: updates.jobTitle !== undefined ? updates.jobTitle : current.jobTitle,
      relationshipType:
        updates.relationshipType !== undefined
          ? updates.relationshipType
          : current.relationshipType,
      reasonForJoining:
        updates.reasonForJoining !== undefined
          ? updates.reasonForJoining
          : current.reasonForJoining,
      notes: updates.notes !== undefined ? updates.notes : current.notes,
      username: updates.username !== undefined ? updates.username : current.username,
      entityType:
        updates.entityType !== undefined && updates.entityType !== null
          ? updates.entityType
          : current.entityType,
      telegramPeerId:
        updates.telegramPeerId !== undefined && updates.telegramPeerId !== null
          ? updates.telegramPeerId
          : current.telegramPeerId,
      updatedAt: new Date().toISOString(),
    };

    this.profiles[targetIndex] = updatedRecord;
    await this.persistState();
    logger.info({ profileId: updatedRecord.id }, 'Updated custom profile metadata');

    return this.mapToDto(updatedRecord);
  }

  public async deleteProfile(profileId: string, accountId?: string): Promise<boolean> {
    const accId = accountId || this.getCurrentAccountId();
    const initialCount = this.profiles.length;

    const target = this.profiles.find(
      (p) =>
        (p.id === profileId || p.telegramEntityId === profileId) &&
        (p.telegramAccountId === accId || p.telegramAccountId === 'acc-default')
    );

    if (!target) {
      throw new NotFoundError(`Profile with ID '${profileId}' not found for deletion.`);
    }

    // 1. Remove profile
    this.profiles = this.profiles.filter((p) => p.id !== target.id);

    // 2. Cascading delete: Remove associated social links (SPEC-06 §5.3)
    this.socialLinks = this.socialLinks.filter((l) => l.customProfileId !== target.id);

    // 3. Cascading delete: Remove associated profile tags junction rows
    this.profileTags = this.profileTags.filter((pt) => pt.customProfileId !== target.id);
    await this.persistState();

    logger.info({ profileId: target.id }, 'Deleted custom CRM profile; cascaded to social links and tag associations');
    return true;
  }

  // ==========================================
  // SOCIAL LINKS (SPEC-06 §4.1)
  // ==========================================

  public async addSocialLink(
    profileId: string,
    rawInput: CreateSocialLinkInput
  ): Promise<SocialLinkDto> {
    const parsed = createSocialLinkSchema.safeParse(rawInput);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path.join('.')] = issue.message;
      }
      throw new ValidationError('Invalid social link input', fieldErrors);
    }

    const profile = this.profiles.find((p) => p.id === profileId || p.telegramEntityId === profileId);
    if (!profile) {
      throw new NotFoundError(`Profile with ID '${profileId}' not found.`);
    }

    const now = new Date().toISOString();
    const newLink: SocialLinkRecord = {
      id: `link-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      customProfileId: profile.id,
      label: parsed.data.label,
      url: parsed.data.url,
      description: parsed.data.description ?? null,
      createdAt: now,
      updatedAt: now,
    };

    this.socialLinks.push(newLink);
    await this.persistState();
    logger.info({ linkId: newLink.id, profileId: profile.id }, 'Created social link');
    return newLink;
  }

  public async updateSocialLink(
    profileId: string,
    linkId: string,
    rawInput: UpdateSocialLinkInput
  ): Promise<SocialLinkDto> {
    const parsed = updateSocialLinkSchema.safeParse(rawInput);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path.join('.')] = issue.message;
      }
      throw new ValidationError('Invalid social link update', fieldErrors);
    }

    const linkIndex = this.socialLinks.findIndex(
      (l) => l.id === linkId && (l.customProfileId === profileId || this.profiles.some(p => p.id === l.customProfileId && p.telegramEntityId === profileId))
    );

    if (linkIndex === -1) {
      throw new NotFoundError(`Social link with ID '${linkId}' not found.`);
    }

    const current = this.socialLinks[linkIndex]!;
    const updates = parsed.data;

    const updated: SocialLinkRecord = {
      ...current,
      label: updates.label !== undefined ? updates.label : current.label,
      url: updates.url !== undefined ? updates.url : current.url,
      description: updates.description !== undefined ? updates.description : current.description,
      updatedAt: new Date().toISOString(),
    };

    this.socialLinks[linkIndex] = updated;
    await this.persistState();
    return updated;
  }

  public async deleteSocialLink(profileId: string, linkId: string): Promise<boolean> {
    const initialCount = this.socialLinks.length;
    this.socialLinks = this.socialLinks.filter(
      (l) => !(l.id === linkId && (l.customProfileId === profileId || this.profiles.some(p => p.id === l.customProfileId && p.telegramEntityId === profileId)))
    );

    if (this.socialLinks.length === initialCount) {
      throw new NotFoundError(`Social link with ID '${linkId}' not found for deletion.`);
    }

    await this.persistState();
    logger.info({ linkId }, 'Deleted social link');
    return true;
  }

  // ==========================================
  // TAG TAXONOMY (SPEC-06 §4.2)
  // ==========================================

  public async getTags(accountId?: string): Promise<TagDto[]> {
    const accId = accountId || this.getCurrentAccountId();
    const accountTags = this.tags.filter(
      (t) => t.telegramAccountId === accId || t.telegramAccountId === 'acc-default'
    );

    return accountTags.map((tag) => {
      const profileCount = this.profileTags.filter((pt) => pt.tagId === tag.id).length;
      return {
        id: tag.id,
        telegramAccountId: tag.telegramAccountId,
        name: tag.name,
        color: tag.color,
        profileCount,
        createdAt: tag.createdAt,
      };
    });
  }

  public async createTag(rawInput: CreateTagInput, accountId?: string): Promise<TagDto> {
    const parsed = createTagSchema.safeParse(rawInput);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path.join('.')] = issue.message;
      }
      throw new ValidationError('Invalid tag input', fieldErrors);
    }

    const accId = accountId || this.getCurrentAccountId();
    const normalizedName = parsed.data.name.trim();

    // Invariant: Tag names are unique case-insensitively per account (SPEC-06 §5.2)
    const exists = this.tags.find(
      (t) =>
        (t.telegramAccountId === accId || t.telegramAccountId === 'acc-default') &&
        t.name.toLowerCase() === normalizedName.toLowerCase()
    );

    if (exists) {
      throw new ConflictError(`A tag with name '${normalizedName}' already exists in your account.`);
    }

    const newTag: TagRecord = {
      id: `tag-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      telegramAccountId: accId,
      name: normalizedName,
      color: parsed.data.color || '#3B82F6',
      createdAt: new Date().toISOString(),
    };

    this.tags.push(newTag);
    await this.persistState();
    logger.info({ tagId: newTag.id, name: newTag.name }, 'Created new CRM tag');

    return {
      ...newTag,
      profileCount: 0,
    };
  }

  public async deleteTag(tagId: string, accountId?: string): Promise<boolean> {
    const accId = accountId || this.getCurrentAccountId();
    const tagIndex = this.tags.findIndex(
      (t) => t.id === tagId && (t.telegramAccountId === accId || t.telegramAccountId === 'acc-default')
    );

    if (tagIndex === -1) {
      throw new NotFoundError(`Tag with ID '${tagId}' not found for deletion.`);
    }

    // 1. Remove tag
    this.tags.splice(tagIndex, 1);

    // 2. Cascading: Remove junction rows from profile_tags; custom_profiles remain unharmed (SPEC-06 §5.3)
    this.profileTags = this.profileTags.filter((pt) => pt.tagId !== tagId);
    await this.persistState();

    logger.info({ tagId }, 'Deleted CRM tag and cleared profile associations');
    return true;
  }

  public async assignTagsToProfile(
    profileId: string,
    rawTagIds: string[],
    accountId?: string
  ): Promise<TagDto[]> {
    const accId = accountId || this.getCurrentAccountId();
    const profile = this.profiles.find(
      (p) => (p.id === profileId || p.telegramEntityId === profileId) &&
             (p.telegramAccountId === accId || p.telegramAccountId === 'acc-default')
    );

    if (!profile) {
      throw new NotFoundError(`Profile with ID '${profileId}' not found.`);
    }

    // Validate that all tag IDs exist and belong to account
    for (const tagId of rawTagIds) {
      const exists = this.tags.some(
        (t) => t.id === tagId && (t.telegramAccountId === accId || t.telegramAccountId === 'acc-default')
      );
      if (!exists) {
        throw new NotFoundError(`Tag '${tagId}' does not exist or does not belong to this account.`);
      }
    }

    // Replace junction rows for this profile inside logical transaction (SPEC-06 §4.2)
    this.profileTags = this.profileTags.filter((pt) => pt.customProfileId !== profile.id);

    const now = new Date().toISOString();
    for (const tagId of rawTagIds) {
      this.profileTags.push({
        customProfileId: profile.id,
        tagId,
        createdAt: now,
      });
    }

    await this.persistState();
    logger.info({ profileId: profile.id, count: rawTagIds.length }, 'Assigned tags to profile');

    // Return the updated list of tags for this profile
    const assignedTags = this.tags.filter((t) => rawTagIds.includes(t.id));
    return assignedTags.map((t) => ({
      id: t.id,
      telegramAccountId: t.telegramAccountId,
      name: t.name,
      color: t.color,
      createdAt: t.createdAt,
    }));
  }

  private mapToDto(record: ProfileRecord): CustomProfileResponseDto {
    const links = this.socialLinks.filter((l) => l.customProfileId === record.id);
    const assignedTagIds = this.profileTags
      .filter((pt) => pt.customProfileId === record.id)
      .map((pt) => pt.tagId);

    const tagDtos = this.tags
      .filter((t) => assignedTagIds.includes(t.id))
      .map((t) => ({
        id: t.id,
        telegramAccountId: t.telegramAccountId,
        name: t.name,
        color: t.color,
        createdAt: t.createdAt,
      }));

    return {
      id: record.id,
      telegramAccountId: record.telegramAccountId,
      telegramEntityId: record.telegramEntityId,
      telegramPeerId: record.telegramPeerId || record.telegramEntityId.replace(/^ent-/, ''),
      telegramDisplayName: record.telegramDisplayName || null,
      username: record.username || null,
      entityType: record.entityType || 'user',
      customDisplayName: record.customDisplayName,
      phoneNumber: record.phoneNumber,
      company: record.company,
      jobTitle: record.jobTitle,
      relationshipType: record.relationshipType,
      reasonForJoining: record.reasonForJoining,
      notes: record.notes,
      socialLinks: links,
      tags: tagDtos,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  public async autoUpdateUsername(
    entityId: string,
    peerId: string,
    username: string | null,
    entityType?: 'user' | 'group' | 'supergroup' | 'channel'
  ): Promise<boolean> {
    const cleanPeerId = peerId ? peerId.replace(/^ent-/, '') : '';
    const profile = this.profiles.find(
      (p) =>
        p.telegramEntityId === entityId ||
        p.telegramEntityId === `ent-${cleanPeerId}` ||
        p.telegramEntityId === cleanPeerId ||
        p.id === entityId ||
        (cleanPeerId && p.telegramPeerId === cleanPeerId)
    );

    if (!profile) return false;

    let changed = false;
    if (username && profile.username !== username) {
      profile.username = username;
      changed = true;
    }
    if (cleanPeerId && profile.telegramPeerId !== cleanPeerId) {
      profile.telegramPeerId = cleanPeerId;
      changed = true;
    }
    if (entityType && profile.entityType !== entityType) {
      profile.entityType = entityType;
      changed = true;
    }

    if (changed) {
      profile.updatedAt = new Date().toISOString();
      await this.persistState();
      logger.info(
        { profileId: profile.id, username: profile.username, peerId: cleanPeerId },
        'Auto-updated username in custom profile'
      );
    }

    return changed;
  }

  public async getAllProfiles(accountId?: string): Promise<CustomProfileResponseDto[]> {
    const accId = accountId || this.getCurrentAccountId();
    const records = this.profiles.filter(
      (p) => !accountId || p.telegramAccountId === accId || p.telegramAccountId === 'acc-default' || true
    );
    return records.map((r) => this.mapToDto(r));
  }

  public async getAllBackupData(accountId?: string): Promise<{
    profiles: Array<{
      entityPeerId: string;
      username?: string | null;
      entityType: 'user' | 'group' | 'supergroup' | 'channel';
      telegramDisplayName?: string | null;
      customDisplayName: string | null;
      phoneNumber: string | null;
      company: string | null;
      jobTitle: string | null;
      relationshipType: string | null;
      reasonForJoining: string | null;
      notes: string | null;
      socialLinks: Array<{ label: string; url: string; description: string | null }>;
      tags: string[];
    }>;
    tagsCatalog: Array<{ name: string; color: string | null }>;
  }> {
    const accountProfiles = this.profiles;
    const accountTags = this.tags;

    const profilesData = accountProfiles.map((p) => {
      const links = this.socialLinks
        .filter((l) => l.customProfileId === p.id)
        .map((l) => ({
          label: l.label,
          url: l.url,
          description: l.description,
        }));
      const assignedTagIds = this.profileTags
        .filter((pt) => pt.customProfileId === p.id)
        .map((pt) => pt.tagId);
      const tagNames = this.tags
        .filter((t) => assignedTagIds.includes(t.id))
        .map((t) => t.name);

      const entityPeerId =
        p.telegramPeerId ||
        (p.telegramEntityId.startsWith('ent-')
          ? p.telegramEntityId.replace('ent-', '')
          : p.telegramEntityId);

      return {
        entityPeerId,
        username: p.username || null,
        entityType: p.entityType || 'user',
        telegramDisplayName: p.telegramDisplayName || null,
        customDisplayName: p.customDisplayName,
        phoneNumber: p.phoneNumber,
        company: p.company,
        jobTitle: p.jobTitle,
        relationshipType: p.relationshipType,
        reasonForJoining: p.reasonForJoining,
        notes: p.notes,
        socialLinks: links,
        tags: tagNames,
      };
    });

    const tagsCatalog = accountTags.map((t) => ({
      name: t.name,
      color: t.color || null,
    }));

    return {
      profiles: profilesData,
      tagsCatalog,
    };
  }

  public async restoreBackupData(
    archive: BackupArchive,
    accountId?: string
  ): Promise<{ restoredProfilesCount: number; restoredTagsCount: number }> {
    const accId = accountId || this.getCurrentAccountId();

    // Snapshot for atomic rollback guarantee (SPEC-07 §5)
    const snapshotProfiles = JSON.parse(JSON.stringify(this.profiles));
    const snapshotSocialLinks = JSON.parse(JSON.stringify(this.socialLinks));
    const snapshotTags = JSON.parse(JSON.stringify(this.tags));
    const snapshotProfileTags = JSON.parse(JSON.stringify(this.profileTags));

    try {
      if (!archive || archive.formatVersion !== '1.0.0') {
        throw new ValidationError('Unsupported or corrupt backup archive format');
      }

      let restoredTagsCount = 0;
      let restoredProfilesCount = 0;

      // 1. Restore tagsCatalog
      for (const t of archive.tagsCatalog || []) {
        if (!t.name || typeof t.name !== 'string') {
          throw new ValidationError('Corrupt tag in backup archive');
        }
        const existing = this.tags.find(
          (tag) =>
            (tag.telegramAccountId === accId || tag.telegramAccountId === 'acc-default') &&
            tag.name.toLowerCase() === t.name.toLowerCase()
        );
        if (!existing) {
          this.tags.push({
            id: `tag-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            telegramAccountId: accId,
            name: t.name,
            color: t.color || '#3B82F6',
            createdAt: new Date().toISOString(),
          });
          restoredTagsCount++;
        }
      }

      // 2. Restore profiles
      for (const p of archive.profiles || []) {
        if (!p.entityPeerId) {
          throw new ValidationError('Corrupt profile in backup archive: missing entityPeerId');
        }
        const entityId = `ent-${p.entityPeerId}`;
        const existingIndex = this.profiles.findIndex(
          (prof) =>
            (prof.telegramAccountId === accId || prof.telegramAccountId === 'acc-default') &&
            (prof.telegramEntityId === entityId || prof.telegramEntityId === p.entityPeerId)
        );

        let profileRecordId: string;

        if (existingIndex >= 0) {
          const current = this.profiles[existingIndex]!;
          profileRecordId = current.id;
          this.profiles[existingIndex] = {
            ...current,
            customDisplayName: p.customDisplayName !== undefined ? p.customDisplayName : current.customDisplayName,
            telegramDisplayName:
              (p as any).telegramDisplayName !== undefined
                ? (p as any).telegramDisplayName
                : current.telegramDisplayName,
            phoneNumber: p.phoneNumber !== undefined ? p.phoneNumber : current.phoneNumber,
            company: p.company !== undefined ? p.company : current.company,
            jobTitle: p.jobTitle !== undefined ? p.jobTitle : current.jobTitle,
            relationshipType: p.relationshipType !== undefined ? p.relationshipType : current.relationshipType,
            reasonForJoining: p.reasonForJoining !== undefined ? p.reasonForJoining : current.reasonForJoining,
            notes: p.notes !== undefined ? p.notes : current.notes,
            updatedAt: new Date().toISOString(),
          };
        } else {
          profileRecordId = `prof-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          this.profiles.push({
            id: profileRecordId,
            telegramAccountId: accId,
            telegramEntityId: entityId,
            telegramDisplayName: (p as any).telegramDisplayName ?? null,
            customDisplayName: p.customDisplayName ?? null,
            phoneNumber: p.phoneNumber ?? null,
            company: p.company ?? null,
            jobTitle: p.jobTitle ?? null,
            relationshipType: p.relationshipType ?? null,
            reasonForJoining: p.reasonForJoining ?? null,
            notes: p.notes ?? null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
        restoredProfilesCount++;

        // Restore social links
        if (p.socialLinks && Array.isArray(p.socialLinks)) {
          this.socialLinks = this.socialLinks.filter(
            (l) => l.customProfileId !== profileRecordId
          );
          for (const link of p.socialLinks) {
            this.socialLinks.push({
              id: `link-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              customProfileId: profileRecordId,
              label: link.label,
              url: link.url,
              description: link.description ?? null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        }

        // Restore tags associations
        if (p.tags && Array.isArray(p.tags)) {
          this.profileTags = this.profileTags.filter(
            (pt) => pt.customProfileId !== profileRecordId
          );
          for (const tagName of p.tags) {
            const foundTag = this.tags.find(
              (t) =>
                (t.telegramAccountId === accId || t.telegramAccountId === 'acc-default') &&
                t.name.toLowerCase() === tagName.toLowerCase()
            );
            if (foundTag) {
              this.profileTags.push({
                customProfileId: profileRecordId,
                tagId: foundTag.id,
                createdAt: new Date().toISOString(),
              });
            }
          }
        }
      }

      await this.persistState();
      return { restoredProfilesCount, restoredTagsCount };
    } catch (err: unknown) {
      // Rollback to snapshot
      this.profiles = snapshotProfiles;
      this.socialLinks = snapshotSocialLinks;
      this.tags = snapshotTags;
      this.profileTags = snapshotProfileTags;
      throw err;
    }
  }

  public resetState(): void {
    if (process.env.NODE_ENV === 'test') {
      this.profiles = [...INITIAL_PROFILES];
      this.socialLinks = [...INITIAL_SOCIAL_LINKS];
      this.tags = [...INITIAL_TAGS];
      this.profileTags = [...INITIAL_PROFILE_TAGS];
    } else {
      this.profiles = [];
      this.socialLinks = [];
      this.tags = [];
      this.profileTags = [];
    }
  }
}

export const profilesService = new ProfilesService();
