import type { Request, Response } from 'express';
import { createGroupSchema, updateGroupSchema, addMemberSchema, settleSchema } from './splits.schema.js';
import * as service from './splits.service.js';

export async function list(req: Request, res: Response): Promise<void> {
  const groups = await service.listGroups(req.user!.id);
  res.json(groups.map(service.serializeGroup));
}

export async function retrieve(req: Request, res: Response): Promise<void> {
  const group = await service.getGroup(req.user!.id, req.params.id);
  res.json(service.serializeGroup(group));
}

export async function create(req: Request, res: Response): Promise<void> {
  const { name } = createGroupSchema.parse(req.body);
  const group = await service.createGroup(req.user!.id, name);
  res.status(201).json(service.serializeGroup(group));
}

export async function update(req: Request, res: Response): Promise<void> {
  const input = updateGroupSchema.parse(req.body);
  const group = await service.updateGroup(req.user!.id, req.params.id, input.name ?? '');
  res.json(service.serializeGroup(group));
}

export async function remove(req: Request, res: Response): Promise<void> {
  await service.deleteGroup(req.user!.id, req.params.id);
  res.status(204).send();
}

export async function addMember(req: Request, res: Response): Promise<void> {
  const input = addMemberSchema.parse(req.body);
  const member = await service.addMember(req.user!.id, req.params.id, input);
  res.status(201).json(service.serializeMember(member));
}

export async function balances(req: Request, res: Response): Promise<void> {
  const result = await service.groupBalances(req.user!.id, req.params.id);
  res.json(result);
}

export async function settle(req: Request, res: Response): Promise<void> {
  const input = settleSchema.parse(req.body);
  const settlement = await service.settle(req.user!.id, req.params.id, input);
  res.status(201).json(service.serializeSettlement(settlement));
}
