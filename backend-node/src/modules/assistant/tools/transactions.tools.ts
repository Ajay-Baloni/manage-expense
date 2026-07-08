import { z } from 'zod';
import { tool } from '@langchain/core/tools';
import { interrupt } from '@langchain/langgraph';
import type { RunnableConfig } from '@langchain/core/runnables';
import * as txn from '../../transactions/transactions.service.js';
import {
  createTransactionSchema,
  updateTransactionSchema,
} from '../../transactions/transactions.schema.js';

// --- helpers ---------------------------------------------------------------

function userIdOf(config: RunnableConfig): string {
  const id = config?.configurable?.userId as string | undefined;
  if (!id) throw new Error('Missing userId in graph config');
  return id;
}

type Review = { decision: 'confirm' | 'cancel'; editedArgs?: unknown };

/**
 * Pauses the graph and hands the proposed action to the client for
 * confirmation/editing. Resumes with { decision, editedArgs }.
 *
 * On resume the tool node REPLAYS this function from the top, so keep every
 * real side-effect (the service call) AFTER this line — never before it.
 */
function requestApproval(action: string, proposed: unknown): Review {
  return interrupt({ type: 'confirm', action, proposed }) as Review;
}

// --- READ tool (runs immediately, no confirmation) -------------------------

const listArgsSchema = z.object({
  type: z.enum(['income', 'expense']).optional(),
  category: z.string().optional().describe('Category id to filter by'),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  amountMin: z.number().optional(),
  amountMax: z.number().optional(),
  search: z.string().optional(),
});

export const listTransactionsTool = tool(
  async (input, config) => {
    const userId = userIdOf(config);
    const rows = await txn.listTransactions(userId, { ...input, ordering: '-date' as const });
    return JSON.stringify({
      count: rows.length,
      transactions: rows.slice(0, 50).map(txn.serializeTransaction),
    });
  },
  {
    name: 'list_transactions',
    description:
      "List or search the user's transactions. Use to answer spending/income questions and to find a transaction's id before updating or deleting it.",
    schema: listArgsSchema,
  },
);

// --- WRITE tools (pause for editable confirmation) -------------------------

const createArgsSchema = createTransactionSchema;

export const createTransactionTool = tool(
  async (input, config) => {
    const userId = userIdOf(config);
    const review = requestApproval('create_transaction', input);
    if (review.decision !== 'confirm') return 'The user cancelled creating the transaction.';
    // Re-validate the (possibly edited) args — the confirm step is a trust boundary.
    const args = createTransactionSchema.parse(review.editedArgs ?? input);
    const created = await txn.createTransaction(userId, args);
    return JSON.stringify({ ok: true, transaction: txn.serializeTransaction(created) });
  },
  {
    name: 'create_transaction',
    description:
      'Record a new income or expense. Modifies data — the user reviews and may edit it before it is saved.',
    schema: createArgsSchema,
  },
);

const updateArgsSchema = updateTransactionSchema.extend({
  id: z.string().describe('ID of the transaction to update'),
});

export const updateTransactionTool = tool(
  async (input, config) => {
    const userId = userIdOf(config);
    const review = requestApproval('update_transaction', input);
    if (review.decision !== 'confirm') return 'The user cancelled updating the transaction.';
    const raw = (review.editedArgs ?? input) as Record<string, unknown>;
    const { id, ...rest } = raw;
    const cleanId = z.string().parse(id);
    const fields = updateTransactionSchema.parse(rest);
    const updated = await txn.updateTransaction(userId, cleanId, fields);
    return JSON.stringify({ ok: true, transaction: txn.serializeTransaction(updated) });
  },
  {
    name: 'update_transaction',
    description:
      'Update an existing transaction by id. Find the id first with list_transactions. Modifies data — user reviews and may edit before saving.',
    schema: updateArgsSchema,
  },
);

export const deleteTransactionTool = tool(
  async (input, config) => {
    const userId = userIdOf(config);
    const review = requestApproval('delete_transaction', input);
    if (review.decision !== 'confirm') return 'The user cancelled deleting the transaction.';
    const raw = (review.editedArgs ?? input) as { id: string };
    const cleanId = z.string().parse(raw.id);
    await txn.deleteTransaction(userId, cleanId);
    return JSON.stringify({ ok: true, deletedId: cleanId });
  },
  {
    name: 'delete_transaction',
    description:
      'Delete a transaction by id. Find the id first with list_transactions. Destructive — user must confirm.',
    schema: z.object({ id: z.string().describe('ID of the transaction to delete') }),
  },
);
