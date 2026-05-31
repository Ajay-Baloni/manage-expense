import { Progress } from './ui/progress'
import { Card, CardContent } from './ui/card'
import { formatCurrency } from '../lib/utils'
import { cn } from '../lib/utils'

export function BudgetProgressBar({ budget, currency = 'USD' }) {
  const pct = Math.min(budget.percentage_used || 0, 100)
  const isWarning = pct >= budget.alert_threshold
  const isOver = pct >= 100

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: budget.category_color || '#6366f1' }}
          />
          <span className="font-medium">{budget.category_name}</span>
        </div>
        <span className={cn('text-xs', isOver ? 'text-red-500 font-semibold' : isWarning ? 'text-orange-500' : 'text-muted-foreground')}>
          {formatCurrency(budget.spent_amount, currency)} / {formatCurrency(budget.limit_amount, currency)}
        </span>
      </div>
      <Progress
        value={pct}
        className={cn(
          'h-2',
          isOver ? '[&>div]:bg-red-500' : isWarning ? '[&>div]:bg-orange-500' : '[&>div]:bg-primary'
        )}
      />
      {isOver && <p className="text-xs text-red-500">Over budget by {formatCurrency(budget.spent_amount - budget.limit_amount, currency)}</p>}
    </div>
  )
}

export function BudgetProgressList({ budgets = [], currency = 'USD' }) {
  if (!budgets.length) {
    return <p className="text-sm text-muted-foreground">No budgets set for this month.</p>
  }
  return (
    <div className="space-y-4">
      {budgets.map((b) => <BudgetProgressBar key={b.id} budget={b} currency={currency} />)}
    </div>
  )
}
