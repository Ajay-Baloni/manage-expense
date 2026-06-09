import { useState } from 'react'
import { Pencil, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { formatCurrency, formatDate, cn } from '../lib/utils'

export function DataTable({ transactions = [], onEdit, onDelete, currency = 'INR', loading = false }) {
  const [sortField, setSortField] = useState('date')
  const [sortDir, setSortDir] = useState('desc')

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortDir('desc') }
  }

  const sorted = [...transactions].sort((a, b) => {
    let av = a[sortField], bv = b[sortField]
    if (sortField === 'amount') { av = parseFloat(av); bv = parseFloat(bv) }
    if (av < bv) return sortDir === 'asc' ? -1 : 1
    if (av > bv) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3 inline ml-1" /> : <ChevronDown className="h-3 w-3 inline ml-1" />
  }

  const th = (label, field) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground select-none"
      onClick={() => handleSort(field)}
    >
      {label}<SortIcon field={field} />
    </th>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        Loading transactions...
      </div>
    )
  }

  if (!transactions.length) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        No transactions found
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-border">
          <tr>
            {th('Date', 'date')}
            {th('Description', 'description')}
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Category</th>
            {th('Amount', 'amount')}
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.map((t) => (
            <tr key={t.id} className="hover:bg-muted/50 transition-colors">
              <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{formatDate(t.date)}</td>
              <td className="px-4 py-3">
                <p className="text-sm font-medium">{t.description}</p>
                {t.notes && <p className="text-xs text-muted-foreground">{t.notes}</p>}
              </td>
              <td className="px-4 py-3">
                {t.category_detail ? (
                  <span className="inline-flex items-center gap-1 text-sm">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: t.category_detail.color }}
                    />
                    {t.category_detail.name}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
              <td className={cn('px-4 py-3 text-sm font-semibold whitespace-nowrap',
                t.type === 'income' ? 'text-green-600' : 'text-red-600'
              )}>
                {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, currency)}
              </td>
              <td className="px-4 py-3">
                <Badge variant={t.type === 'income' ? 'default' : 'destructive'} className="capitalize text-xs">
                  {t.type}
                </Badge>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(t)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(t.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
