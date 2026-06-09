import dotenv from 'dotenv';
dotenv.config();

import prisma from '../config/prisma.js';

const DEFAULT_CATEGORIES = [
  // Expense categories
  { name: 'Food & Dining', icon: 'utensils', color: '#f97316', type: 'expense' },
  { name: 'Transportation', icon: 'car', color: '#3b82f6', type: 'expense' },
  { name: 'Shopping', icon: 'shopping-bag', color: '#8b5cf6', type: 'expense' },
  { name: 'Entertainment', icon: 'film', color: '#ec4899', type: 'expense' },
  { name: 'Healthcare', icon: 'heart', color: '#ef4444', type: 'expense' },
  { name: 'Housing', icon: 'home', color: '#14b8a6', type: 'expense' },
  { name: 'Utilities', icon: 'zap', color: '#eab308', type: 'expense' },
  { name: 'Education', icon: 'book', color: '#6366f1', type: 'expense' },
  { name: 'Travel', icon: 'plane', color: '#06b6d4', type: 'expense' },
  { name: 'Personal Care', icon: 'user', color: '#f43f5e', type: 'expense' },
  { name: 'Subscriptions', icon: 'repeat', color: '#a855f7', type: 'expense' },
  { name: 'Other Expenses', icon: 'more-horizontal', color: '#64748b', type: 'expense' },
  // Income categories
  { name: 'Salary', icon: 'briefcase', color: '#22c55e', type: 'income' },
  { name: 'Freelance', icon: 'laptop', color: '#10b981', type: 'income' },
  { name: 'Investment', icon: 'trending-up', color: '#84cc16', type: 'income' },
  { name: 'Gift', icon: 'gift', color: '#f472b6', type: 'income' },
  { name: 'Other Income', icon: 'plus-circle', color: '#4ade80', type: 'income' },
];

export async function seedDefaultCategories() {
  for (const cat of DEFAULT_CATEGORIES) {
    // userId is null for system defaults. There is no unique constraint on
    // (name) for defaults, so we look up by (name, userId=null) then upsert.
    const existing = await prisma.category.findFirst({
      where: { name: cat.name, userId: null },
    });
    if (existing) {
      await prisma.category.update({
        where: { id: existing.id },
        data: { icon: cat.icon, color: cat.color, type: cat.type, isDefault: true },
      });
    } else {
      await prisma.category.create({
        data: {
          userId: null,
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
          type: cat.type,
          isDefault: true,
        },
      });
    }
  }
}

async function main() {
  await seedDefaultCategories();
  // eslint-disable-next-line no-console
  console.log(`Seeded ${DEFAULT_CATEGORIES.length} default categories.`);
}

// Run when invoked directly (npm run seed).
const isMain = process.argv[1] && process.argv[1].endsWith('defaultCategories.js');
if (isMain) {
  main()
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error(err);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export default seedDefaultCategories;
