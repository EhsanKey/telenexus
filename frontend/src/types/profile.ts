/**
 * Custom Profile, Social Links & Tag Taxonomy Types (SPEC-05 & SPEC-06)
 * Authoritative SSOT: specs/SPEC-05-custom-profile-metadata.md & SPEC-06-social-links-tag-taxonomy.md
 */

export interface SocialLinkDto {
  id: string;
  customProfileId: string;
  label: string;
  url: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TagDto {
  id: string;
  telegramAccountId: string;
  name: string;
  color: string;
  profileCount?: number;
  createdAt: string;
}

export interface CustomProfileDto {
  id: string;
  telegramEntityId: string;
  telegramAccountId: string;
  telegramDisplayName?: string | null;
  customDisplayName: string | null;
  phoneNumber: string | null;
  company: string | null;
  jobTitle: string | null;
  relationshipType: string | null;
  reasonForJoining: string | null;
  notes: string | null;
  telegramPeerId?: string | null;
  username?: string | null;
  entityType?: 'user' | 'group' | 'supergroup' | 'channel' | null;
  socialLinks: SocialLinkDto[];
  tags: TagDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateProfileInput {
  telegramEntityId: string;
  telegramPeerId?: string | null;
  telegramDisplayName?: string | null;
  username?: string | null;
  entityType?: 'user' | 'group' | 'supergroup' | 'channel' | null;
  customDisplayName?: string | null;
  phoneNumber?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  relationshipType?: string | null;
  reasonForJoining?: string | null;
  notes?: string | null;
}

export interface UpdateProfileInput {
  telegramPeerId?: string | null;
  telegramDisplayName?: string | null;
  username?: string | null;
  entityType?: 'user' | 'group' | 'supergroup' | 'channel' | null;
  customDisplayName?: string | null;
  phoneNumber?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  relationshipType?: string | null;
  reasonForJoining?: string | null;
  notes?: string | null;
}

export interface CreateSocialLinkInput {
  label: string;
  url: string;
  description?: string | null;
}

export interface CreateTagInput {
  name: string;
  color?: string;
}
