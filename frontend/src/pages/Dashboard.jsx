import { useEffect } from 'react'
import { TrendingUp, TrendingDown, Percent, Wallet } from 'lucide-react'
import { useSelector, useDispatch } from 'react-redux'
import { fetchSummary as fetchSummaryAction } from '../store/transactionsSlice'
import { fetchCurrentMonthBudgets as fetchCurrentMonthBudgetsAction } from '../store/categoriesSlice'
import { selectUser } from '../store/authSlice'
import { SummaryCard } from '../components/SummaryCard'
import { SpendingChart } from '../components/SpendingChart'
import { CategoryPieChart } from '../components/CategoryPieChart'
import { BudgetProgressList } from '../components/BudgetProgressBar'
import { PageHeader } from '../components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'

export default function Dashboard() {
  const dispatch = useDispatch()
  const summary = useSelector((s) => s.transactions.summary)
  const budgets = useSelector((s) => s.categories.budgets)
  const user = useSelector(selectUser)
  const fetchSummary = () => dispatch(fetchSummaryAction())
  const fetchCurrentMonthBudgets = () => dispatch(fetchCurrentMonthBudgetsAction())
  const currency = user?.profile?.currency || 'INR'

  useEffect(() => {
    fetchSummary()
    fetchCurrentMonthBudgets()
  }, [])

  const savingsRate = summary?.total_income > 0
    ? ((summary.net_balance / summary.total_income) * 100).toFixed(1)
    : '0'

  const firstName = user?.first_name || 'there'

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Here's an overview of your finances this month."
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Income"
          amount={summary?.total_income || 0}
          currency={currency}
          change={summary?.income_change_pct}
          icon={TrendingUp}
          color="text-emerald-600 dark:text-emerald-500"
        />
        <SummaryCard
          title="Total Expenses"
          amount={summary?.total_expense || 0}
          currency={currency}
          change={summary?.expense_change_pct}
          icon={TrendingDown}
          color="text-red-600 dark:text-red-500"
        />
        <SummaryCard
          title="Net Balance"
          amount={summary?.net_balance || 0}
          currency={currency}
          icon={Wallet}
          color={(summary?.net_balance || 0) >= 0 ? 'text-blue-600 dark:text-blue-500' : 'text-orange-600 dark:text-orange-500'}
        />
        <SummaryCard
          title="Savings Rate"
          amount={savingsRate}
          suffix="%"
          icon={Percent}
          color="text-violet-600 dark:text-violet-500"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SpendingChart data={summary?.monthly_breakdown || []} currency={currency} />
        <CategoryPieChart data={summary?.top_categories || []} currency={currency} />
      </div>

      {/* Budgets */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Budget Status</CardTitle>
          <CardDescription className="text-sm">Your spending against budgets for this month.</CardDescription>
        </CardHeader>
        <CardContent>
          {budgets.length > 0 ? (
            <BudgetProgressList budgets={budgets} currency={currency} />
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm font-medium text-foreground">No budgets set</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Set monthly budgets in the Categories page to track your spending.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
