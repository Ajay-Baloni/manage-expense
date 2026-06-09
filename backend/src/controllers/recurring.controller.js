import prisma from '../config/prisma.js';
import { toNumber, toDateOnly, toIso } from '../utils/serialize.js';
import { parseDateOnly } from '../utils/dates.js';
import { paginate, getPage, getSkipTake } from '../utils/pagination.js';
import { badRequest, notFound } from '../middleware/error.js';

const FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly'];

function serializeRecurring(r) {
  return {
    id: r.id,
    type: r.type,
    amount: toNumber(r.amount),
    category: r.categoryId ?? null,
    description: r.description,
    frequency: r.frequency,
    start_date: toDateOnly(r.startDate),
    next_run: toDateOnly(r.nextRun),
    end_date: r.endDate ? toDateOnly(r.endDate) : null,
    is_active: r.isActive,
    created_at: toIso(r.createdAt),
  };
}

export async function listRecurring(req, res) {
  const page = getPage(req);
  const { skip, take } = getSkipTake(page);
  const where = { userId: req.user.id };

  const [count, rows] = await Promise.all([
    prisma.recurringRule.count({ where }),
    prisma.recurringRule.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
  ]);

  res.json(paginate({ req, count, page, results: rows.map(serializeRecurring) }));
}

async function resolveCategory(userId, category) {
  if (category === undefined || category === null || category === '') return null;
  const categoryId = parseInt(category, 10);
  if (Number.isNaN(categoryId)) return null;
  const cat = await prisma.category.findFirst({
    where: { id: categoryId, OR: [{ userId }, { userId: null }] },
  });
  if (!cat) throw badRequest({ category: ['Invalid category.'] });
  return categoryId;
}

export async function createRecurring(req, res) {
  const body = req.body || {};

  if (!['income', 'expense'].includes(body.type)) {
    throw badRequest({ type: ['Must be "income" or "expense".'] });
  }
  const amount = Number(body.amount);
  if (Number.isNaN(amount) || amount <= 0) {
    throw badRequest({ amount: ['Amount must be greater than 0.'] });
  }
  if (!FREQUENCIES.includes(body.frequency)) {
    throw badRequest({ frequency: [`Must be one of: ${FREQUENCIES.join(', ')}.`] });
  }
  const startDate = parseDateOnly(body.start_date);
  if (!startDate) throw badRequest({ start_date: ['Invalid or missing date.'] });

  const endDate = body.end_date ? parseDateOnly(body.end_date) : null;
  const categoryId = await resolveCategory(req.user.id, body.category);

  const rule = await prisma.recurringRule.create({
    data: {
      userId: req.user.id,
      type: body.type,
      amount,
      categoryId,
      description: body.description || '',
      frequency: body.frequency,
      startDate,
      nextRun: startDate,
      endDate,
      isActive: true,
    },
  });

  res.status(201).json(serializeRecurring(rule));
}

async function getOwnedRecurring(userId, id) {
  const rule = await prisma.recurringRule.findFirst({ where: { id, userId } });
  if (!rule) throw notFound();
  return rule;
}

export async function updateRecurring(req, res) {
  const id = parseInt(req.params.id, 10);
  await getOwnedRecurring(req.user.id, id);
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
  if (body.frequency !== undefined) {
    if (!FREQUENCIES.includes(body.frequency)) {
      throw badRequest({ frequency: [`Must be one of: ${FREQUENCIES.join(', ')}.`] });
    }
    data.frequency = body.frequency;
  }
  if (body.description !== undefined) data.description = body.description || '';
  if (body.start_date !== undefined) {
    const d = parseDateOnly(body.start_date);
    if (!d) throw badRequest({ start_date: ['Invalid date.'] });
    data.startDate = d;
  }
  if (body.next_run !== undefined) {
    const d = parseDateOnly(body.next_run);
    if (!d) throw badRequest({ next_run: ['Invalid date.'] });
    data.nextRun = d;
  }
  if (body.end_date !== undefined) {
    data.endDate = body.end_date ? parseDateOnly(body.end_date) : null;
  }
  if (body.is_active !== undefined) data.isActive = Boolean(body.is_active);
  if (body.category !== undefined) {
    data.categoryId =
      body.category === null || body.category === ''
        ? null
        : await resolveCategory(req.user.id, body.category);
  }

  const rule = await prisma.recurringRule.update({ where: { id }, data });
  res.json(serializeRecurring(rule));
}

export async function deleteRecurring(req, res) {
  const id = parseInt(req.params.id, 10);
  await getOwnedRecurring(req.user.id, id);
  await prisma.recurringRule.delete({ where: { id } });
  res.status(204).end();
}
