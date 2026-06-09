import prisma from '../config/prisma.js';
import {
  serializeCategory,
  serializeTag,
  toNumber,
  toDateOnly,
  toIso,
} from '../utils/serialize.js';
import {
  parseDateOnly,
  todayUtc,
  firstOfMonth,
  addMonths,
  endOfMonthExclusive,
  monthKey,
  round2,
} from '../utils/dates.js';
import { paginate, getPage, getSkipTake } from '../utils/pagination.js';
import { badRequest, notFound } from '../middleware/error.js';

const txInclude = {
  category: true,
  tags: { include: { tag: true } },
};

function serializeTransaction(tx) {
  return {
    id: tx.id,
    type: tx.type,
    amount: toNumber(tx.amount),
    category: tx.categoryId ?? null,
    category_detail: tx.category ? serializeCategory(tx.category) : null,
    date: toDateOnly(tx.date),
    description: tx.description,
    tags: (tx.tags || []).map((tt) => serializeTag(tt.tag)),
    receipt_url: tx.receiptUrl ?? '',
    receipt_file: tx.receiptFile ?? null,
    notes: tx.notes ?? '',
    created_at: toIso(tx.createdAt),
    updated_at: toIso(tx.updatedAt),
  };
}

function buildOrderBy(ordering) {
  const allowed = { date: 'date', amount: 'amount', created_at: 'createdAt' };
  let field = 'date';
  let dir = 'desc';
  if (ordering) {
    const raw = String(ordering);
    if (raw.startsWith('-')) {
      dir = 'desc';
      field = raw.slice(1);
    } else {
      dir = 'asc';
      field = raw;
    }
  }
  const mapped = allowed[field] || 'date';
  if (!ordering) return { date: 'desc' };
  return { [mapped]: dir };
}

export async function listTransactions(req, res) {
  const page = getPage(req);
  const { skip, take } = getSkipTake(page);

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

  const amountFilter = {};
  if (req.query.amount_min !== undefined && req.query.amount_min !== '') {
    const v = Number(req.query.amount_min);
    if (!Number.isNaN(v)) amountFilter.gte = v;
  }
  if (req.query.amount_max !== undefined && req.query.amount_max !== '') {
    const v = Number(req.query.amount_max);
    if (!Number.isNaN(v)) amountFilter.lte = v;
  }
  if (Object.keys(amountFilter).length) where.amount = amountFilter;

  if (req.query.search) {
    where.description = { contains: String(req.query.search), mode: 'insensitive' };
  }

  if (req.query.tags) {
    const tagIds = String(req.query.tags)
      .split(',')
      .map((t) => parseInt(t.trim(), 10))
      .filter((n) => !Number.isNaN(n));
    if (tagIds.length) {
      where.tags = { some: { tagId: { in: tagIds } } };
    }
  }

  const orderBy = buildOrderBy(req.query.ordering);

  const [count, rows] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({ where, include: txInclude, orderBy, skip, take }),
  ]);

  res.json(
    paginate({ req, count, page, results: rows.map(serializeTransaction) })
  );
}

async function resolveTagIds(userId, tagIds) {
  if (!Array.isArray(tagIds) || !tagIds.length) return [];
  const ids = tagIds.map((t) => parseInt(t, 10)).filter((n) => !Number.isNaN(n));
  if (!ids.length) return [];
  const tags = await prisma.tag.findMany({
    where: { id: { in: ids }, userId },
    select: { id: true },
  });
  return tags.map((t) => t.id);
}

function parseTagIdsField(body) {
  let tagIds = body.tag_ids;
  if (tagIds === undefined) return undefined;
  if (typeof tagIds === 'string') {
    // multipart sends arrays as repeated fields or JSON strings.
    try {
      const parsed = JSON.parse(tagIds);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return tagIds
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [tagIds];
  }
  return tagIds;
}

export async function createTransaction(req, res) {
  const body = req.body || {};
  const type = body.type;
  const amount = Number(body.amount);

  if (!type || !['income', 'expense'].includes(type)) {
    throw badRequest({ type: ['Must be "income" or "expense".'] });
  }
  if (Number.isNaN(amount) || amount <= 0) {
    throw badRequest({ amount: ['Amount must be greater than 0.'] });
  }
  if (!body.date) {
    throw badRequest({ date: ['This field is required.'] });
  }
  const date = parseDateOnly(body.date);
  if (!date) throw badRequest({ date: ['Invalid date.'] });

  let categoryId = null;
  if (body.category !== undefined && body.category !== null && body.category !== '') {
    categoryId = parseInt(body.category, 10);
    if (Number.isNaN(categoryId)) categoryId = null;
    else {
      const cat = await prisma.category.findFirst({
        where: { id: categoryId, OR: [{ userId: req.user.id }, { userId: null }] },
      });
      if (!cat) throw badRequest({ category: ['Invalid category.'] });
    }
  }

  const tagIdsRaw = parseTagIdsField(body);
  const tagIds = await resolveTagIds(req.user.id, tagIdsRaw || []);

  const receiptFile = req.file ? `/uploads/${req.file.filename}` : body.receipt_file || null;

  const tx = await prisma.transaction.create({
    data: {
      userId: req.user.id,
      type,
      amount,
      categoryId,
      date,
      description: body.description || '',
      receiptUrl: body.receipt_url || '',
      receiptFile,
      notes: body.notes || '',
      tags: tagIds.length
        ? { create: tagIds.map((tagId) => ({ tagId })) }
        : undefined,
    },
    include: txInclude,
  });

  res.status(201).json(serializeTransaction(tx));
}

async function getOwnedTransaction(userId, id) {
  const tx = await prisma.transaction.findFirst({
    where: { id, userId },
    include: txInclude,
  });
  if (!tx) throw notFound();
  return tx;
}

export async function getTransaction(req, res) {
  const id = parseInt(req.params.id, 10);
  const tx = await getOwnedTransaction(req.user.id, id);
  res.json(serializeTransaction(tx));
}

export async function updateTransaction(req, res) {
  const id = parseInt(req.params.id, 10);
  await getOwnedTransaction(req.user.id, id);

  const body = req.body || {};
  const data = {};

  if (body.type !== undefined) {
    if (!['income', 'expense'].includes(body.type)) {
      throw badRequest({ type: ['Must be "income" or "expense".'] });
    }
    data.type = body.type;
  }
  if (body.amount !== undefined) {
    const amount = Number(body.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      throw badRequest({ amount: ['Amount must be greater than 0.'] });
    }
    data.amount = amount;
  }
  if (body.date !== undefined) {
    const date = parseDateOnly(body.date);
    if (!date) throw badRequest({ date: ['Invalid date.'] });
    data.date = date;
  }
  if (body.description !== undefined) data.description = body.description || '';
  if (body.receipt_url !== undefined) data.receiptUrl = body.receipt_url || '';
  if (body.notes !== undefined) data.notes = body.notes || '';
  if (req.file) data.receiptFile = `/uploads/${req.file.filename}`;
  else if (body.receipt_file !== undefined) data.receiptFile = body.receipt_file || null;

  if (body.category !== undefined) {
    if (body.category === null || body.category === '') {
      data.categoryId = null;
    } else {
      const categoryId = parseInt(body.category, 10);
      if (Number.isNaN(categoryId)) {
        data.categoryId = null;
      } else {
        const cat = await prisma.category.findFirst({
          where: { id: categoryId, OR: [{ userId: req.user.id }, { userId: null }] },
        });
        if (!cat) throw badRequest({ category: ['Invalid category.'] });
        data.categoryId = categoryId;
      }
    }
  }

  const tagIdsRaw = parseTagIdsField(body);
  let updateTags = false;
  let tagIds = [];
  if (tagIdsRaw !== undefined) {
    updateTags = true;
    tagIds = await resolveTagIds(req.user.id, tagIdsRaw || []);
  }

  if (updateTags) {
    await prisma.transactionTag.deleteMany({ where: { transactionId: id } });
  }

  const tx = await prisma.transaction.update({
    where: { id },
    data: {
      ...data,
      ...(updateTags && tagIds.length
        ? { tags: { create: tagIds.map((tagId) => ({ tagId })) } }
        : {}),
    },
    include: txInclude,
  });

  res.json(serializeTransaction(tx));
}

export async function deleteTransaction(req, res) {
  const id = parseInt(req.params.id, 10);
  await getOwnedTransaction(req.user.id, id);
  await prisma.transaction.delete({ where: { id } });
  res.status(204).end();
}

function pctChange(cur, prev) {
  if (prev === 0) {
    return cur > 0 ? 100 : 0;
  }
  return round2(((cur - prev) / prev) * 100);
}

async function sumByType(userId, type, gte, lt) {
  const result = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: { userId, type, date: { gte, lt } },
  });
  return toNumber(result._sum.amount) || 0;
}

export async function dashboardSummary(req, res) {
  const userId = req.user.id;
  const today = todayUtc();
  const tomorrow = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1));
  const curMonthStart = firstOfMonth(today);
  const prevMonthStart = addMonths(curMonthStart, -1);

  // Current period: 1st of current month .. today (inclusive ⇒ exclusive tomorrow)
  const [
    curIncome,
    curExpense,
    prevIncome,
    prevExpense,
    totalIncomeAgg,
    totalExpenseAgg,
  ] = await Promise.all([
    sumByType(userId, 'income', curMonthStart, tomorrow),
    sumByType(userId, 'expense', curMonthStart, tomorrow),
    sumByType(userId, 'income', prevMonthStart, curMonthStart),
    sumByType(userId, 'expense', prevMonthStart, curMonthStart),
    prisma.transaction.aggregate({ _sum: { amount: true }, where: { userId, type: 'income' } }),
    prisma.transaction.aggregate({ _sum: { amount: true }, where: { userId, type: 'expense' } }),
  ]);

  const totalIncome = toNumber(totalIncomeAgg._sum.amount) || 0;
  const totalExpense = toNumber(totalExpenseAgg._sum.amount) || 0;

  // Monthly breakdown: last 6 calendar months (oldest first).
  const breakdownStart = addMonths(curMonthStart, -5);
  const breakdownRows = await prisma.transaction.findMany({
    where: { userId, date: { gte: breakdownStart, lt: tomorrow } },
    select: { type: true, amount: true, date: true },
  });

  const monthly = [];
  for (let i = 0; i < 6; i += 1) {
    const start = addMonths(breakdownStart, i);
    monthly.push({ month: monthKey(start), income: 0, expense: 0, _start: start });
  }
  const byKey = new Map(monthly.map((m) => [m.month, m]));
  for (const row of breakdownRows) {
    const key = monthKey(new Date(row.date));
    const bucket = byKey.get(key);
    if (!bucket) continue;
    const amt = toNumber(row.amount) || 0;
    if (row.type === 'income') bucket.income += amt;
    else if (row.type === 'expense') bucket.expense += amt;
  }
  const monthly_breakdown = monthly.map((m) => ({
    month: m.month,
    income: round2(m.income),
    expense: round2(m.expense),
  }));

  // Top categories: top 6 expense categories for current month.
  const grouped = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where: { userId, type: 'expense', date: { gte: curMonthStart, lt: tomorrow } },
    _sum: { amount: true },
  });

  const catIds = grouped.map((g) => g.categoryId).filter((id) => id !== null);
  const cats = catIds.length
    ? await prisma.category.findMany({ where: { id: { in: catIds } } })
    : [];
  const catMap = new Map(cats.map((c) => [c.id, c]));

  const top_categories = grouped
    .map((g) => {
      const cat = g.categoryId ? catMap.get(g.categoryId) : null;
      return {
        name: cat ? cat.name : 'Uncategorized',
        color: cat ? cat.color : '#64748b',
        icon: cat ? cat.icon : 'tag',
        total: round2(toNumber(g._sum.amount) || 0),
      };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  res.json({
    total_income: round2(totalIncome),
    total_expense: round2(totalExpense),
    net_balance: round2(totalIncome - totalExpense),
    income_change_pct: pctChange(curIncome, prevIncome),
    expense_change_pct: pctChange(curExpense, prevExpense),
    monthly_breakdown,
    top_categories,
  });
}
