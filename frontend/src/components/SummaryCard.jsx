import { TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent } from './ui/card'
import { cn, formatCurrency } from '../lib/utils'

export function SummaryCard({ title, amount, currency = 'INR', change, icon: Icon, color = 'text-primary', suffix }) {
  const isPositive = change >= 0
  const display = suffix !== undefined ? `${amount}${suffix}` : formatCurrency(amount, currency)

  return (
    <Card className="card-shadow">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {Icon && (
            <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg bg-muted', color)}>
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>
        <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums text-foreground">
          {display}
        </p>
        {change !== undefined && change !== null && (
          <div className="mt-2 flex items-center gap-1 text-xs">
            {isPositive ? (
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-red-500" />
            )}
            <span className={cn('font-medium', isPositive ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500')}>
              {isPositive ? '+' : ''}{change.toFixed(1)}%
            </span>
            <span className="text-muted-foreground">vs last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
