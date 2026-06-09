import { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Plus, Search, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  fetchTransactions,
  setFilters,
  resetFilters,
  deleteTransaction,
} from '../../store/transactionsSlice'
import { fetchCategories } from '../../store/categoriesSlice'
import { selectUser } from '../../store/authSlice'
import { DataTable } from '../../components/DataTable'
import { TransactionModal } from '../../components/TransactionModal'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Card } from '../../components/ui/card'
import { getErrorMessage } from '../../lib/utils'
import toast from 'react-hot-toast'

export default function Transactions({ defaultType = '' }) {
  const dispatch = useDispatch()
  const { transactions, filters, pagination, loading } = useSelector((s) => s.transactions)
  const categories = useSelector((s) => s.categories.categories)
  const user = useSelector(selectUser)
  const currency = user?.profile?.currency || 'USD'

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    dispatch(fetchCategories())
    if (defaultType) dispatch(setFilters({ type: defaultType }))
  }, [defaultType, dispatch])

  useEffect(() => {
    dispatch(fetchTransactions(defaultType ? { type: defaultType } : {}))
  }, [filters, defaultType, dispatch])

  const handleDelete = async (id) => {
    if (!confirm('Delete this transaction?')) return
    try {
      await dispatch(deleteTransaction(id)).unwrap()
      toast.success('Transaction deleted')
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  const handleEdit = (t) => { setEditing(t); setModalOpen(true) }
  const handleAdd = () => { setEditing(null); setModalOpen(true) }
  const handleClose = () => { setModalOpen(false); setEditing(null); dispatch(fetchTransactions()) }

  const totalPages = Math.ceil(pagination.count / 20)

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            className="pl-9"
            value={filters.search}
            onChange={(e) => dispatch(setFilters({ search: e.target.value }))}
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowFilters((v) => !v)}>
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
        <Button size="sm" onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Transaction
        </Button>
      </div>

      {/* Filter Bar */}
      {showFilters && (
        <Card className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {!defaultType && (
              <Select value={filters.type || 'all'} onValueChange={(v) => dispatch(setFilters({ type: v === 'all' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="All Types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Select value={filters.category || 'all'} onValueChange={(v) => dispatch(setFilters({ category: v === 'all' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" placeholder="From" value={filters.date_from} onChange={(e) => dispatch(setFilters({ date_from: e.target.value }))} />
            <Input type="date" placeholder="To" value={filters.date_to} onChange={(e) => dispatch(setFilters({ date_to: e.target.value }))} />
            <Input type="number" placeholder="Min amount" value={filters.amount_min} onChange={(e) => dispatch(setFilters({ amount_min: e.target.value }))} />
            <Input type="number" placeholder="Max amount" value={filters.amount_max} onChange={(e) => dispatch(setFilters({ amount_max: e.target.value }))} />
            <Button variant="outline" size="sm" onClick={() => dispatch(resetFilters())}>
              <X className="h-4 w-4 mr-2" />Clear
            </Button>
          </div>
        </Card>
      )}

      {/* Table */}
      <Card>
        <DataTable
          transactions={transactions}
          onEdit={handleEdit}
          onDelete={handleDelete}
          currency={currency}
          loading={loading}
        />
        {/* Pagination */}
        {pagination.count > 20 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Showing {((filters.page - 1) * 20) + 1}–{Math.min(filters.page * 20, pagination.count)} of {pagination.count}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={!pagination.previous} onClick={() => dispatch(setFilters({ page: filters.page - 1 }))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">{filters.page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={!pagination.next} onClick={() => dispatch(setFilters({ page: filters.page + 1 }))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <TransactionModal open={modalOpen} onClose={handleClose} transaction={editing} />
    </div>
  )
}
