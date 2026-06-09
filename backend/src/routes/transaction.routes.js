import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { authenticate } from '../middleware/auth.js';
import {
  listTransactions,
  createTransaction,
  getTransaction,
  updateTransaction,
  deleteTransaction,
  dashboardSummary,
} from '../controllers/transaction.controller.js';
import {
  listTags,
  createTag,
  updateTag,
  deleteTag,
} from '../controllers/tag.controller.js';
import {
  listRecurring,
  createRecurring,
  updateRecurring,
  deleteRecurring,
} from '../controllers/recurring.controller.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, '../../uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();

router.use(authenticate);

/* --- Tags sub-resource (must be before /:id) --- */
const tagsRouter = Router();
tagsRouter.get('/', listTags);
tagsRouter.post('/', createTag);
tagsRouter.put('/:id', updateTag);
tagsRouter.patch('/:id', updateTag);
tagsRouter.delete('/:id', deleteTag);
router.use('/tags', tagsRouter);

/* --- Recurring sub-resource (must be before /:id) --- */
const recurringRouter = Router();
recurringRouter.get('/', listRecurring);
recurringRouter.post('/', createRecurring);
recurringRouter.put('/:id', updateRecurring);
recurringRouter.patch('/:id', updateRecurring);
recurringRouter.delete('/:id', deleteRecurring);
router.use('/recurring', recurringRouter);

/* --- Specific action route before /:id --- */
router.get('/dashboard_summary', dashboardSummary);

/* --- Transactions collection --- */
router.get('/', listTransactions);
router.post('/', upload.single('receipt_file'), createTransaction);

/* --- Transaction detail --- */
router.get('/:id', getTransaction);
router.put('/:id', upload.single('receipt_file'), updateTransaction);
router.patch('/:id', upload.single('receipt_file'), updateTransaction);
router.delete('/:id', deleteTransaction);

export default router;
