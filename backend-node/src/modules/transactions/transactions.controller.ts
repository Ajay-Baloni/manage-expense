import type { Request, Response } from 'express';
import {
  createTransactionSchema,
  updateTransactionSchema,
  listTransactionsQuerySchema,
} from './transactions.schema.js';
import * as service from './transactions.service.js';

export async function list(req: Request, res: Response): Promise<void> {
  const query = listTransactionsQuerySchema.parse(req.query);
  const txns = await service.listTransactions(req.user!.id, query);
  res.json(txns.map(service.serializeTransaction));
}

export async function retrieve(req: Request, res: Response): Promise<void> {
  const txn = await service.getTransaction(req.user!.id, req.params.id);
  res.json(service.serializeTransaction(txn));
}

export async function create(req: Request, res: Response): Promise<void> {
  const input = createTransactionSchema.parse(req.body);
  const txn = await service.createTransaction(req.user!.id, input);
  res.status(201).json(service.serializeTransaction(txn));
}

export async function update(req: Request, res: Response): Promise<void> {
  const input = updateTransactionSchema.parse(req.body);
  const txn = await service.updateTransaction(req.user!.id, req.params.id, input);
  res.json(service.serializeTransaction(txn));
}

export async function remove(req: Request, res: Response): Promise<void> {
  await service.deleteTransaction(req.user!.id, req.params.id);
  res.status(204).send();
}

export async function dashboardSummary(req: Request, res: Response): Promise<void> {
  const summary = await service.dashboardSummary(req.user!.id);
  res.json(summary);
}
