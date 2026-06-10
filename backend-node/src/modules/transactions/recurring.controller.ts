import type { Request, Response } from 'express';
import { createRecurringSchema, updateRecurringSchema } from './recurring.schema.js';
import * as service from './recurring.service.js';

export async function list(req: Request, res: Response): Promise<void> {
  const rules = await service.listRecurring(req.user!.id);
  res.json(rules.map(service.serializeRecurring));
}

export async function create(req: Request, res: Response): Promise<void> {
  const input = createRecurringSchema.parse(req.body);
  const rule = await service.createRecurring(req.user!.id, input);
  res.status(201).json(service.serializeRecurring(rule));
}

export async function update(req: Request, res: Response): Promise<void> {
  const input = updateRecurringSchema.parse(req.body);
  const rule = await service.updateRecurring(req.user!.id, req.params.id, input);
  res.json(service.serializeRecurring(rule));
}

export async function remove(req: Request, res: Response): Promise<void> {
  await service.deleteRecurring(req.user!.id, req.params.id);
  res.status(204).send();
}
