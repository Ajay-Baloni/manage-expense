import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  listGroups,
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup,
  addMember,
  getBalances,
  settle,
  listExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} from '../controllers/split.controller.js';

const router = Router();

router.use(authenticate);

/* --- Groups --- */
const groupsRouter = Router();
groupsRouter.get('/', listGroups);
groupsRouter.post('/', createGroup);
groupsRouter.get('/:id', getGroup);
groupsRouter.put('/:id', updateGroup);
groupsRouter.patch('/:id', updateGroup);
groupsRouter.delete('/:id', deleteGroup);
groupsRouter.post('/:id/add_member', addMember);
groupsRouter.get('/:id/balances', getBalances);
groupsRouter.post('/:id/settle', settle);
router.use('/groups', groupsRouter);

/* --- Expenses --- */
const expensesRouter = Router();
expensesRouter.get('/', listExpenses);
expensesRouter.post('/', createExpense);
expensesRouter.put('/:id', updateExpense);
expensesRouter.patch('/:id', updateExpense);
expensesRouter.delete('/:id', deleteExpense);
router.use('/expenses', expensesRouter);

export default router;
