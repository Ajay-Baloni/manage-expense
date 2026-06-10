import type { Request, Response } from 'express';
import { createBudgetSchema, updateBudgetSchema } from './budgets.schema.js';
import * as service from './budgets.service.js';

export async function list(req: Request, res: Response): Promise<void> {
  const month = typeof req.query.month === 'string' ? req.query.month : undefined;
  const budgets = await service.listBudgets(req.user!.id, month);
  res.json(await Promise.all(budgets.map(service.serializeBudget)));
}

/** Budgets are recurring; current-month just returns all with current-period spend. */
export async function currentMonth(req: Request, res: Response): Promise<void> {
  const budgets = await service.listBudgets(req.user!.id);
  res.json(await Promise.all(budgets.map(service.serializeBudget)));
}

export async function create(req: Request, res: Response): Promise<void> {
  const input = createBudgetSchema.parse(req.body);
  const budget = await service.createBudget(req.user!.id, input);
  res.status(201).json(await service.serializeBudget(budget));
}

export async function update(req: Request, res: Response): Promise<void> {
  const input = updateBudgetSchema.parse(req.body);
  const budget = await service.updateBudget(req.user!.id, req.params.id, input);
  res.json(await service.serializeBudget(budget));
}

export async function remove(req: Request, res: Response): Promise<void> {
  await service.deleteBudget(req.user!.id, req.params.id);
  res.status(204).send();
}
