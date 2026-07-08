import { z } from 'zod';
import { tool } from '@langchain/core/tools';
import type { RunnableConfig } from '@langchain/core/runnables';
import * as txn from '../../transactions/transactions.service.js';

function userIdOf(config: RunnableConfig): string {
  const id = config?.configurable?.userId as string | undefined;
  if (!id) throw new Error('Missing userId in graph config');
  return id;
}

export const dashboardSummaryTool = tool(
  async (_input, config) => {
    const userId = userIdOf(config);
    return JSON.stringify(await txn.dashboardSummary(userId));
  },
  {
    name: 'get_dashboard_summary',
    description:
      'Get this-month vs last-month income/expense totals, a 6-month trend, and top expense categories. Use for "how much did I spend", "my dashboard", income-vs-expense questions.',
    schema: z.object({}),
  },
);
