import prisma from '../config/prisma.js';
import { serializeCategory } from '../utils/serialize.js';
import { paginate, getPage, getSkipTake } from '../utils/pagination.js';
import { badRequest, notFound, forbidden } from '../middleware/error.js';

const TYPES = ['income', 'expense', 'both'];

export async function listCategories(req, res) {
  const page = getPage(req);
  const { skip, take } = getSkipTake(page);

  const where = { OR: [{ userId: req.user.id }, { userId: null }] };

  const [count, rows] = await Promise.all([
    prisma.category.count({ where }),
    prisma.category.findMany({ where, orderBy: { name: 'asc' }, skip, take }),
  ]);

  res.json(paginate({ req, count, page, results: rows.map(serializeCategory) }));
}

export async function createCategory(req, res) {
  const { name, icon, color, type } = req.body || {};
  if (!name || !String(name).trim()) {
    throw badRequest({ name: ['This field is required.'] });
  }
  if (type !== undefined && type !== null && type !== '' && !TYPES.includes(type)) {
    throw badRequest({ type: [`Must be one of: ${TYPES.join(', ')}.`] });
  }

  const category = await prisma.category.create({
    data: {
      userId: req.user.id,
      name: String(name).trim(),
      icon: icon || 'tag',
      color: color || '#6366f1',
      type: type || 'both',
      isDefault: false,
    },
  });

  res.status(201).json(serializeCategory(category));
}

async function getEditableCategory(userId, id) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw notFound();
  if (category.userId === null || category.isDefault) {
    throw forbidden('Default categories cannot be modified.');
  }
  if (category.userId !== userId) throw notFound();
  return category;
}

export async function updateCategory(req, res) {
  const id = parseInt(req.params.id, 10);
  await getEditableCategory(req.user.id, id);

  const { name, icon, color, type } = req.body || {};
  const data = {};
  if (name !== undefined) {
    if (!String(name).trim()) throw badRequest({ name: ['This field cannot be blank.'] });
    data.name = String(name).trim();
  }
  if (icon !== undefined) data.icon = icon || 'tag';
  if (color !== undefined) data.color = color || '#6366f1';
  if (type !== undefined) {
    if (!TYPES.includes(type)) throw badRequest({ type: [`Must be one of: ${TYPES.join(', ')}.`] });
    data.type = type;
  }

  const category = await prisma.category.update({ where: { id }, data });
  res.json(serializeCategory(category));
}

export async function deleteCategory(req, res) {
  const id = parseInt(req.params.id, 10);
  await getEditableCategory(req.user.id, id);
  await prisma.category.delete({ where: { id } });
  res.status(204).end();
}
