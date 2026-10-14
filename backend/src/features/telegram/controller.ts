import type { Request, Response, NextFunction } from 'express';
import {
  dialogsService,
  type DialogCategory,
} from './service.js';
import {
  createPaginatedEnvelope,
  createSuccessEnvelope,
} from '../../common/index.js';

export async function getDialogsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const category = (req.query.category as DialogCategory) || 'all';
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 30;
    const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
    const cursor = req.query.cursor ? String(req.query.cursor) : undefined;
    const q = req.query.q ? String(req.query.q) : undefined;
    const tagId = req.query.tagId ? String(req.query.tagId) : undefined;
    const refresh = req.query.refresh === 'true' || req.query.refresh === '1';

    const result = await dialogsService.getDialogs({
      category,
      limit,
      page,
      cursor,
      q,
      tagId,
      refresh,
    });

    res.status(200).json(
      createPaginatedEnvelope(result.items, {
        total: result.total,
        page: result.page,
        limit,
        totalPages: result.totalPages,
        nextCursor: null,
        hasMore: result.hasMore,
      })
    );
  } catch (error) {
    next(error);
  }
}

export async function refreshEntityController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const entityId = String(req.params.entityId);
    const refreshed = await dialogsService.refreshEntity(entityId);
    res.status(200).json(createSuccessEnvelope(refreshed));
  } catch (error) {
    next(error);
  }
}

export async function getMessagesController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const peerId = String(req.params.peerId);
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
    const offsetId = req.query.offsetId ? parseInt(String(req.query.offsetId), 10) : undefined;
    const offsetDate = req.query.offsetDate ? parseInt(String(req.query.offsetDate), 10) : undefined;

    const result = await dialogsService.getMessages(peerId, {
      limit,
      offsetId,
      offsetDate,
    });

    res.status(200).json(
      createPaginatedEnvelope(result.items, {
        total: result.total,
        page: result.page,
        limit,
        totalPages: result.totalPages,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      })
    );
  } catch (error) {
    next(error);
  }
}
