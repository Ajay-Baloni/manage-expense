import { PrismaClient, CategoryType } from '@prisma/client';

const prisma = new PrismaClient();

interface DefaultCategory {
  name: string;
  icon: string;
  color: string;
  type: CategoryType;
}

const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: 'Salary', icon: 'wallet', color: '#22c55e', type: CategoryType.income },
  { name: 'Business', icon: 'briefcase', color: '#10b981', type: CategoryType.income },
  { name: 'Investments', icon: 'trending-up', color: '#14b8a6', type: CategoryType.income },
  { name: 'Gifts', icon: 'gift', color: '#a3e635', type: CategoryType.both },
  { name: 'Food & Dining', icon: 'utensils', color: '#f97316', type: CategoryType.expense },
  { name: 'Groceries', icon: 'shopping-cart', color: '#eab308', type: CategoryType.expense },
  { name: 'Transport', icon: 'car', color: '#3b82f6', type: CategoryType.expense },
  { name: 'Shopping', icon: 'shopping-bag', color: '#ec4899', type: CategoryType.expense },
  { name: 'Entertainment', icon: 'film', color: '#8b5cf6', type: CategoryType.expense },
  { name: 'Bills & Utilities', icon: 'receipt', color: '#ef4444', type: CategoryType.expense },
  { name: 'Health', icon: 'heart-pulse', color: '#f43f5e', type: CategoryType.expense },
  { name: 'Education', icon: 'graduation-cap', color: '#6366f1', type: CategoryType.expense },
  { name: 'Rent', icon: 'home', color: '#0ea5e9', type: CategoryType.expense },
  { name: 'Travel', icon: 'plane', color: '#06b6d4', type: CategoryType.expense },
  { name: 'Other', icon: 'tag', color: '#64748b', type: CategoryType.both },
];

async function main() {
  for (const cat of DEFAULT_CATEGORIES) {
    const existing = await prisma.category.findFirst({
      where: { userId: null, name: cat.name },
    });
    if (existing) {
      await prisma.category.update({
        where: { id: existing.id },
        data: { ...cat, isDefault: true },
      });
    } else {
      await prisma.category.create({
        data: { ...cat, userId: null, isDefault: true },
      });
    }
  }
  // eslint-disable-next-line no-console
  console.log(`✅ Seeded ${DEFAULT_CATEGORIES.length} default categories`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
