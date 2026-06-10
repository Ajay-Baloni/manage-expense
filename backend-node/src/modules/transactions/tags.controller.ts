import type { Request, Response } from 'express';
import { createTagSchema, updateTagSchema } from './tags.schema.js';
import * as service from './tags.service.js';

export async function list(req: Request, res: Response): Promise<void> {
  const tags = await service.listTags(req.user!.id);
  res.json(tags.map(service.serializeTag));
}

export async function create(req: Request, res: Response): Promise<void> {
  const input = createTagSchema.parse(req.body);
  const tag = await service.createTag(req.user!.id, input);
  res.status(201).json(service.serializeTag(tag));
}

export async function update(req: Request, res: Response): Promise<void> {
  const input = updateTagSchema.parse(req.body);
  const tag = await service.updateTag(req.user!.id, req.params.id, input);
  res.json(service.serializeTag(tag));
}

export async function remove(req: Request, res: Response): Promise<void> {
  await service.deleteTag(req.user!.id, req.params.id);
  res.status(204).send();
}
