import type { Request, Response } from 'express';
import { createExpenseSchema } from './splits.schema.js';
import * as service from './splits.service.js';

export async function list(req: Request, res: Response): Promise<void> {
  const groupId = typeof req.query.group === 'string' ? req.query.group : undefined;
  const expenses = await service.listExpenses(req.user!.id, groupId);
  res.json(expenses.map(service.serializeExpense));
}

export async function create(req: Request, res: Response): Promise<void> {
  const input = createExpenseSchema.parse(req.body);
  const expense = await service.createExpense(req.user!.id, input);
  res.status(201).json(service.serializeExpense(expense));
}

export async function remove(req: Request, res: Response): Promise<void> {
  await service.deleteExpense(req.user!.id, req.params.id);
  res.status(204).send();
}
