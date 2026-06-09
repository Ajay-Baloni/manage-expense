import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { formatCurrency } from '../lib/utils'

export function CategoryPieChart({ data = [], currency = 'INR' }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Spending by Category</CardTitle>
        <CardDescription className="text-sm">Top categories this period.</CardDescription>
      </CardHeader>
      <CardContent>
        {!data.length ? (
          <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">
            No data for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={62}
                outerRadius={100}
                dataKey="total"
                nameKey="name"
                paddingAngle={2}
                stroke="none"
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color || `hsl(${i * 50}, 70%, 50%)`} />
                ))}
              </Pie>
              <Tooltip
                formatter={(val) => formatCurrency(val, currency)}
                contentStyle={{
                  borderRadius: '0.5rem',
                  border: '1px solid hsl(var(--border))',
                  backgroundColor: 'hsl(var(--popover))',
                  fontSize: '12px',
                }}
                itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                labelStyle={{ color: 'hsl(var(--popover-foreground))', fontWeight: 600 }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
