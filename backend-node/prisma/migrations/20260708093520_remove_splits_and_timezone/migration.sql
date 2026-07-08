/*
  Warnings:

  - You are about to drop the column `timezone` on the `UserProfile` table. All the data in the column will be lost.
  - You are about to drop the `GuestUser` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SplitExpense` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SplitExpenseShare` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SplitGroup` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SplitGroupMember` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SplitSettlement` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "SplitExpense" DROP CONSTRAINT "SplitExpense_groupId_fkey";

-- DropForeignKey
ALTER TABLE "SplitExpense" DROP CONSTRAINT "SplitExpense_paidByGuestId_fkey";

-- DropForeignKey
ALTER TABLE "SplitExpense" DROP CONSTRAINT "SplitExpense_paidByUserId_fkey";

-- DropForeignKey
ALTER TABLE "SplitExpenseShare" DROP CONSTRAINT "SplitExpenseShare_expenseId_fkey";

-- DropForeignKey
ALTER TABLE "SplitExpenseShare" DROP CONSTRAINT "SplitExpenseShare_memberId_fkey";

-- DropForeignKey
ALTER TABLE "SplitGroup" DROP CONSTRAINT "SplitGroup_createdById_fkey";

-- DropForeignKey
ALTER TABLE "SplitGroupMember" DROP CONSTRAINT "SplitGroupMember_groupId_fkey";

-- DropForeignKey
ALTER TABLE "SplitGroupMember" DROP CONSTRAINT "SplitGroupMember_guestUserId_fkey";

-- DropForeignKey
ALTER TABLE "SplitGroupMember" DROP CONSTRAINT "SplitGroupMember_userId_fkey";

-- DropForeignKey
ALTER TABLE "SplitSettlement" DROP CONSTRAINT "SplitSettlement_groupId_fkey";

-- DropForeignKey
ALTER TABLE "SplitSettlement" DROP CONSTRAINT "SplitSettlement_payerMemberId_fkey";

-- DropForeignKey
ALTER TABLE "SplitSettlement" DROP CONSTRAINT "SplitSettlement_receiverMemberId_fkey";

-- AlterTable
ALTER TABLE "UserProfile" DROP COLUMN "timezone";

-- DropTable
DROP TABLE "GuestUser";

-- DropTable
DROP TABLE "SplitExpense";

-- DropTable
DROP TABLE "SplitExpenseShare";

-- DropTable
DROP TABLE "SplitGroup";

-- DropTable
DROP TABLE "SplitGroupMember";

-- DropTable
DROP TABLE "SplitSettlement";

-- DropEnum
DROP TYPE "SplitType";
