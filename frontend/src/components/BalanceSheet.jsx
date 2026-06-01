import { ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { formatCurrency } from '../lib/utils'

export function BalanceSheet({ balances, onSettle, currency = 'INR' }) {
  if (!balances) return null

  const { member_balances = [], suggested_settlements = [] } = balances

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Member Balances</CardTitle>
        </CardHeader>
        <CardContent>
          {member_balances.length === 0 ? (
            <p className="text-sm text-muted-foreground">Everyone is settled up!</p>
          ) : (
            <div className="space-y-2">
              {member_balances.map((mb) => (
                <div key={mb.member_id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-sm font-medium">{mb.member_name}</span>
                  <span className={`text-sm font-semibold ${mb.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {mb.balance >= 0 ? '+' : ''}{formatCurrency(mb.balance, currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {suggested_settlements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Suggested Settlements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {suggested_settlements.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-md">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{s.from_name}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{s.to_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{formatCurrency(s.amount, currency)}</span>
                    {onSettle && (
                      <button
                        onClick={() => onSettle(s)}
                        className="text-xs text-primary hover:underline"
                      >
                        Settle
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
