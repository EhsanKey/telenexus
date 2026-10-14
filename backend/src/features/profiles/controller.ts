import type { Request, Response, NextFunction } from 'express';
import { profilesService } from './service.js';
import { backupService } from '../backup/service.js';
import { createSuccessEnvelope } from '../../common/index.js';

// ==========================================
// PROFILE CONTROLLERS (SPEC-05)
// ==========================================

export async function getProfileController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const entityId = String(req.params.entityId);
    const profile = await profilesService.getProfileByEntityId(entityId);
    res.status(200).json(createSuccessEnvelope(profile));
  } catch (error) {
    next(error);
  }
}

export async function createProfileController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const created = await profilesService.createProfile(req.body);
    backupService.syncExcelWithGoogleDrive().catch(() => null);
    res.status(201).json(createSuccessEnvelope(created));
  } catch (error) {
    next(error);
  }
}

export async function updateProfileController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const profileId = String(req.params.profileId);
    const updated = await profilesService.updateProfile(profileId, req.body);
    backupService.syncExcelWithGoogleDrive().catch(() => null);
    res.status(200).json(createSuccessEnvelope(updated));
  } catch (error) {
    next(error);
  }
}

export async function deleteProfileController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const profileId = String(req.params.profileId);
    await profilesService.deleteProfile(profileId);
    backupService.syncExcelWithGoogleDrive().catch(() => null);
    res.status(200).json(createSuccessEnvelope({ deleted: true, id: profileId }));
  } catch (error) {
    next(error);
  }
}

// ==========================================
// SOCIAL LINKS CONTROLLERS (SPEC-06 §4.1)
// ==========================================

export async function addSocialLinkController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const profileId = String(req.params.profileId);
    const created = await profilesService.addSocialLink(profileId, req.body);
    backupService.exportExcelToGoogleDrive().catch(() => null);
    res.status(201).json(createSuccessEnvelope(created));
  } catch (error) {
    next(error);
  }
}

export async function updateSocialLinkController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const profileId = String(req.params.profileId);
    const linkId = String(req.params.linkId);
    const updated = await profilesService.updateSocialLink(profileId, linkId, req.body);
    backupService.exportExcelToGoogleDrive().catch(() => null);
    res.status(200).json(createSuccessEnvelope(updated));
  } catch (error) {
    next(error);
  }
}

export async function deleteSocialLinkController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const profileId = String(req.params.profileId);
    const linkId = String(req.params.linkId);
    await profilesService.deleteSocialLink(profileId, linkId);
    backupService.exportExcelToGoogleDrive().catch(() => null);
    res.status(200).json(createSuccessEnvelope({ deleted: true, id: linkId }));
  } catch (error) {
    next(error);
  }
}

// ==========================================
// TAG TAXONOMY CONTROLLERS (SPEC-06 §4.2)
// ==========================================

export async function getTagsController(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tags = await profilesService.getTags();
    res.status(200).json(createSuccessEnvelope(tags));
  } catch (error) {
    next(error);
  }
}

export async function createTagController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const created = await profilesService.createTag(req.body);
    backupService.exportExcelToGoogleDrive().catch(() => null);
    res.status(201).json(createSuccessEnvelope(created));
  } catch (error) {
    next(error);
  }
}

export async function deleteTagController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tagId = String(req.params.tagId);
    await profilesService.deleteTag(tagId);
    backupService.syncExcelWithGoogleDrive().catch(() => null);
    res.status(200).json(createSuccessEnvelope({ deleted: true, id: tagId }));
  } catch (error) {
    next(error);
  }
}

export async function assignTagsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const profileId = String(req.params.profileId);
    const tagIds = Array.isArray(req.body.tagIds) ? req.body.tagIds : [];
    const assigned = await profilesService.assignTagsToProfile(profileId, tagIds);
    backupService.syncExcelWithGoogleDrive().catch(() => null);
    res.status(200).json(createSuccessEnvelope(assigned));
  } catch (error) {
    next(error);
  }
}
