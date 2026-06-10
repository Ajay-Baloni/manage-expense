import type { Request, Response } from 'express';
import { createCategorySchema, updateCategorySchema } from './categories.schema.js';
import * as service from './categories.service.js';

export async function list(req: Request, res: Response): Promise<void> {
  const categories = await service.listCategories(req.user!.id);
  res.json(categories.map(service.serializeCategory));
}

export async function create(req: Request, res: Response): Promise<void> {
  const input = createCategorySchema.parse(req.body);
  const category = await service.createCategory(req.user!.id, input);
  res.status(201).json(service.serializeCategory(category));
}

export async function update(req: Request, res: Response): Promise<void> {
  const input = updateCategorySchema.parse(req.body);
  const category = await service.updateCategory(req.user!.id, req.params.id, input);
  res.json(service.serializeCategory(category));
}

export async function remove(req: Request, res: Response): Promise<void> {
  await service.deleteCategory(req.user!.id, req.params.id);
  res.status(204).send();
}
