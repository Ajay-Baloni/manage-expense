import prisma from '../config/prisma.js';
import { serializeTag } from '../utils/serialize.js';
import { paginate, getPage, getSkipTake } from '../utils/pagination.js';
import { badRequest, notFound } from '../middleware/error.js';

export async function listTags(req, res) {
  const page = getPage(req);
  const { skip, take } = getSkipTake(page);
  const where = { userId: req.user.id };

  const [count, rows] = await Promise.all([
    prisma.tag.count({ where }),
    prisma.tag.findMany({ where, orderBy: { name: 'asc' }, skip, take }),
  ]);

  res.json(paginate({ req, count, page, results: rows.map(serializeTag) }));
}

export async function createTag(req, res) {
  const { name, color } = req.body || {};
  if (!name || !String(name).trim()) {
    throw badRequest({ name: ['This field is required.'] });
  }

  const existing = await prisma.tag.findFirst({
    where: { userId: req.user.id, name: String(name).trim() },
  });
  if (existing) {
    throw badRequest({ name: ['A tag with this name already exists.'] });
  }

  const tag = await prisma.tag.create({
    data: {
      userId: req.user.id,
      name: String(name).trim(),
      color: color || '#6366f1',
    },
  });

  res.status(201).json(serializeTag(tag));
}

async function getOwnedTag(userId, id) {
  const tag = await prisma.tag.findFirst({ where: { id, userId } });
  if (!tag) throw notFound();
  return tag;
}

export async function updateTag(req, res) {
  const id = parseInt(req.params.id, 10);
  await getOwnedTag(req.user.id, id);

  const { name, color } = req.body || {};
  const data = {};
  if (name !== undefined) {
    if (!String(name).trim()) throw badRequest({ name: ['This field cannot be blank.'] });
    const dup = await prisma.tag.findFirst({
      where: { userId: req.user.id, name: String(name).trim(), id: { not: id } },
    });
    if (dup) throw badRequest({ name: ['A tag with this name already exists.'] });
    data.name = String(name).trim();
  }
  if (color !== undefined) data.color = color || '#6366f1';

  const tag = await prisma.tag.update({ where: { id }, data });
  res.json(serializeTag(tag));
}

export async function deleteTag(req, res) {
  const id = parseInt(req.params.id, 10);
  await getOwnedTag(req.user.id, id);
  await prisma.tag.delete({ where: { id } });
  res.status(204).end();
}
