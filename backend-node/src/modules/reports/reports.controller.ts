import type { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import { z } from 'zod';
import { AppError } from '../../utils/AppError.js';
import { toNumber, toYMD } from '../../utils/serialize.js';
import * as service from './reports.service.js';

const exportFiltersSchema = z.object({
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  type: z.enum(['income', 'expense']).optional(),
  category: z.string().optional(),
});

export async function importCsv(req: Request, res: Response): Promise<void> {
  const file = req.file;
  if (!file) throw AppError.badRequest('No file provided');
  const content = file.buffer.toString('utf-8');
  const result = await service.importCsv(req.user!.id, file.originalname, content);
  res.status(201).json(result);
}

export async function exportCsv(req: Request, res: Response): Promise<void> {
  const filters = exportFiltersSchema.parse(req.query);
  const txns = await service.transactionsForExport(req.user!.id, filters);

  const lines = [['date', 'type', 'amount', 'category', 'description', 'notes'].join(',')];
  const { csvRow } = await import('./csv.js');
  for (const t of txns) {
    lines.push(
      csvRow([toYMD(t.date), t.type, toNumber(t.amount), t.category?.name ?? '', t.description, t.notes]),
    );
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
  res.send(lines.join('\n'));
}

export async function exportPdf(req: Request, res: Response): Promise<void> {
  const filters = exportFiltersSchema.parse(req.query);
  const txns = await service.transactionsForExport(req.user!.id, filters);

  const totalIncome = txns.filter((t) => t.type === 'income').reduce((s, t) => s + toNumber(t.amount), 0);
  const totalExpense = txns.filter((t) => t.type === 'expense').reduce((s, t) => s + toNumber(t.amount), 0);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="expense_report.pdf"');

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  doc.pipe(res);

  doc.fontSize(20).text('Expense Report', { align: 'center' });
  doc.moveDown();

  const money = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  doc.fontSize(12);
  doc.text(`Total Income:  ${money(totalIncome)}`);
  doc.text(`Total Expense: ${money(totalExpense)}`);
  doc.text(`Net Balance:   ${money(totalIncome - totalExpense)}`);
  doc.moveDown();

  doc.fontSize(14).text('Transactions');
  doc.moveDown(0.5);
  doc.fontSize(10);
  for (const t of txns.slice(0, 200)) {
    const cat = t.category?.name ?? '-';
    doc.text(
      `${toYMD(t.date)}  ${t.type.padEnd(8)}  ${money(toNumber(t.amount)).padStart(12)}  ${cat}  ${t.description.slice(0, 40)}`,
    );
  }

  doc.end();
}

export async function listImportJobs(req: Request, res: Response): Promise<void> {
  const jobs = await service.listImportJobs(req.user!.id);
  res.json(jobs.map(service.serializeImportJob));
}
