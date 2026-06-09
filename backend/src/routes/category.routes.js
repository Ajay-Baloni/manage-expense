import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/category.controller.js';
import {
  listBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
  currentMonthBudgets,
} from '../controllers/budget.controller.js';

const router = Router();

router.use(authenticate);

/* --- Budgets sub-resource (must be before /:id) --- */
const budgetsRouter = Router();
budgetsRouter.get('/current_month', currentMonthBudgets);
budgetsRouter.get('/', listBudgets);
budgetsRouter.post('/', createBudget);
budgetsRouter.put('/:id', updateBudget);
budgetsRouter.patch('/:id', updateBudget);
budgetsRouter.delete('/:id', deleteBudget);
router.use('/budgets', budgetsRouter);

/* --- Categories collection & detail --- */
router.get('/', listCategories);
router.post('/', createCategory);
router.put('/:id', updateCategory);
router.patch('/:id', updateCategory);
router.delete('/:id', deleteCategory);

export default router;
