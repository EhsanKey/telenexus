import { describe, it, expect } from 'vitest';
import { profilesService } from '../../src/features/profiles/service.js';
import { ConflictError, NotFoundError, ValidationError } from '../../src/common/errors.js';

describe('Custom Profile & Personal Metadata Management (SPEC-05)', () => {
  it('retrieves an existing profile by entity ID', async () => {
    const profile = await profilesService.getProfileByEntityId('ent-101');
    expect(profile).not.toBeNull();
    expect(profile?.customDisplayName).toBe('Coach Farhad');
    expect(profile?.company).toBe('Esteghlal FC');
    expect(profile?.jobTitle).toBe('Head Coach');
    expect(profile?.notes).toContain('Best time to call');
  });

  it('returns null when fetching profile for entity without one (SPEC-05 §4.1)', async () => {
    const profile = await profilesService.getProfileByEntityId('ent-non-existent-999');
    expect(profile).toBeNull();
  });

  it('creates a new custom profile successfully (SPEC-05 §4.2)', async () => {
    const entityId = 'ent-test-user-501';
    const created = await profilesService.createProfile({
      telegramEntityId: entityId,
      customDisplayName: 'Amir (Tech Lead)',
      phoneNumber: '+989129998877',
      company: 'Antigravity Labs',
      jobTitle: 'Senior Staff Engineer',
      relationshipType: 'Colleague',
      reasonForJoining: 'Architecture consulting',
      notes: 'Line 1: Met at tech summit.\nLine 2: Interested in agentic workflows.',
    });

    expect(created.id).toBeDefined();
    expect(created.telegramEntityId).toBe(entityId);
    expect(created.customDisplayName).toBe('Amir (Tech Lead)');
    expect(created.notes).toContain('Line 1');
    expect(created.notes).toContain('\n');
    expect(created.createdAt).toBeDefined();
    expect(created.updatedAt).toBeDefined();
  });

  it('enforces uniqueness: prevents creating 2 profiles for same entity (SPEC-05 §3 & §6)', async () => {
    const entityId = 'ent-test-duplicate-check';
    await profilesService.createProfile({
      telegramEntityId: entityId,
      customDisplayName: 'First Profile',
    });

    // Attempt duplicate creation
    await expect(
      profilesService.createProfile({
        telegramEntityId: entityId,
        customDisplayName: 'Second Profile Conflict',
      })
    ).rejects.toThrow(ConflictError);
  });

  it('validates input parameters with Zod schema', async () => {
    // @ts-expect-error testing missing entityId
    await expect(profilesService.createProfile({})).rejects.toThrow(ValidationError);
  });

  it('updates profile metadata and preserves multiline notes formatting (SPEC-05 §4.3 & §5.3)', async () => {
    const entityId = 'ent-test-update-target';
    const created = await profilesService.createProfile({
      telegramEntityId: entityId,
      customDisplayName: 'Original Name',
      notes: 'Initial note.\nSecond line.',
    });

    const updated = await profilesService.updateProfile(created.id, {
      customDisplayName: 'Updated VIP Name',
      notes: 'Paragraph 1.\n\nParagraph 2 with formatting preserved.\n- Bullet point 1\n- Bullet point 2',
      company: 'New Enterprise Corp',
    });

    expect(updated.id).toBe(created.id);
    expect(updated.customDisplayName).toBe('Updated VIP Name');
    expect(updated.company).toBe('New Enterprise Corp');
    expect(updated.notes).toContain('Paragraph 2 with formatting preserved.');
    expect(updated.notes).toContain('\n\n');
  });

  it('throws NotFoundError when updating non-existent profile', async () => {
    await expect(
      profilesService.updateProfile('prof-non-existent-id', {
        customDisplayName: 'Should Fail',
      })
    ).rejects.toThrow(NotFoundError);
  });

  it('deletes custom profile while leaving Telegram entity intact (SPEC-05 §4.4 & §6)', async () => {
    const entityId = 'ent-test-delete-target';
    const created = await profilesService.createProfile({
      telegramEntityId: entityId,
      customDisplayName: 'To Be Deleted',
    });

    const deleteSuccess = await profilesService.deleteProfile(created.id);
    expect(deleteSuccess).toBe(true);

    // Profile is gone
    const fetched = await profilesService.getProfileByEntityId(entityId);
    expect(fetched).toBeNull();
  });
});
