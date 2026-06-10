import type {
  GuestUser,
  SplitExpense,
  SplitExpenseShare,
  SplitGroup,
  SplitGroupMember,
  SplitSettlement,
  User,
} from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { toNumber, toYMD } from '../../utils/serialize.js';
import type { AddMemberInput, CreateExpenseInput, SettleInput } from './splits.schema.js';

// ---------------------------------------------------------------------------
// Types & display helpers
// ---------------------------------------------------------------------------

type MemberFull = SplitGroupMember & { user: User | null; guestUser: GuestUser | null };
type ExpenseFull = SplitExpense & {
  shares: (SplitExpenseShare & { member: MemberFull })[];
  paidByUser: User | null;
  paidByGuest: GuestUser | null;
};
type GroupFull = SplitGroup & {
  members: MemberFull[];
  createdBy: User;
  _count?: { expenses: number };
};

function memberDisplayName(member: MemberFull): string {
  if (member.user) return `${member.user.firstName} ${member.user.lastName}`.trim() || member.user.email;
  if (member.guestUser) return member.guestUser.name;
  return 'Unknown';
}

// ---------------------------------------------------------------------------
// Serializers
// ---------------------------------------------------------------------------

export function serializeMember(member: MemberFull) {
  return {
    id: member.id,
    group: member.groupId,
    user: member.userId,
    userEmail: member.user?.email ?? null,
    guestUser: member.guestUserId,
    guestUserDetail: member.guestUser
      ? { id: member.guestUser.id, name: member.guestUser.name, email: member.guestUser.email }
      : null,
    displayName: memberDisplayName(member),
    joinedAt: member.joinedAt.toISOString(),
  };
}

export function serializeGroup(group: GroupFull) {
  return {
    id: group.id,
    name: group.name,
    createdBy: group.createdById,
    createdByEmail: group.createdBy.email,
    members: group.members.map(serializeMember),
    expenseCount: group._count?.expenses ?? 0,
    createdAt: group.createdAt.toISOString(),
  };
}

function paidByName(expense: ExpenseFull): string {
  if (expense.paidByUser) {
    return `${expense.paidByUser.firstName} ${expense.paidByUser.lastName}`.trim() || expense.paidByUser.email;
  }
  if (expense.paidByGuest) return expense.paidByGuest.name;
  return 'Unknown';
}

export function serializeExpense(expense: ExpenseFull) {
  return {
    id: expense.id,
    group: expense.groupId,
    paidByUser: expense.paidByUserId,
    paidByGuest: expense.paidByGuestId,
    paidByName: paidByName(expense),
    amount: toNumber(expense.amount),
    description: expense.description,
    date: toYMD(expense.date),
    splitType: expense.splitType,
    shares: expense.shares.map((s) => ({
      id: s.id,
      member: s.memberId,
      memberName: memberDisplayName(s.member),
      shareAmount: toNumber(s.shareAmount),
      isSettled: s.isSettled,
    })),
    createdAt: expense.createdAt.toISOString(),
  };
}

export function serializeSettlement(
  settlement: SplitSettlement & { payerMember: MemberFull; receiverMember: MemberFull },
) {
  return {
    id: settlement.id,
    group: settlement.groupId,
    payerMember: settlement.payerMemberId,
    payerName: memberDisplayName(settlement.payerMember),
    receiverMember: settlement.receiverMemberId,
    receiverName: memberDisplayName(settlement.receiverMember),
    amount: toNumber(settlement.amount),
    settledAt: settlement.settledAt.toISOString(),
    note: settlement.note,
  };
}

// ---------------------------------------------------------------------------
// Access control
// ---------------------------------------------------------------------------

const memberInclude = { user: true, guestUser: true } as const;

/** A user may access a group they created or are a member of. */
async function loadAccessibleGroup(userId: string, groupId: string): Promise<GroupFull> {
  const group = await prisma.splitGroup.findFirst({
    where: { id: groupId, OR: [{ createdById: userId }, { members: { some: { userId } } }] },
    include: { members: { include: memberInclude }, createdBy: true, _count: { select: { expenses: true } } },
  });
  if (!group) throw AppError.notFound('Split group not found');
  return group;
}

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

export async function listGroups(userId: string): Promise<GroupFull[]> {
  return prisma.splitGroup.findMany({
    where: { OR: [{ createdById: userId }, { members: { some: { userId } } }] },
    include: { members: { include: memberInclude }, createdBy: true, _count: { select: { expenses: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getGroup(userId: string, groupId: string): Promise<GroupFull> {
  return loadAccessibleGroup(userId, groupId);
}

export async function createGroup(userId: string, name: string): Promise<GroupFull> {
  const group = await prisma.splitGroup.create({
    data: {
      name,
      createdById: userId,
      members: { create: { userId } }, // creator joins automatically
    },
    include: { members: { include: memberInclude }, createdBy: true, _count: { select: { expenses: true } } },
  });
  return group;
}

export async function updateGroup(userId: string, groupId: string, name: string): Promise<GroupFull> {
  const group = await loadAccessibleGroup(userId, groupId);
  if (group.createdById !== userId) throw AppError.forbidden('Only the group creator can rename the group');
  await prisma.splitGroup.update({ where: { id: groupId }, data: { name } });
  return loadAccessibleGroup(userId, groupId);
}

export async function deleteGroup(userId: string, groupId: string): Promise<void> {
  const group = await loadAccessibleGroup(userId, groupId);
  if (group.createdById !== userId) throw AppError.forbidden('Only the group creator can delete the group');
  await prisma.splitGroup.delete({ where: { id: groupId } });
}

export async function addMember(userId: string, groupId: string, input: AddMemberInput): Promise<MemberFull> {
  await loadAccessibleGroup(userId, groupId);

  if (input.userId) {
    const target = await prisma.user.findUnique({ where: { id: input.userId } });
    if (!target) throw AppError.notFound('User not found');
    const existing = await prisma.splitGroupMember.findFirst({
      where: { groupId, userId: input.userId },
      include: memberInclude,
    });
    if (existing) return existing;
    return prisma.splitGroupMember.create({
      data: { groupId, userId: input.userId },
      include: memberInclude,
    });
  }

  // Guest member
  const guest = await prisma.guestUser.create({
    data: { name: input.guestUser!.name, email: input.guestUser!.email || '' },
  });
  return prisma.splitGroupMember.create({
    data: { groupId, guestUserId: guest.id },
    include: memberInclude,
  });
}

// ---------------------------------------------------------------------------
// Balances & settlements
// ---------------------------------------------------------------------------

export async function groupBalances(userId: string, groupId: string) {
  await loadAccessibleGroup(userId, groupId);

  const members = await prisma.splitGroupMember.findMany({
    where: { groupId },
    include: memberInclude,
  });
  const memberName = new Map(members.map((m) => [m.id, memberDisplayName(m)]));

  // Net balance per member: amount paid - share owed.
  const net = new Map<string, number>();
  for (const m of members) net.set(m.id, 0);

  const expenses = await prisma.splitExpense.findMany({
    where: { groupId },
    include: { shares: true },
  });
  for (const expense of expenses) {
    const payer = expense.paidByUserId
      ? members.find((m) => m.userId === expense.paidByUserId)
      : members.find((m) => m.guestUserId === expense.paidByGuestId);
    if (payer) net.set(payer.id, (net.get(payer.id) ?? 0) + toNumber(expense.amount));
    for (const share of expense.shares) {
      if (!share.isSettled) {
        net.set(share.memberId, (net.get(share.memberId) ?? 0) - toNumber(share.shareAmount));
      }
    }
  }

  const settlements = await prisma.splitSettlement.findMany({ where: { groupId } });
  for (const s of settlements) {
    net.set(s.payerMemberId, (net.get(s.payerMemberId) ?? 0) - toNumber(s.amount));
    net.set(s.receiverMemberId, (net.get(s.receiverMemberId) ?? 0) + toNumber(s.amount));
  }

  // Greedy who-owes-whom.
  const positives = [...net.entries()].filter(([, b]) => b > 0).map(([id, b]) => ({ id, amt: b }));
  const negatives = [...net.entries()].filter(([, b]) => b < 0).map(([id, b]) => ({ id, amt: -b }));

  const suggestedSettlements: Array<{
    fromMember: string;
    fromName: string;
    toMember: string;
    toName: string;
    amount: number;
  }> = [];

  let i = 0;
  let j = 0;
  while (i < positives.length && j < negatives.length) {
    const creditor = positives[i];
    const debtor = negatives[j];
    const settle = Math.min(creditor.amt, debtor.amt);
    suggestedSettlements.push({
      fromMember: debtor.id,
      fromName: memberName.get(debtor.id) ?? 'Unknown',
      toMember: creditor.id,
      toName: memberName.get(creditor.id) ?? 'Unknown',
      amount: Math.round(settle * 100) / 100,
    });
    creditor.amt -= settle;
    debtor.amt -= settle;
    if (creditor.amt <= 1e-9) i += 1;
    if (debtor.amt <= 1e-9) j += 1;
  }

  const memberBalances = [...net.entries()].map(([id, balance]) => ({
    memberId: id,
    memberName: memberName.get(id) ?? 'Unknown',
    balance: Math.round(balance * 100) / 100,
  }));

  return { memberBalances, suggestedSettlements };
}

export async function settle(userId: string, groupId: string, input: SettleInput) {
  await loadAccessibleGroup(userId, groupId);
  const memberIds = await prisma.splitGroupMember.findMany({
    where: { groupId, id: { in: [input.payerMember, input.receiverMember] } },
    select: { id: true },
  });
  if (memberIds.length !== 2) throw AppError.badRequest('Payer and receiver must be members of the group');

  const settlement = await prisma.splitSettlement.create({
    data: {
      groupId,
      payerMemberId: input.payerMember,
      receiverMemberId: input.receiverMember,
      amount: input.amount,
      note: input.note ?? '',
    },
    include: {
      payerMember: { include: memberInclude },
      receiverMember: { include: memberInclude },
    },
  });
  return settlement;
}

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

const expenseInclude = {
  shares: { include: { member: { include: memberInclude } } },
  paidByUser: true,
  paidByGuest: true,
} as const;

export async function listExpenses(userId: string, groupId?: string): Promise<ExpenseFull[]> {
  const where = {
    group: { OR: [{ createdById: userId }, { members: { some: { userId } } }] },
    ...(groupId ? { groupId } : {}),
  };
  return prisma.splitExpense.findMany({
    where,
    include: expenseInclude,
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function createExpense(userId: string, input: CreateExpenseInput): Promise<ExpenseFull> {
  await loadAccessibleGroup(userId, input.group);
  const members = await prisma.splitGroupMember.findMany({ where: { groupId: input.group } });
  if (members.length === 0) throw AppError.badRequest('Group has no members to split between');

  // Build share rows: explicit sharesData, else equal split across all members.
  let shareRows: { memberId: string; shareAmount: number }[];
  if (input.sharesData && input.sharesData.length > 0) {
    const memberSet = new Set(members.map((m) => m.id));
    for (const s of input.sharesData) {
      if (!memberSet.has(s.memberId)) throw AppError.badRequest('Share references a non-member');
    }
    shareRows = input.sharesData.map((s) => ({ memberId: s.memberId, shareAmount: s.shareAmount }));
  } else {
    const perPerson = Math.round((input.amount / members.length) * 100) / 100;
    shareRows = members.map((m) => ({ memberId: m.id, shareAmount: perPerson }));
  }

  const expense = await prisma.splitExpense.create({
    data: {
      groupId: input.group,
      paidByUserId: input.paidByUser ?? null,
      paidByGuestId: input.paidByGuest ?? null,
      amount: input.amount,
      description: input.description,
      date: parseDate(input.date),
      splitType: input.splitType ?? 'equal',
      shares: { create: shareRows },
    },
    include: expenseInclude,
  });
  return expense;
}

export async function deleteExpense(userId: string, id: string): Promise<void> {
  const expense = await prisma.splitExpense.findUnique({ where: { id }, include: { group: true } });
  if (!expense) throw AppError.notFound('Expense not found');
  await loadAccessibleGroup(userId, expense.groupId);
  await prisma.splitExpense.delete({ where: { id } });
}

function parseDate(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
