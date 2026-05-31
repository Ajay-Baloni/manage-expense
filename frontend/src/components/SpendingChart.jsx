import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

export function SpendingChart({ data = [] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Income vs Expenses</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12 }}
              tickFormatter={(v) => {
                const [y, m] = v.split('-')
                return new Date(+y, +m - 1).toLocaleString('default', { month: 'short' })
              }}
            />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`} />
            <Tooltip
              formatter={(val, name) => [`$${Number(val).toFixed(2)}`, name]}
              labelFormatter={(v) => {
                const [y, m] = v.split('-')
                return new Date(+y, +m - 1).toLocaleString('default', { month: 'long', year: 'numeric' })
              }}
            />
            <Legend />
            <Area type="monotone" dataKey="income" stroke="#22c55e" fill="#22c55e20" name="Income" strokeWidth={2} />
            <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="#ef444420" name="Expense" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
