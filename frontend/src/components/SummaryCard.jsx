import { TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent } from './ui/card'
import { cn, formatCurrency } from '../lib/utils'

export function SummaryCard({ title, amount, currency = 'USD', change, icon: Icon, color = 'text-primary' }) {
  const isPositive = change >= 0

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={cn('text-2xl font-bold mt-1', color)}>
              {formatCurrency(amount, currency)}
            </p>
          </div>
          {Icon && (
            <div className={cn('p-2 rounded-md bg-muted', color)}>
              <Icon className="h-5 w-5" />
            </div>
          )}
        </div>
        {change !== undefined && (
          <div className="flex items-center gap-1 mt-3 text-sm">
            {isPositive ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
            <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
              {isPositive ? '+' : ''}{change.toFixed(1)}%
            </span>
            <span className="text-muted-foreground">vs last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
