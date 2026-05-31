import { useEffect } from 'react'
import { TrendingUp, TrendingDown, DollarSign, Wallet } from 'lucide-react'
import { useTransactionStore } from '../store/transactionStore'
import { useCategoryStore } from '../store/categoryStore'
import { useAuthStore } from '../store/authStore'
import { SummaryCard } from '../components/SummaryCard'
import { SpendingChart } from '../components/SpendingChart'
import { CategoryPieChart } from '../components/CategoryPieChart'
import { BudgetProgressList } from '../components/BudgetProgressBar'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'

export default function Dashboard() {
  const { summary, fetchSummary } = useTransactionStore()
  const { budgets, fetchCurrentMonthBudgets } = useCategoryStore()
  const { user } = useAuthStore()
  const currency = user?.profile?.currency || 'USD'

  useEffect(() => {
    fetchSummary()
    fetchCurrentMonthBudgets()
  }, [])

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Income"
          amount={summary?.total_income || 0}
          currency={currency}
          change={summary?.income_change_pct}
          icon={TrendingUp}
          color="text-green-600"
        />
        <SummaryCard
          title="Total Expenses"
          amount={summary?.total_expense || 0}
          currency={currency}
          change={summary?.expense_change_pct}
          icon={TrendingDown}
          color="text-red-600"
        />
        <SummaryCard
          title="Net Balance"
          amount={summary?.net_balance || 0}
          currency={currency}
          icon={Wallet}
          color={(summary?.net_balance || 0) >= 0 ? 'text-blue-600' : 'text-orange-600'}
        />
        <SummaryCard
          title="Savings Rate"
          amount={summary?.total_income > 0 ? ((summary.net_balance / summary.total_income) * 100).toFixed(1) : 0}
          icon={DollarSign}
          color="text-purple-600"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SpendingChart data={summary?.monthly_breakdown || []} />
        <CategoryPieChart data={summary?.top_categories || []} currency={currency} />
      </div>

      {/* Budgets */}
      {budgets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Budget Status — This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <BudgetProgressList budgets={budgets} currency={currency} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
