import { Pencil, Trash2 } from 'lucide-react'
import { Progress } from './ui/progress'
import { formatCurrency, cn } from '../lib/utils'

export function BudgetProgressBar({ budget, currency = 'INR', onEdit, onDelete }) {
  const pct = Math.min(budget.percentage_used || 0, 100)
  const isWarning = pct >= budget.alert_threshold
  const isOver = pct >= 100
  const hasActions = onEdit || onDelete

  return (
    <div className="group space-y-1">
      <div className="flex items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="inline-block w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: budget.category_color || '#6366f1' }}
          />
          <span className="font-medium truncate">{budget.category_name}</span>
          {budget.period && (
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
              {budget.period}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={cn('text-xs whitespace-nowrap', isOver ? 'text-red-500 font-semibold' : isWarning ? 'text-orange-500' : 'text-muted-foreground')}>
            {formatCurrency(budget.spent_amount, currency)} / {formatCurrency(budget.limit_amount, currency)}
          </span>
          {hasActions && (
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {onEdit && (
                <button
                  onClick={() => onEdit(budget)}
                  className="flex items-center justify-center h-6 w-6 rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  title="Edit budget"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(budget.id)}
                  className="flex items-center justify-center h-6 w-6 rounded text-muted-foreground hover:bg-accent hover:text-destructive transition-colors"
                  title="Delete budget"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
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

export function BudgetProgressList({ budgets = [], currency = 'INR', onEdit, onDelete }) {
  if (!budgets.length) {
    return <p className="text-sm text-muted-foreground">No budgets set.</p>
  }
  return (
    <div className="space-y-4">
      {budgets.map((b) => (
        <BudgetProgressBar key={b.id} budget={b} currency={currency} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  )
}
