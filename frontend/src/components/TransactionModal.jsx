import { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { createTransaction, updateTransaction } from '../store/transactionsSlice'
import { fetchCategories } from '../store/categoriesSlice'
import { getErrorMessage, formatDateInput } from '../lib/utils'
import toast from 'react-hot-toast'

const EMPTY = {
  type: 'expense',
  amount: '',
  category: '',
  date: new Date().toISOString().split('T')[0],
  description: '',
  notes: '',
  receipt_url: '',
}

export function TransactionModal({ open, onClose, transaction = null }) {
  const dispatch = useDispatch()
  const categories = useSelector((s) => s.categories.categories)
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    dispatch(fetchCategories())
  }, [dispatch])

  useEffect(() => {
    if (transaction) {
      setForm({
        type: transaction.type || 'expense',
        amount: transaction.amount || '',
        category: transaction.category?.toString() || '',
        date: formatDateInput(transaction.date),
        description: transaction.description || '',
        notes: transaction.notes || '',
        receipt_url: transaction.receipt_url || '',
      })
    } else {
      setForm(EMPTY)
    }
  }, [transaction, open])

  const filtered = categories.filter(
    (c) => c.type === 'both' || c.type === form.type
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = {
        ...form,
        amount: parseFloat(form.amount),
        category: form.category ? parseInt(form.category) : null,
      }
      if (!data.amount || isNaN(data.amount) || data.amount <= 0) {
        toast.error('Please enter a valid amount greater than 0')
        setLoading(false)
        return
      }
      if (!form.category) {
        toast.error('Please select a category')
        setLoading(false)
        return
      }
      if (!form.description.trim()) {
        toast.error('Please enter a description')
        setLoading(false)
        return
      }
      if (transaction) {
        await dispatch(updateTransaction({ id: transaction.id, data })).unwrap()
        toast.success('Transaction updated')
      } else {
        await dispatch(createTransaction(data)).unwrap()
        toast.success('Transaction created')
      }
      onClose()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{transaction ? 'Edit Transaction' : 'New Transaction'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type */}
          <div className="grid grid-cols-2 gap-2">
            {['expense', 'income'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setForm((f) => ({ ...f, type: t, category: '' }))}
                className={`py-2 rounded-md text-sm font-medium capitalize border transition-colors ${
                  form.type === t
                    ? t === 'expense'
                      ? 'bg-red-500 text-white border-red-500'
                      : 'bg-green-500 text-white border-green-500'
                    : 'border-input hover:bg-accent'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div className="space-y-1">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              required
            />
          </div>

          {/* Category */}
          <div className="space-y-1">
            <Label>Category <span className="text-destructive">*</span></Label>
            <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {filtered.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-1">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Enter description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              required
            />
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              placeholder="Additional notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : transaction ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
