-- DropForeignKey
ALTER TABLE "BudgetAlert" DROP CONSTRAINT "BudgetAlert_budgetId_fkey";

-- DropForeignKey
ALTER TABLE "Tag" DROP CONSTRAINT "Tag_userId_fkey";

-- DropForeignKey
ALTER TABLE "_TransactionTags" DROP CONSTRAINT "_TransactionTags_A_fkey";

-- DropForeignKey
ALTER TABLE "_TransactionTags" DROP CONSTRAINT "_TransactionTags_B_fkey";

-- AlterTable
ALTER TABLE "Budget" DROP COLUMN "alertThreshold";

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "receiptUrl";

-- DropTable
DROP TABLE "BudgetAlert";

-- DropTable
DROP TABLE "Tag";

-- DropTable
DROP TABLE "_TransactionTags";

-- DropEnum
DROP TYPE "AlertLevel";

