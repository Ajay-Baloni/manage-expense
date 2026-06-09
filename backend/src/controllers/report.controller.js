import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import PDFDocument from 'pdfkit';
import prisma from '../config/prisma.js';
import { toNumber, toDateOnly, toIso } from '../utils/serialize.js';
import { parseDateOnly } from '../utils/dates.js';
import { badRequest } from '../middleware/error.js';

/* ------------------------------------------------------------------ */
/* CSV import                                                         */
/* ------------------------------------------------------------------ */

const INCOME_KEYWORDS = ['income', 'credit', 'deposit'];

function normalizeHeader(h) {
  return String(h || '').trim().toLowerCase();
}

function pick(row, ...keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
      return String(row[key]).trim();
    }
  }
  return '';
}

/**
 * Parse a date cell, accepting several common formats. Returns a UTC Date or null.
 */
function parseImportDate(value) {
  if (!value) return null;
  const str = String(value).trim();

  // ISO YYYY-MM-DD
  let m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    return makeUtc(Number(m[1]), Number(m[2]), Number(m[3]));
  }

  // Separators / or -
  m = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) {
    let a = Number(m[1]);
    let b = Number(m[2]);
    let year = Number(m[3]);
    if (year < 100) year += 2000;

    // Decide MM/DD vs DD/MM. If first > 12 it must be a day.
    let month;
    let day;
    if (a > 12 && b <= 12) {
      day = a;
      month = b;
    } else if (b > 12 && a <= 12) {
      month = a;
      day = b;
    } else {
      // Ambiguous ⇒ assume MM/DD (US default per spec ordering).
      month = a;
      day = b;
    }
    return makeUtc(year, month, day);
  }

  // Fallback to Date parsing.
  const d = new Date(str);
  if (!Number.isNaN(d.getTime())) {
    return makeUtc(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }
  return null;
}

function makeUtc(year, month, day) {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function parseAmount(value) {
  if (value === undefined || value === null) return NaN;
  const cleaned = String(value).replace(/[$,\s]/g, '');
  return Number(cleaned);
}

function inferType(raw) {
  const t = normalizeHeader(raw);
  if (t === 'income') return 'income';
  if (t === 'expense') return 'expense';
  if (INCOME_KEYWORDS.includes(t)) return 'income';
  return 'expense';
}

async function getOrCreateCategory(userId, name, cache) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return null;
  const key = trimmed.toLowerCase();
  if (cache.has(key)) return cache.get(key);

  let cat = await prisma.category.findFirst({
    where: {
      name: { equals: trimmed, mode: 'insensitive' },
      OR: [{ userId }, { userId: null }],
    },
  });
  if (!cat) {
    cat = await prisma.category.create({
      data: { userId, name: trimmed, isDefault: false },
    });
  }
  cache.set(key, cat.id);
  return cat.id;
}

export async function importCsv(req, res) {
  if (!req.file) {
    throw badRequest({ file: ['No file uploaded.'] });
  }

  const fileName = req.file.originalname || 'import.csv';

  const job = await prisma.importJob.create({
    data: { userId: req.user.id, fileName, status: 'processing' },
  });

  const errors = [];
  let records = [];
  let importedRows = 0;
  let totalRows = 0;

  try {
    records = parse(req.file.buffer, {
      columns: (header) => header.map(normalizeHeader),
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      bom: true,
    });
  } catch (err) {
    await prisma.importJob.update({
      where: { id: job.id },
      data: { status: 'failed', errorsJson: [{ row: 0, error: 'Could not parse CSV file.' }] },
    });
    return res.status(400).json({
      job_id: job.id,
      total_rows: 0,
      imported_rows: 0,
      error_count: 1,
      errors: [{ row: 0, error: 'Could not parse CSV file.' }],
    });
  }

  totalRows = records.length;
  const categoryCache = new Map();

  for (let i = 0; i < records.length; i += 1) {
    const row = records[i];
    const rowNumber = i + 2; // +1 for header, +1 for 1-indexing

    try {
      const dateRaw = pick(row, 'date');
      if (!dateRaw) {
        errors.push({ row: rowNumber, error: 'Missing required field: date' });
        continue;
      }
      const date = parseImportDate(dateRaw);
      if (!date) {
        errors.push({ row: rowNumber, error: `Invalid date: ${dateRaw}` });
        continue;
      }

      const amountRaw = pick(row, 'amount');
      if (!amountRaw) {
        errors.push({ row: rowNumber, error: 'Missing required field: amount' });
        continue;
      }
      const amount = parseAmount(amountRaw);
      if (Number.isNaN(amount) || amount <= 0) {
        errors.push({ row: rowNumber, error: `Invalid amount: ${amountRaw}` });
        continue;
      }

      const description = pick(row, 'description', 'name') || 'Imported';
      const type = inferType(pick(row, 'type'));
      const categoryName = pick(row, 'category');
      const categoryId = categoryName
        ? await getOrCreateCategory(req.user.id, categoryName, categoryCache)
        : null;
      const notes = pick(row, 'notes');

      await prisma.transaction.create({
        data: {
          userId: req.user.id,
          type,
          amount,
          categoryId,
          date,
          description,
          notes,
        },
      });
      importedRows += 1;
    } catch (err) {
      errors.push({ row: rowNumber, error: err.message || 'Failed to import row.' });
    }
  }

  const trimmedErrors = errors.slice(0, 20);

  await prisma.importJob.update({
    where: { id: job.id },
    data: {
      status: 'completed',
      totalRows,
      importedRows,
      errorsJson: trimmedErrors,
    },
  });

  res.json({
    job_id: job.id,
    total_rows: totalRows,
    imported_rows: importedRows,
    error_count: errors.length,
    errors: trimmedErrors,
  });
}

/* ------------------------------------------------------------------ */
/* Filters shared by exports                                          */
/* ------------------------------------------------------------------ */

function buildExportWhere(req) {
  const where = { userId: req.user.id };
  if (req.query.type) where.type = String(req.query.type);
  if (req.query.category) {
    const catId = parseInt(req.query.category, 10);
    if (!Number.isNaN(catId)) where.categoryId = catId;
  }
  const dateFilter = {};
  if (req.query.date_from) {
    const d = parseDateOnly(req.query.date_from);
    if (d) dateFilter.gte = d;
  }
  if (req.query.date_to) {
    const d = parseDateOnly(req.query.date_to);
    if (d) dateFilter.lte = d;
  }
  if (Object.keys(dateFilter).length) where.date = dateFilter;
  return where;
}

/* ------------------------------------------------------------------ */
/* CSV export                                                         */
/* ------------------------------------------------------------------ */

export async function exportCsv(req, res) {
  const where = buildExportWhere(req);
  const rows = await prisma.transaction.findMany({
    where,
    include: { category: true },
    orderBy: { date: 'desc' },
  });

  const records = rows.map((t) => ({
    date: toDateOnly(t.date),
    type: t.type,
    amount: toNumber(t.amount),
    category: t.category ? t.category.name : '',
    description: t.description,
    notes: t.notes || '',
  }));

  const csv = stringify(records, {
    header: true,
    columns: ['date', 'type', 'amount', 'category', 'description', 'notes'],
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
  res.send(csv);
}

/* ------------------------------------------------------------------ */
/* PDF export                                                         */
/* ------------------------------------------------------------------ */

export async function exportPdf(req, res) {
  const where = buildExportWhere(req);
  const rows = await prisma.transaction.findMany({
    where,
    include: { category: true },
    orderBy: { date: 'desc' },
  });

  let totalIncome = 0;
  let totalExpense = 0;
  for (const t of rows) {
    const amt = toNumber(t.amount) || 0;
    if (t.type === 'income') totalIncome += amt;
    else if (t.type === 'expense') totalExpense += amt;
  }
  const net = totalIncome - totalExpense;

  const doc = new PDFDocument({ size: 'A4', margin: 40 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="expense_report.pdf"');
  doc.pipe(res);

  doc.fontSize(20).text('Expense Report', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#555').text(`Generated: ${new Date().toISOString().slice(0, 10)}`, {
    align: 'center',
  });
  doc.moveDown(1);

  // Summary
  doc.fillColor('#000').fontSize(13).text('Summary');
  doc.moveDown(0.3);
  doc.fontSize(11);
  doc.text(`Total Income:  ${totalIncome.toFixed(2)}`);
  doc.text(`Total Expense: ${totalExpense.toFixed(2)}`);
  doc.text(`Net Balance:   ${net.toFixed(2)}`);
  doc.moveDown(1);

  // Table header
  const startX = doc.page.margins.left;
  const colWidths = { date: 70, type: 60, amount: 75, category: 110, description: 150 };
  const headers = [
    ['Date', colWidths.date],
    ['Type', colWidths.type],
    ['Amount', colWidths.amount],
    ['Category', colWidths.category],
    ['Description', colWidths.description],
  ];

  function drawRow(cells, y, isHeader = false) {
    let x = startX;
    doc.fontSize(isHeader ? 10 : 9).fillColor(isHeader ? '#000' : '#222');
    if (isHeader) doc.font('Helvetica-Bold');
    else doc.font('Helvetica');
    headers.forEach(([, width], idx) => {
      doc.text(String(cells[idx] ?? ''), x + 2, y, { width: width - 4, ellipsis: true });
      x += width;
    });
    doc.font('Helvetica');
  }

  doc.fontSize(13).fillColor('#000').font('Helvetica-Bold').text('Transactions');
  doc.font('Helvetica');
  doc.moveDown(0.5);

  let y = doc.y;
  drawRow(headers.map((h) => h[0]), y, true);
  y += 16;
  doc.moveTo(startX, y - 2).lineTo(startX + 465, y - 2).strokeColor('#ccc').stroke();

  const limited = rows.slice(0, 200);
  for (const t of limited) {
    if (y > doc.page.height - doc.page.margins.bottom - 20) {
      doc.addPage();
      y = doc.page.margins.top;
      drawRow(headers.map((h) => h[0]), y, true);
      y += 16;
      doc.moveTo(startX, y - 2).lineTo(startX + 465, y - 2).strokeColor('#ccc').stroke();
    }
    drawRow(
      [
        toDateOnly(t.date),
        t.type,
        (toNumber(t.amount) || 0).toFixed(2),
        t.category ? t.category.name : '',
        t.description || '',
      ],
      y
    );
    y += 14;
  }

  doc.end();
}

/* ------------------------------------------------------------------ */
/* Import jobs                                                        */
/* ------------------------------------------------------------------ */

export async function listImportJobs(req, res) {
  const jobs = await prisma.importJob.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  res.json(
    jobs.map((j) => {
      const errorsArr = Array.isArray(j.errorsJson) ? j.errorsJson : [];
      return {
        id: j.id,
        file_name: j.fileName,
        status: j.status,
        total_rows: j.totalRows,
        imported_rows: j.importedRows,
        error_count: errorsArr.length,
        created_at: toIso(j.createdAt),
      };
    })
  );
}
