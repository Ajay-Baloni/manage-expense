-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('income', 'expense');

-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('income', 'expense', 'both');

-- CreateEnum
CREATE TYPE "BudgetPeriod" AS ENUM ('weekly', 'monthly');

-- CreateEnum
CREATE TYPE "AlertLevel" AS ENUM ('warning', 'exceeded');

-- CreateEnum
CREATE TYPE "RecurringFrequency" AS ENUM ('daily', 'weekly', 'monthly', 'yearly');

-- CreateEnum
CREATE TYPE "SplitType" AS ENUM ('equal', 'exact', 'percentage', 'shares');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "Theme" AS ENUM ('light', 'dark', 'system');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL DEFAULT '',
    "lastName" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isStaff" BOOLEAN NOT NULL DEFAULT false,
    "dateJoined" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "avatarUrl" TEXT NOT NULL DEFAULT '',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "theme" "Theme" NOT NULL DEFAULT 'system',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'tag',
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "type" "CategoryType" NOT NULL DEFAULT 'both',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "period" "BudgetPeriod" NOT NULL DEFAULT 'monthly',
    "month" TIMESTAMP(3) NOT NULL,
    "limitAmount" DECIMAL(12,2) NOT NULL,
    "alertThreshold" INTEGER NOT NULL DEFAULT 80,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetAlert" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "percentageUsed" DECIMAL(6,2) NOT NULL,
    "periodStart" TIMESTAMP(3),
    "level" "AlertLevel" NOT NULL DEFAULT 'warning',

    CONSTRAINT "BudgetAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "categoryId" TEXT,
    "date" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "receiptUrl" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "categoryId" TEXT,
    "description" TEXT NOT NULL,
    "frequency" "RecurringFrequency" NOT NULL,
    "startDate" DATE NOT NULL,
    "nextRun" DATE NOT NULL,
    "endDate" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecurringRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SplitGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SplitGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestUser" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "GuestUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SplitGroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT,
    "guestUserId" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SplitGroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SplitExpense" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "paidByUserId" TEXT,
    "paidByGuestId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "splitType" "SplitType" NOT NULL DEFAULT 'equal',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SplitExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SplitExpenseShare" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "shareAmount" DECIMAL(12,2) NOT NULL,
    "isSettled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SplitExpenseShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SplitSettlement" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "payerMemberId" TEXT NOT NULL,
    "receiverMemberId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "settledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "SplitSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'pending',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "importedRows" INTEGER NOT NULL DEFAULT 0,
    "errorsJson" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_TransactionTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_token_idx" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "Category_userId_idx" ON "Category"("userId");

-- CreateIndex
CREATE INDEX "Category_type_idx" ON "Category"("type");

-- CreateIndex
CREATE INDEX "Budget_userId_period_idx" ON "Budget"("userId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_userId_categoryId_period_key" ON "Budget"("userId", "categoryId", "period");

-- CreateIndex
CREATE INDEX "BudgetAlert_budgetId_periodStart_level_idx" ON "BudgetAlert"("budgetId", "periodStart", "level");

-- CreateIndex
CREATE INDEX "Tag_userId_idx" ON "Tag"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_userId_name_key" ON "Tag"("userId", "name");

-- CreateIndex
CREATE INDEX "Transaction_userId_date_idx" ON "Transaction"("userId", "date");

-- CreateIndex
CREATE INDEX "Transaction_userId_type_idx" ON "Transaction"("userId", "type");

-- CreateIndex
CREATE INDEX "Transaction_userId_categoryId_idx" ON "Transaction"("userId", "categoryId");

-- CreateIndex
CREATE INDEX "Transaction_date_idx" ON "Transaction"("date");

-- CreateIndex
CREATE INDEX "RecurringRule_userId_isActive_idx" ON "RecurringRule"("userId", "isActive");

-- CreateIndex
CREATE INDEX "RecurringRule_nextRun_idx" ON "RecurringRule"("nextRun");

-- CreateIndex
CREATE INDEX "SplitGroup_createdById_idx" ON "SplitGroup"("createdById");

-- CreateIndex
CREATE INDEX "SplitGroupMember_groupId_idx" ON "SplitGroupMember"("groupId");

-- CreateIndex
CREATE INDEX "SplitExpense_groupId_date_idx" ON "SplitExpense"("groupId", "date");

-- CreateIndex
CREATE INDEX "SplitExpenseShare_expenseId_memberId_idx" ON "SplitExpenseShare"("expenseId", "memberId");

-- CreateIndex
CREATE INDEX "SplitSettlement_groupId_idx" ON "SplitSettlement"("groupId");

-- CreateIndex
CREATE INDEX "ImportJob_userId_createdAt_idx" ON "ImportJob"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "_TransactionTags_AB_unique" ON "_TransactionTags"("A", "B");

-- CreateIndex
CREATE INDEX "_TransactionTags_B_index" ON "_TransactionTags"("B");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetAlert" ADD CONSTRAINT "BudgetAlert_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringRule" ADD CONSTRAINT "RecurringRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringRule" ADD CONSTRAINT "RecurringRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SplitGroup" ADD CONSTRAINT "SplitGroup_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SplitGroupMember" ADD CONSTRAINT "SplitGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "SplitGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SplitGroupMember" ADD CONSTRAINT "SplitGroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SplitGroupMember" ADD CONSTRAINT "SplitGroupMember_guestUserId_fkey" FOREIGN KEY ("guestUserId") REFERENCES "GuestUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SplitExpense" ADD CONSTRAINT "SplitExpense_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "SplitGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SplitExpense" ADD CONSTRAINT "SplitExpense_paidByUserId_fkey" FOREIGN KEY ("paidByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SplitExpense" ADD CONSTRAINT "SplitExpense_paidByGuestId_fkey" FOREIGN KEY ("paidByGuestId") REFERENCES "GuestUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SplitExpenseShare" ADD CONSTRAINT "SplitExpenseShare_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "SplitExpense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SplitExpenseShare" ADD CONSTRAINT "SplitExpenseShare_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "SplitGroupMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SplitSettlement" ADD CONSTRAINT "SplitSettlement_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "SplitGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SplitSettlement" ADD CONSTRAINT "SplitSettlement_payerMemberId_fkey" FOREIGN KEY ("payerMemberId") REFERENCES "SplitGroupMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SplitSettlement" ADD CONSTRAINT "SplitSettlement_receiverMemberId_fkey" FOREIGN KEY ("receiverMemberId") REFERENCES "SplitGroupMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TransactionTags" ADD CONSTRAINT "_TransactionTags_A_fkey" FOREIGN KEY ("A") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TransactionTags" ADD CONSTRAINT "_TransactionTags_B_fkey" FOREIGN KEY ("B") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
