import { useState } from 'react'
import { useSelector } from 'react-redux'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { cn } from '../../lib/utils'

const ACTION_LABELS = {
  create_transaction: 'Add transaction',
  update_transaction: 'Update transaction',
  delete_transaction: 'Delete transaction',
}

const selectClasses =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

function humanize(key) {
  return key.replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase())
}

/**
 * Editable review card for a write action proposed by the assistant.
 * Fields are pre-filled from the model's proposal; the user can adjust
 * them before confirming. Edited values are re-validated server-side.
 */
export function ConfirmationCard({ pending, busy, onConfirm, onCancel }) {
  const categories = useSelector((s) => s.categories.categories)
  const [form, setForm] = useState(() => ({ ...pending.proposed }))

  const isDelete = pending.action?.startsWith('delete_')
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const handleConfirm = () => {
    const edited = { ...form }
    if (edited.amount !== undefined && edited.amount !== '') edited.amount = Number(edited.amount)
    if (edited.category === '') edited.category = null
    onConfirm(edited)
  }

  const renderField = (key, value) => {
    if (key === 'id') {
      return <p className="truncate rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">{String(value)}</p>
    }
    if (isDelete) {
      return <p className="rounded-md bg-muted px-3 py-2 text-sm">{String(value)}</p>
    }
    if (key === 'type') {
      return (
        <select className={selectClasses} value={value ?? 'expense'} onChange={(e) => set(key, e.target.value)}>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
      )
    }
    if (key === 'category') {
      return (
        <select className={selectClasses} value={value ?? ''} onChange={(e) => set(key, e.target.value)}>
          <option value="">None</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )
    }
    if (key === 'date') {
      return <Input type="date" value={value ?? ''} onChange={(e) => set(key, e.target.value)} />
    }
    if (key === 'amount') {
      return <Input type="number" step="0.01" min="0" value={value ?? ''} onChange={(e) => set(key, e.target.value)} />
    }
    if (Array.isArray(value) || (value !== null && typeof value === 'object')) {
      return <p className="truncate rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">{JSON.stringify(value)}</p>
    }
    return <Input value={value ?? ''} onChange={(e) => set(key, e.target.value)} />
  }

  return (
    <div className={cn('space-y-3 rounded-lg border p-3', isDelete ? 'border-destructive/50' : 'border-border')}>
      <p className={cn('text-sm font-semibold', isDelete && 'text-destructive')}>
        {ACTION_LABELS[pending.action] || humanize(pending.action || 'Confirm action')}
      </p>
      <div className="space-y-2">
        {Object.entries(form)
          .map(([key, value]) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs text-muted-foreground">{humanize(key)}</Label>
              {renderField(key, value)}
            </div>
          ))}
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={isDelete ? 'destructive' : 'default'}
          className="flex-1"
          disabled={busy}
          onClick={handleConfirm}
        >
          {isDelete ? 'Delete' : 'Confirm'}
        </Button>
        <Button size="sm" variant="outline" className="flex-1" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
