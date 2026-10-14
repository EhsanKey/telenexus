import { describe, it, expect } from 'vitest';
import { profilesService } from '../../src/features/profiles/service.js';
import { ValidationError, ConflictError, NotFoundError } from '../../src/common/errors.js';

describe('Social Links & Tag Taxonomy System (SPEC-06)', () => {
  describe('Social Links Management (SPEC-06 §4.1 & §5.1)', () => {
    it('adds a valid social link with https protocol to a profile', async () => {
      const link = await profilesService.addSocialLink(
        'e98e2170-07bf-4467-bc5f-149fa861d848',
        {
          label: 'LinkedIn',
          url: 'https://linkedin.com/in/farhad-majidi',
          description: 'Professional coach network',
        }
      );

      expect(link.id).toBeDefined();
      expect(link.label).toBe('LinkedIn');
      expect(link.url).toBe('https://linkedin.com/in/farhad-majidi');

      // Verify link appears in profile response
      const profile = await profilesService.getProfileByEntityId('ent-101');
      expect(profile?.socialLinks.some((l) => l.id === link.id)).toBe(true);
    });

    it('rejects invalid or unsafe URL schemes (javascript:, data:, file:) with ValidationError (SPEC-06 §5.1 & §6)', async () => {
      await expect(
        profilesService.addSocialLink('e98e2170-07bf-4467-bc5f-149fa861d848', {
          label: 'Exploit',
          url: 'javascript:alert(1)',
        })
      ).rejects.toThrow(ValidationError);

      await expect(
        profilesService.addSocialLink('e98e2170-07bf-4467-bc5f-149fa861d848', {
          label: 'Exploit 2',
          url: 'data:text/html,<script>alert(1)</script>',
        })
      ).rejects.toThrow(ValidationError);

      await expect(
        profilesService.addSocialLink('e98e2170-07bf-4467-bc5f-149fa861d848', {
          label: 'Exploit 3',
          url: 'file:///etc/passwd',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('updates and deletes an existing social link', async () => {
      const created = await profilesService.addSocialLink(
        'e98e2170-07bf-4467-bc5f-149fa861d848',
        {
          label: 'Twitter',
          url: 'https://x.com/temporary',
        }
      );

      const updated = await profilesService.updateSocialLink(
        'e98e2170-07bf-4467-bc5f-149fa861d848',
        created.id,
        {
          url: 'https://x.com/official_updated',
          description: 'Updated official handle',
        }
      );
      expect(updated.url).toBe('https://x.com/official_updated');

      const deleted = await profilesService.deleteSocialLink(
        'e98e2170-07bf-4467-bc5f-149fa861d848',
        created.id
      );
      expect(deleted).toBe(true);
    });

    it('cascading delete: deleting a profile cascades and removes its social links (SPEC-06 §6)', async () => {
      const profile = await profilesService.createProfile({
        telegramEntityId: 'ent-cascade-test-user',
        customDisplayName: 'Cascade Test',
      });

      const link = await profilesService.addSocialLink(profile.id, {
        label: 'Blog',
        url: 'https://blog.test.org',
      });

      // Delete the parent profile
      await profilesService.deleteProfile(profile.id);

      // Subsequent attempt to delete or access the child social link fails as it was cascaded
      await expect(
        profilesService.deleteSocialLink(profile.id, link.id)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('Tag Taxonomy & Profile Tagging (SPEC-06 §4.2 & §5.2)', () => {
    it('retrieves reusable tags with active profileCount', async () => {
      const tags = await profilesService.getTags();
      expect(tags.length).toBeGreaterThan(0);
      expect(tags[0]).toHaveProperty('id');
      expect(tags[0]).toHaveProperty('name');
      expect(tags[0]).toHaveProperty('color');
      expect(tags[0]).toHaveProperty('profileCount');
    });

    it('creates a new tag with color code', async () => {
      const created = await profilesService.createTag({
        name: 'Angel Investor',
        color: '#EC4899',
      });

      expect(created.name).toBe('Angel Investor');
      expect(created.color).toBe('#EC4899');
      expect(created.profileCount).toBe(0);
    });

    it('enforces case-insensitive tag name uniqueness per account (SPEC-06 §5.2)', async () => {
      await profilesService.createTag({
        name: 'Conference 2026',
        color: '#10B981',
      });

      // Duplicate with different casing
      await expect(
        profilesService.createTag({
          name: '  conference 2026  ',
          color: '#3B82F6',
        })
      ).rejects.toThrow(ConflictError);
    });

    it('assigns tags to profile and verifies profile response contains assigned tags', async () => {
      const tags = await profilesService.getTags();
      const tagIds = [tags[0]!.id, tags[1]!.id];

      const assigned = await profilesService.assignTagsToProfile(
        'e98e2170-07bf-4467-bc5f-149fa861d848',
        tagIds
      );

      expect(assigned).toHaveLength(2);
      expect(assigned.map((t) => t.id)).toEqual(expect.arrayContaining(tagIds));

      // Check profile response includes these tags
      const profile = await profilesService.getProfileByEntityId('ent-101');
      expect(profile?.tags).toHaveLength(2);
    });

    it('deleting a tag cascades and cleans profile associations while leaving profiles unharmed (SPEC-06 §5.3)', async () => {
      const tempTag = await profilesService.createTag({
        name: 'Temporary Project Tag',
        color: '#F97316',
      });

      await profilesService.assignTagsToProfile('e98e2170-07bf-4467-bc5f-149fa861d848', [
        tempTag.id,
      ]);

      // Delete the tag
      await profilesService.deleteTag(tempTag.id);

      // Verify profile is still unharmed
      const profile = await profilesService.getProfileByEntityId('ent-101');
      expect(profile).not.toBeNull();
      expect(profile?.customDisplayName).toBe('Coach Farhad');
      // The deleted tag should no longer be attached
      expect(profile?.tags.some((t) => t.id === tempTag.id)).toBe(false);
    });
  });
});
