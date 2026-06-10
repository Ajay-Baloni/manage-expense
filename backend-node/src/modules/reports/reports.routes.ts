import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.js';
import { csvUpload } from '../../middleware/upload.js';
import * as ctrl from './reports.controller.js';

export const reportsRouter = Router();

reportsRouter.use(requireAuth);
reportsRouter.post('/import', csvUpload.single('file'), asyncHandler(ctrl.importCsv));
reportsRouter.get('/export.csv', asyncHandler(ctrl.exportCsv));
reportsRouter.get('/export.pdf', asyncHandler(ctrl.exportPdf));
reportsRouter.get('/import-jobs', asyncHandler(ctrl.listImportJobs));
