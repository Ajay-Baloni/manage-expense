import {
  listTransactionsTool,
  createTransactionTool,
  updateTransactionTool,
  deleteTransactionTool,
} from './transactions.tools.js';
import { dashboardSummaryTool } from './reports.tools.js';

export const allTools = [
  listTransactionsTool,
  createTransactionTool,
  updateTransactionTool,
  deleteTransactionTool,
  dashboardSummaryTool,
];
