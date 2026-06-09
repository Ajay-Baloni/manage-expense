import prisma from '../config/prisma.js';
import { toNumber, toDateOnly, toIso } from '../utils/serialize.js';
import {
  parseDateOnly,
  firstOfMonth,
  endOfMonthExclusive,
  todayUtc,
  round2,
} from '../utils/dates.js';
import { paginate, getPage, getSkipTake } from '../utils/pagination.js';
import { badRequest, notFound } from '../middleware/error.js';

const budgetInclude = {
  category: true,
  alerts: { orderBy: { triggeredAt: 'desc' } },
};

async function spentForBudget(userId, categoryId, monthStart) {
  const monthEnd = endOfMonthExclusive(monthStart);
  const agg = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: {
      userId,
      type: 'expense',
      categoryId,
      date: { gte: monthStart, lt: monthEnd },
    },
  });
  return toNumber(agg._sum.amount) || 0;
}

async function serializeBudget(userId, budget) {
  const monthStart = firstOfMonth(new Date(budget.month));
  const spent = await spentForBudget(userId, budget.categoryId, monthStart);
  const limit = toNumber(budget.limitAmount) || 0;
  const percentage = limit > 0 ? round2((spent / limit) * 100) : 0;

  return {
    id: budget.id,
    category: budget.categoryId,
    category_name: budget.category ? budget.category.name : null,
    category_color: budget.category ? budget.category.color : null,
    category_icon: budget.category ? budget.category.icon : null,
    month: toDateOnly(budget.month),
    limit_amount: limit,
    alert_threshold: budget.alertThreshold,
    spent_amount: round2(spent),
    percentage_used: percentage,
    alerts: (budget.alerts || []).map((a) => ({
      id: a.id,
      triggered_at: toIso(a.triggeredAt),
      percentage_used: toNumber(a.percentageUsed),
    })),
  };
}

export async function listBudgets(req, res) {
  const page = getPage(req);
  const { skip, take } = getSkipTake(page);

  const where = { userId: req.user.id };
  if (req.query.month) {
    // month query is "YYYY-MM" ⇒ filter to the first-of-month date.
    const d = parseDateOnly(`${req.query.month}-01`);
    if (d) where.month = firstOfMonth(d);
  }

  const [count, rows] = await Promise.all([
    prisma.budget.count({ where }),
    prisma.budget.findMany({ where, include: budgetInclude, orderBy: { month: 'desc' }, skip, take }),
  ]);

  const results = await Promise.all(rows.map((b) => serializeBudget(req.user.id, b)));
  res.json(paginate({ req, count, page, results }));
}

export async function currentMonthBudgets(req, res) {
  const monthStart = firstOfMonth(todayUtc());
  const rows = await prisma.budget.findMany({
    where: { userId: req.user.id, month: monthStart },
    include: budgetInclude,
    orderBy: { id: 'asc' },
  });
  const results = await Promise.all(rows.map((b) => serializeBudget(req.user.id, b)));
  res.json(results);
}

export async function createBudget(req, res) {
  const body = req.body || {};
  const categoryId = parseInt(body.category, 10);
  if (Number.isNaN(categoryId)) {
    throw badRequest({ category: ['This field is required.'] });
  }
  const cat = await prisma.category.findFirst({
    where: { id: categoryId, OR: [{ userId: req.user.id }, { userId: null }] },
  });
  if (!cat) throw badRequest({ category: ['Invalid category.'] });

  const monthRaw = body.month;
  const parsedMonth = parseDateOnly(monthRaw);
  if (!parsedMonth) throw badRequest({ month: ['Invalid or missing month.'] });
  const month = firstOfMonth(parsedMonth);

  const limit = Number(body.limit_amount);
  if (Number.isNaN(limit) || limit < 0) {
    throw badRequest({ limit_amount: ['Must be a non-negative number.'] });
  }
  const alertThreshold =
    body.alert_threshold !== undefined && body.alert_threshold !== null
      ? parseInt(body.alert_threshold, 10)
      : 80;

  const existing = await prisma.budget.findFirst({
    where: { userId: req.user.id, categoryId, month },
  });
  if (existing) {
    throw badRequest({ detail: 'A budget for this category and month already exists.' });
  }

  const budget = await prisma.budget.create({
    data: {
      userId: req.user.id,
      categoryId,
      month,
      limitAmount: limit,
      alertThreshold: Number.isNaN(alertThreshold) ? 80 : alertThreshold,
    },
    include: budgetInclude,
  });

  res.status(201).json(await serializeBudget(req.user.id, budget));
}

async function getOwnedBudget(userId, id) {
  const budget = await prisma.budget.findFirst({
    where: { id, userId },
    include: budgetInclude,
  });
  if (!budget) throw notFound();
  return budget;
}

export async function updateBudget(req, res) {
  const id = parseInt(req.params.id, 10);
  await getOwnedBudget(req.user.id, id);

  const body = req.body || {};
  const data = {};

  if (body.category !== undefined) {
    const categoryId = parseInt(body.category, 10);
    if (Number.isNaN(categoryId)) throw badRequest({ category: ['Invalid category.'] });
    const cat = await prisma.category.findFirst({
      where: { id: categoryId, OR: [{ userId: req.user.id }, { userId: null }] },
    });
    if (!cat) throw badRequest({ category: ['Invalid category.'] });
    data.categoryId = categoryId;
  }
  if (body.month !== undefined) {
    const d = parseDateOnly(body.month);
    if (!d) throw badRequest({ month: ['Invalid month.'] });
    data.month = firstOfMonth(d);
  }
  if (body.limit_amount !== undefined) {
    const limit = Number(body.limit_amount);
    if (Number.isNaN(limit) || limit < 0) {
      throw badRequest({ limit_amount: ['Must be a non-negative number.'] });
    }
    data.limitAmount = limit;
  }
  if (body.alert_threshold !== undefined) {
    const t = parseInt(body.alert_threshold, 10);
    if (!Number.isNaN(t)) data.alertThreshold = t;
  }

  const budget = await prisma.budget.update({ where: { id }, data, include: budgetInclude });
  res.json(await serializeBudget(req.user.id, budget));
}

export async function deleteBudget(req, res) {
  const id = parseInt(req.params.id, 10);
  await getOwnedBudget(req.user.id, id);
  await prisma.budget.delete({ where: { id } });
  res.status(204).end();
}
