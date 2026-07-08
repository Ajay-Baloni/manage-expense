import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { Command, INTERRUPT, isInterrupted } from '@langchain/langgraph';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import { AppError } from '../../utils/AppError.js';
import { graph } from './graph.js';

const chatBodySchema = z.object({
  message: z.string().min(1).max(4000),
  threadId: z.string().uuid().optional(),
});

const confirmBodySchema = z.object({
  threadId: z.string().uuid(),
  decision: z.enum(['confirm', 'cancel']),
  editedArgs: z.unknown().optional(),
  interruptId: z.string().optional(),
});

function configFor(threadId: string, userId: string) {
  return { configurable: { thread_id: threadId, userId } };
}

async function pendingInterruptId(config: ReturnType<typeof configFor>): Promise<string | undefined> {
  const state = await graph.getState(config);
  return state.tasks.flatMap((t) => t.interrupts)[0]?.id;
}

function textOf(msg: BaseMessage | undefined): string {
  if (!msg) return '';
  const c = msg.content;
  if (typeof c === 'string') return c;
  return c.map((p) => (typeof p === 'string' ? p : (p as { text?: string }).text ?? '')).join('');
}

function lastAiText(messages: BaseMessage[]): string {
  return textOf([...messages].reverse().find((m) => m instanceof AIMessage));
}

function reply(result: unknown, threadId: string, res: Response): void {
  if (isInterrupted(result)) {
    const pending = result[INTERRUPT][0];
    res.json({ threadId, status: 'confirm_required', interruptId: pending.id, pending: pending.value });
    return;
  }
  const { messages } = result as { messages: BaseMessage[] };
  res.json({ threadId, status: 'done', reply: lastAiText(messages) });
}

export async function chat(req: Request, res: Response): Promise<void> {
  const { message, threadId } = chatBodySchema.parse(req.body);
  const id = threadId ?? randomUUID();
  const config = configFor(id, req.user!.id);

  // A paused thread must be resolved through /confirm before accepting new input;
  // invoking a paused thread with a fresh message would replay the pending tool call.
  if (threadId && (await pendingInterruptId(config)) !== undefined) {
    throw AppError.conflict('A pending action awaits confirmation on this conversation', { threadId: id });
  }

  const result = await graph.invoke({ messages: [new HumanMessage(message)] }, config);
  reply(result, id, res);
}

export async function confirm(req: Request, res: Response): Promise<void> {
  const { threadId, decision, editedArgs, interruptId } = confirmBodySchema.parse(req.body);
  const config = configFor(threadId, req.user!.id);

  const pendingId = await pendingInterruptId(config);
  if (pendingId === undefined) {
    throw AppError.conflict('No pending action to confirm on this conversation', { threadId });
  }

  // Resume by interrupt id — the id-keyed map targets the exact pause point;
  // any other pending interrupt re-surfaces on the next response.
  const resume = { [interruptId ?? pendingId]: { decision, editedArgs } };
  const result = await graph.invoke(new Command({ resume }), config);
  reply(result, threadId, res);
}
