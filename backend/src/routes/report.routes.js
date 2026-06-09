import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import {
  importCsv,
  exportCsv,
  exportPdf,
  listImportJobs,
} from '../controllers/report.controller.js';

const router = Router();

// In-memory storage for CSV uploads (parsed immediately, not persisted).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

router.use(authenticate);

router.post('/import/csv', upload.single('file'), importCsv);
router.get('/import/jobs', listImportJobs);
router.get('/export/csv', exportCsv);
router.get('/export/pdf', exportPdf);

export default router;
