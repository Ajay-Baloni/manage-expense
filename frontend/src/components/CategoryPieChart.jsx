import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { formatCurrency } from '../lib/utils'

export function CategoryPieChart({ data = [], currency = 'USD' }) {
  if (!data.length) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Spending by Category</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-center h-40 text-muted-foreground text-sm">
          No data for this period
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Spending by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              dataKey="total"
              nameKey="name"
              paddingAngle={2}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color || `hsl(${i * 50}, 70%, 50%)`} />
              ))}
            </Pie>
            <Tooltip formatter={(val) => formatCurrency(val, currency)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
