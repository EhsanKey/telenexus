import { z } from 'zod';

/**
 * Validation Schemas & Data Transfer Objects for SPEC-05 (Custom Profiles)
 * Authoritative SSOT: specs/SPEC-05-custom-profile-metadata.md
 */

export const createProfileSchema = z.object({
  telegramEntityId: z.string().min(1, 'telegramEntityId is required'),
  telegramPeerId: z.string().nullable().optional(),
  telegramDisplayName: z.string().max(255).nullable().optional(),
  username: z.string().nullable().optional(),
  entityType: z.enum(['user', 'group', 'supergroup', 'channel']).nullable().optional(),
  customDisplayName: z.string().max(255).nullable().optional(),
  phoneNumber: z.string().max(32).nullable().optional(),
  company: z.string().max(255).nullable().optional(),
  jobTitle: z.string().max(255).nullable().optional(),
  relationshipType: z.string().max(100).nullable().optional(),
  reasonForJoining: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const updateProfileSchema = z.object({
  telegramPeerId: z.string().nullable().optional(),
  telegramDisplayName: z.string().max(255).nullable().optional(),
  username: z.string().nullable().optional(),
  entityType: z.enum(['user', 'group', 'supergroup', 'channel']).nullable().optional(),
  customDisplayName: z.string().max(255).nullable().optional(),
  phoneNumber: z.string().max(32).nullable().optional(),
  company: z.string().max(255).nullable().optional(),
  jobTitle: z.string().max(255).nullable().optional(),
  relationshipType: z.string().max(100).nullable().optional(),
  reasonForJoining: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type CreateProfileInput = z.infer<typeof createProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

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

export const urlWhitelistRegex = /^https?:\/\//i;

export const createSocialLinkSchema = z.object({
  label: z.string().trim().min(1, 'Label is required').max(64),
  url: z.string().url('Must be a valid URL').refine(
    (val) => urlWhitelistRegex.test(val),
    'Only http:// and https:// URL protocols are permitted'
  ),
  description: z.string().max(255).nullable().optional(),
});

export const updateSocialLinkSchema = z.object({
  label: z.string().trim().min(1).max(64).optional(),
  url: z.string().url('Must be a valid URL').refine(
    (val) => urlWhitelistRegex.test(val),
    'Only http:// and https:// URL protocols are permitted'
  ).optional(),
  description: z.string().max(255).nullable().optional(),
});

export const createTagSchema = z.object({
  name: z.string().trim().min(1, 'Tag name is required').max(64),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid 6-character hex color (e.g. #3B82F6)')
    .optional()
    .default('#3B82F6'),
});

export const assignTagsSchema = z.object({
  tagIds: z.array(z.string()),
});

export type CreateSocialLinkInput = z.infer<typeof createSocialLinkSchema>;
export type UpdateSocialLinkInput = z.infer<typeof updateSocialLinkSchema>;
export type CreateTagInput = z.infer<typeof createTagSchema>;
export type AssignTagsInput = z.infer<typeof assignTagsSchema>;

export interface CustomProfileResponseDto {
  id: string;
  telegramEntityId: string;
  telegramAccountId: string;
  telegramPeerId?: string | null;
  telegramDisplayName?: string | null;
  username?: string | null;
  entityType?: 'user' | 'group' | 'supergroup' | 'channel' | null;
  customDisplayName: string | null;
  phoneNumber: string | null;
  company: string | null;
  jobTitle: string | null;
  relationshipType: string | null;
  reasonForJoining: string | null;
  notes: string | null;
  socialLinks: SocialLinkDto[];
  tags: TagDto[];
  createdAt: string;
  updatedAt: string;
}
