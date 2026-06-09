import prisma from '../config/prisma.js';
import { toNumber, toDateOnly, toIso, fullName } from '../utils/serialize.js';
import { parseDateOnly, round2 } from '../utils/dates.js';
import { paginate, getPage, getSkipTake } from '../utils/pagination.js';
import { badRequest, notFound } from '../middleware/error.js';

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

const memberInclude = {
  user: { include: { profile: true } },
  guestUser: true,
};

function memberDisplayName(member) {
  if (member.user) {
    return fullName(member.user.firstName, member.user.lastName, member.user.email);
  }
  if (member.guestUser) {
    return member.guestUser.name || 'Unknown';
  }
  return 'Unknown';
}

function serializeMember(member) {
  return {
    id: member.id,
    group: member.groupId,
    user: member.userId ?? null,
    user_email: member.user ? member.user.email : null,
    guest_user: member.guestUserId ?? null,
    guest_user_detail: member.guestUser
      ? { id: member.guestUser.id, name: member.guestUser.name, email: member.guestUser.email }
      : null,
    display_name: memberDisplayName(member),
    joined_at: toIso(member.joinedAt),
  };
}

function serializeGroup(group) {
  const creator = group.createdBy;
  return {
    id: group.id,
    name: group.name,
    created_by: group.createdById,
    created_by_email: creator ? creator.email : null,
    members: (group.members || []).map(serializeMember),
    expense_count: group._count ? group._count.expenses : (group.expenses ? group.expenses.length : 0),
    created_at: toIso(group.createdAt),
  };
}

const groupInclude = {
  createdBy: true,
  members: { include: memberInclude },
  _count: { select: { expenses: true } },
};

async function getAccessibleGroup(userId, id) {
  const group = await prisma.splitGroup.findUnique({
    where: { id },
    include: groupInclude,
  });
  if (!group) throw notFound();
  const isCreator = group.createdById === userId;
  const isMember = group.members.some((m) => m.userId === userId);
  if (!isCreator && !isMember) throw notFound();
  return group;
}

function payerNameForExpense(expense) {
  if (expense.paidByUser) {
    return fullName(expense.paidByUser.firstName, expense.paidByUser.lastName, expense.paidByUser.email);
  }
  if (expense.paidByGuest) {
    return expense.paidByGuest.name || 'Unknown';
  }
  return 'Unknown';
}

const expenseInclude = {
  paidByUser: true,
  paidByGuest: true,
  shares: { include: { member: { include: memberInclude } } },
};

function serializeExpense(expense) {
  return {
    id: expense.id,
    group: expense.groupId,
    paid_by_user: expense.paidByUserId ?? null,
    paid_by_guest: expense.paidByGuestId ?? null,
    paid_by_name: payerNameForExpense(expense),
    amount: toNumber(expense.amount),
    description: expense.description,
    date: toDateOnly(expense.date),
    split_type: expense.splitType,
    shares: (expense.shares || []).map((s) => ({
      id: s.id,
      member: s.memberId,
      member_name: s.member ? memberDisplayName(s.member) : 'Unknown',
      share_amount: toNumber(s.shareAmount),
      is_settled: s.isSettled,
    })),
    created_at: toIso(expense.createdAt),
  };
}

/* ------------------------------------------------------------------ */
/* Groups                                                             */
/* ------------------------------------------------------------------ */

export async function listGroups(req, res) {
  const page = getPage(req);
  const { skip, take } = getSkipTake(page);
  const userId = req.user.id;

  const where = {
    OR: [{ createdById: userId }, { members: { some: { userId } } }],
  };

  const [count, rows] = await Promise.all([
    prisma.splitGroup.count({ where }),
    prisma.splitGroup.findMany({
      where,
      include: groupInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
  ]);

  res.json(paginate({ req, count, page, results: rows.map(serializeGroup) }));
}

export async function getGroup(req, res) {
  const id = parseInt(req.params.id, 10);
  const group = await getAccessibleGroup(req.user.id, id);
  res.json(serializeGroup(group));
}

export async function createGroup(req, res) {
  const { name } = req.body || {};
  if (!name || !String(name).trim()) {
    throw badRequest({ name: ['This field is required.'] });
  }

  const group = await prisma.splitGroup.create({
    data: {
      name: String(name).trim(),
      createdById: req.user.id,
      members: { create: [{ userId: req.user.id }] },
    },
    include: groupInclude,
  });

  res.status(201).json(serializeGroup(group));
}

export async function updateGroup(req, res) {
  const id = parseInt(req.params.id, 10);
  await getAccessibleGroup(req.user.id, id);

  const { name } = req.body || {};
  const data = {};
  if (name !== undefined) {
    if (!String(name).trim()) throw badRequest({ name: ['This field cannot be blank.'] });
    data.name = String(name).trim();
  }

  const group = await prisma.splitGroup.update({ where: { id }, data, include: groupInclude });
  res.json(serializeGroup(group));
}

export async function deleteGroup(req, res) {
  const id = parseInt(req.params.id, 10);
  await getAccessibleGroup(req.user.id, id);
  await prisma.splitGroup.delete({ where: { id } });
  res.status(204).end();
}

export async function addMember(req, res) {
  const id = parseInt(req.params.id, 10);
  await getAccessibleGroup(req.user.id, id);

  const body = req.body || {};

  if (body.user_id !== undefined && body.user_id !== null && body.user_id !== '') {
    const userId = parseInt(body.user_id, 10);
    if (Number.isNaN(userId)) throw badRequest({ user_id: ['Invalid user id.'] });
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw notFound('User not found.');

    const existing = await prisma.splitGroupMember.findFirst({
      where: { groupId: id, userId },
    });
    if (existing) {
      const full = await prisma.splitGroupMember.findUnique({
        where: { id: existing.id },
        include: memberInclude,
      });
      return res.json(serializeMember(full));
    }

    const member = await prisma.splitGroupMember.create({
      data: { groupId: id, userId },
      include: memberInclude,
    });
    return res.json(serializeMember(member));
  }

  if (body.guest_user && typeof body.guest_user === 'object') {
    const { name, email } = body.guest_user;
    if (!name || !String(name).trim()) {
      throw badRequest({ guest_user: ['Name is required for a guest user.'] });
    }
    const guest = await prisma.guestUser.create({
      data: { name: String(name).trim(), email: email || '' },
    });
    const member = await prisma.splitGroupMember.create({
      data: { groupId: id, guestUserId: guest.id },
      include: memberInclude,
    });
    return res.json(serializeMember(member));
  }

  throw badRequest({ detail: 'Provide either user_id or guest_user.' });
}

/* ------------------------------------------------------------------ */
/* Balances & settlements                                             */
/* ------------------------------------------------------------------ */

export async function getBalances(req, res) {
  const id = parseInt(req.params.id, 10);
  const group = await getAccessibleGroup(req.user.id, id);

  const members = await prisma.splitGroupMember.findMany({
    where: { groupId: id },
    include: memberInclude,
  });

  const balances = new Map();
  const nameById = new Map();
  for (const m of members) {
    balances.set(m.id, 0);
    nameById.set(m.id, memberDisplayName(m));
  }

  // Map a paying user/guest to the member row in this group.
  const memberByUserId = new Map();
  const memberByGuestId = new Map();
  for (const m of members) {
    if (m.userId != null) memberByUserId.set(m.userId, m.id);
    if (m.guestUserId != null) memberByGuestId.set(m.guestUserId, m.id);
  }

  const expenses = await prisma.splitExpense.findMany({
    where: { groupId: id },
    include: { shares: true },
  });

  for (const expense of expenses) {
    let payerMemberId = null;
    if (expense.paidByUserId != null) payerMemberId = memberByUserId.get(expense.paidByUserId);
    else if (expense.paidByGuestId != null) payerMemberId = memberByGuestId.get(expense.paidByGuestId);

    for (const share of expense.shares) {
      if (share.isSettled) continue;
      if (balances.has(share.memberId)) {
        balances.set(share.memberId, balances.get(share.memberId) - toNumber(share.shareAmount));
      }
    }

    if (payerMemberId != null && balances.has(payerMemberId)) {
      balances.set(payerMemberId, balances.get(payerMemberId) + toNumber(expense.amount));
    }
  }

  const settlements = await prisma.splitSettlement.findMany({ where: { groupId: id } });
  for (const s of settlements) {
    if (balances.has(s.payerMemberId)) {
      balances.set(s.payerMemberId, balances.get(s.payerMemberId) - toNumber(s.amount));
    }
    if (balances.has(s.receiverMemberId)) {
      balances.set(s.receiverMemberId, balances.get(s.receiverMemberId) + toNumber(s.amount));
    }
  }

  const member_balances = [];
  for (const m of members) {
    member_balances.push({
      member_id: m.id,
      member_name: nameById.get(m.id),
      balance: round2(balances.get(m.id) || 0),
    });
  }

  // Greedy settlement suggestions.
  const debtors = [];
  const creditors = [];
  for (const mb of member_balances) {
    if (mb.balance < -0.01) debtors.push({ id: mb.member_id, name: mb.member_name, amount: -mb.balance });
    else if (mb.balance > 0.01) creditors.push({ id: mb.member_id, name: mb.member_name, amount: mb.balance });
  }
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const suggested_settlements = [];
  let di = 0;
  let ci = 0;
  while (di < debtors.length && ci < creditors.length) {
    const debtor = debtors[di];
    const creditor = creditors[ci];
    const amount = round2(Math.min(debtor.amount, creditor.amount));
    if (amount >= 0.01) {
      suggested_settlements.push({
        from_member: debtor.id,
        from_name: debtor.name,
        to_member: creditor.id,
        to_name: creditor.name,
        amount,
      });
    }
    debtor.amount = round2(debtor.amount - amount);
    creditor.amount = round2(creditor.amount - amount);
    if (debtor.amount < 0.01) di += 1;
    if (creditor.amount < 0.01) ci += 1;
  }

  res.json({ member_balances, suggested_settlements });
}

export async function settle(req, res) {
  const id = parseInt(req.params.id, 10);
  await getAccessibleGroup(req.user.id, id);

  const body = req.body || {};
  const payerMemberId = parseInt(body.payer_member, 10);
  const receiverMemberId = parseInt(body.receiver_member, 10);
  const amount = Number(body.amount);

  if (Number.isNaN(payerMemberId) || Number.isNaN(receiverMemberId)) {
    throw badRequest({ detail: 'payer_member and receiver_member are required.' });
  }
  if (Number.isNaN(amount) || amount <= 0) {
    throw badRequest({ amount: ['Amount must be greater than 0.'] });
  }

  const memberIds = await prisma.splitGroupMember.findMany({
    where: { groupId: id, id: { in: [payerMemberId, receiverMemberId] } },
    include: memberInclude,
  });
  const found = new Map(memberIds.map((m) => [m.id, m]));
  if (!found.has(payerMemberId) || !found.has(receiverMemberId)) {
    throw badRequest({ detail: 'payer_member and receiver_member must belong to this group.' });
  }

  const settlement = await prisma.splitSettlement.create({
    data: {
      groupId: id,
      payerMemberId,
      receiverMemberId,
      amount,
      note: body.note || '',
    },
  });

  res.status(201).json({
    id: settlement.id,
    group: settlement.groupId,
    payer_member: settlement.payerMemberId,
    payer_name: memberDisplayName(found.get(payerMemberId)),
    receiver_member: settlement.receiverMemberId,
    receiver_name: memberDisplayName(found.get(receiverMemberId)),
    amount: toNumber(settlement.amount),
    settled_at: toIso(settlement.settledAt),
    note: settlement.note,
  });
}

/* ------------------------------------------------------------------ */
/* Expenses                                                           */
/* ------------------------------------------------------------------ */

export async function listExpenses(req, res) {
  const page = getPage(req);
  const { skip, take } = getSkipTake(page);

  const where = {};
  if (req.query.group) {
    const groupId = parseInt(req.query.group, 10);
    if (!Number.isNaN(groupId)) {
      await getAccessibleGroup(req.user.id, groupId);
      where.groupId = groupId;
    }
  } else {
    // Only expenses from groups the user can access.
    where.group = {
      OR: [{ createdById: req.user.id }, { members: { some: { userId: req.user.id } } }],
    };
  }

  const [count, rows] = await Promise.all([
    prisma.splitExpense.count({ where }),
    prisma.splitExpense.findMany({
      where,
      include: expenseInclude,
      orderBy: { date: 'desc' },
      skip,
      take,
    }),
  ]);

  res.json(paginate({ req, count, page, results: rows.map(serializeExpense) }));
}

export async function createExpense(req, res) {
  const body = req.body || {};
  const groupId = parseInt(body.group, 10);
  if (Number.isNaN(groupId)) throw badRequest({ group: ['This field is required.'] });

  const group = await getAccessibleGroup(req.user.id, groupId);

  const paidByUser =
    body.paid_by_user !== undefined && body.paid_by_user !== null && body.paid_by_user !== ''
      ? parseInt(body.paid_by_user, 10)
      : null;
  const paidByGuest =
    body.paid_by_guest !== undefined && body.paid_by_guest !== null && body.paid_by_guest !== ''
      ? parseInt(body.paid_by_guest, 10)
      : null;

  if (paidByUser == null && paidByGuest == null) {
    throw badRequest({ detail: 'Either paid_by_user or paid_by_guest is required.' });
  }

  const amount = Number(body.amount);
  if (Number.isNaN(amount) || amount <= 0) {
    throw badRequest({ amount: ['Amount must be greater than 0.'] });
  }
  const date = parseDateOnly(body.date);
  if (!date) throw badRequest({ date: ['Invalid or missing date.'] });

  const members = group.members;
  if (!members.length) throw badRequest({ detail: 'Group has no members.' });

  // Build shares.
  let sharesData = [];
  const provided = Array.isArray(body.shares_data) ? body.shares_data : [];

  if (provided.length) {
    for (const s of provided) {
      const memberId = parseInt(s.member_id, 10);
      const shareAmount = Number(s.share_amount);
      if (Number.isNaN(memberId) || Number.isNaN(shareAmount)) continue;
      if (!members.some((m) => m.id === memberId)) {
        throw badRequest({ shares_data: ['A share references a member not in this group.'] });
      }
      sharesData.push({ memberId, shareAmount });
    }
    if (!sharesData.length) {
      throw badRequest({ shares_data: ['No valid shares provided.'] });
    }
  } else {
    // Equal split across all members.
    const per = round2(amount / members.length);
    sharesData = members.map((m) => ({ memberId: m.id, shareAmount: per }));
    // Adjust last share to absorb rounding so shares sum to amount.
    const sumExceptLast = round2(per * (members.length - 1));
    sharesData[sharesData.length - 1].shareAmount = round2(amount - sumExceptLast);
  }

  const expense = await prisma.splitExpense.create({
    data: {
      groupId,
      paidByUserId: paidByUser,
      paidByGuestId: paidByGuest,
      amount,
      description: body.description || '',
      date,
      splitType: body.split_type || 'equal',
      shares: { create: sharesData.map((s) => ({ memberId: s.memberId, shareAmount: s.shareAmount })) },
    },
    include: expenseInclude,
  });

  res.status(201).json(serializeExpense(expense));
}

async function getAccessibleExpense(userId, id) {
  const expense = await prisma.splitExpense.findUnique({
    where: { id },
    include: { ...expenseInclude, group: { include: { members: true } } },
  });
  if (!expense) throw notFound();
  const group = expense.group;
  const isCreator = group.createdById === userId;
  const isMember = group.members.some((m) => m.userId === userId);
  if (!isCreator && !isMember) throw notFound();
  return expense;
}

export async function updateExpense(req, res) {
  const id = parseInt(req.params.id, 10);
  const expense = await getAccessibleExpense(req.user.id, id);
  const body = req.body || {};
  const data = {};

  if (body.amount !== undefined) {
    const amount = Number(body.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      throw badRequest({ amount: ['Amount must be greater than 0.'] });
    }
    data.amount = amount;
  }
  if (body.description !== undefined) data.description = body.description || '';
  if (body.date !== undefined) {
    const date = parseDateOnly(body.date);
    if (!date) throw badRequest({ date: ['Invalid date.'] });
    data.date = date;
  }
  if (body.split_type !== undefined) data.splitType = body.split_type || 'equal';
  if (body.paid_by_user !== undefined) {
    data.paidByUserId =
      body.paid_by_user === null || body.paid_by_user === ''
        ? null
        : parseInt(body.paid_by_user, 10);
  }
  if (body.paid_by_guest !== undefined) {
    data.paidByGuestId =
      body.paid_by_guest === null || body.paid_by_guest === ''
        ? null
        : parseInt(body.paid_by_guest, 10);
  }

  // Optionally replace shares.
  if (Array.isArray(body.shares_data)) {
    const groupMembers = await prisma.splitGroupMember.findMany({
      where: { groupId: expense.groupId },
      select: { id: true },
    });
    const memberSet = new Set(groupMembers.map((m) => m.id));
    const newShares = [];
    for (const s of body.shares_data) {
      const memberId = parseInt(s.member_id, 10);
      const shareAmount = Number(s.share_amount);
      if (Number.isNaN(memberId) || Number.isNaN(shareAmount)) continue;
      if (!memberSet.has(memberId)) {
        throw badRequest({ shares_data: ['A share references a member not in this group.'] });
      }
      newShares.push({ memberId, shareAmount });
    }
    await prisma.splitExpenseShare.deleteMany({ where: { expenseId: id } });
    data.shares = { create: newShares.map((s) => ({ memberId: s.memberId, shareAmount: s.shareAmount })) };
  }

  const updated = await prisma.splitExpense.update({
    where: { id },
    data,
    include: expenseInclude,
  });
  res.json(serializeExpense(updated));
}

export async function deleteExpense(req, res) {
  const id = parseInt(req.params.id, 10);
  await getAccessibleExpense(req.user.id, id);
  await prisma.splitExpense.delete({ where: { id } });
  res.status(204).end();
}
