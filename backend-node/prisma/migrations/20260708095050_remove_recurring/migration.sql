/*
  Warnings:

  - You are about to drop the `RecurringRule` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "RecurringRule" DROP CONSTRAINT "RecurringRule_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "RecurringRule" DROP CONSTRAINT "RecurringRule_userId_fkey";

-- DropTable
DROP TABLE "RecurringRule";

-- DropEnum
DROP TYPE "RecurringFrequency";
