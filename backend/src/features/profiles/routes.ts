import { Router } from 'express';
import {
  getProfileController,
  createProfileController,
  updateProfileController,
  deleteProfileController,
  addSocialLinkController,
  updateSocialLinkController,
  deleteSocialLinkController,
  assignTagsController,
  getTagsController,
  createTagController,
  deleteTagController,
} from './controller.js';

export const profilesRouter = Router();

// Custom Profile CRUD (SPEC-05)
profilesRouter.get('/:entityId', getProfileController);
profilesRouter.post('/', createProfileController);
profilesRouter.patch('/:profileId', updateProfileController);
profilesRouter.delete('/:profileId', deleteProfileController);

// Social Links (SPEC-06 §4.1)
profilesRouter.post('/:profileId/social-links', addSocialLinkController);
profilesRouter.patch('/:profileId/social-links/:linkId', updateSocialLinkController);
profilesRouter.delete('/:profileId/social-links/:linkId', deleteSocialLinkController);

// Profile Tag Assignment (SPEC-06 §4.2)
profilesRouter.put('/:profileId/tags', assignTagsController);

// Tag Taxonomy Router (SPEC-06 §4.2)
export const tagsRouter = Router();
tagsRouter.get('/', getTagsController);
tagsRouter.post('/', createTagController);
tagsRouter.delete('/:tagId', deleteTagController);
