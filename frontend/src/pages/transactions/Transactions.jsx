import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Plus, Search, SlidersHorizontal, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { fetchTransactions, setFilters as setFiltersAction, deleteTransaction } from '../../store/transactionSlice'
import { fetchCategories } from '../../store/categorySlice'
import { DataTable } from '../../components/DataTable'
import { TransactionModal } from '../../components/TransactionModal'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover'
import { Card } from '../../components/ui/card'
import { getErrorMessage } from '../../lib/utils'
import toast from 'react-hot-toast'

const FILTER_FIELDS = ['type', 'category', 'date_from', 'date_to', 'amount_min', 'amount_max']

export default function Transactions({ defaultType = '', title, description }) {
  const dispatch = useDispatch()
  const { transactions, filters, pagination, loading } = useSelector((s) => s.transactions)
  const categories = useSelector((s) => s.categories.categories)
  const user = useSelector((s) => s.auth.user)
  const currency = user?.profile?.currency || 'INR'

  const setFilters = (patch) => dispatch(setFiltersAction(patch))

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filterOpen, setFilterOpen] = useState(false)

  // Empty draft keeps this page's locked type (e.g. 'income' on the Income page).
  const emptyDraft = {
    type: defaultType || '',
    category: '',
    date_from: '',
    date_to: '',
    amount_min: '',
    amount_max: '',
  }
  // Draft holds in-progress filter edits; nothing is applied until "Apply".
  const [draft, setDraft] = useState(emptyDraft)
  const setDraftField = (patch) => setDraft((d) => ({ ...d, ...patch }))

  useEffect(() => {
    dispatch(fetchCategories())
    // Always reset the type to this page's locked type on mount, so a leftover
    // filter from another page (e.g. Income) doesn't leak into this one.
    setFilters({ type: defaultType || '' })
  }, [defaultType])

  useEffect(() => {
    dispatch(fetchTransactions(defaultType ? { type: defaultType } : {}))
  }, [filters])

  // Seed the draft from the currently applied filters each time the popover opens.
  const handleFilterOpenChange = (open) => {
    if (open) {
      setDraft(Object.fromEntries(FILTER_FIELDS.map((k) => [k, filters[k] || ''])))
    }
    setFilterOpen(open)
  }

  const applyDraft = () => {
    setFilters({ ...draft })
    setFilterOpen(false)
  }

  const clearDraft = () => {
    setDraft(emptyDraft)
    setFilters({ ...emptyDraft })
    setFilterOpen(false)
  }

  // Does the draft contain any active filter (ignoring the locked type)?
  const draftKeys = defaultType ? FILTER_FIELDS.filter((k) => k !== 'type') : FILTER_FIELDS
  const draftHasValues = draftKeys.some((k) => draft[k])

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

  // Count active filters (ignore search, page, and the locked type on Income page)
  const activeFilterKeys = ['category', 'date_from', 'date_to', 'amount_min', 'amount_max']
  if (!defaultType) activeFilterKeys.push('type')
  const activeFilterCount = activeFilterKeys.filter((k) => filters[k]).length

  return (
    <div className="space-y-5">
      <PageHeader
        title={title || 'Transactions'}
        description={description || 'Track and manage all your income and expenses.'}
      >
        <Button size="sm" onClick={handleAdd} className="h-9">
          <Plus className="h-4 w-4 mr-1.5" />
          Add Transaction
        </Button>
      </PageHeader>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search transactions…"
            className="pl-9 h-9"
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
          />
        </div>

        <Popover open={filterOpen} onOpenChange={handleFilterOpenChange}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 relative">
              <SlidersHorizontal className="h-4 w-4 mr-1.5" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Filters</p>
                {draftHasValues && (
                  <button
                    onClick={clearDraft}
                    className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                  >
                    <X className="h-3 w-3" /> Clear all
                  </button>
                )}
              </div>

              {!defaultType && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Type</Label>
                  <Select value={draft.type || 'all'} onValueChange={(v) => setDraftField({ type: v === 'all' ? '' : v })}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="All Types" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Category</Label>
                <Select value={draft.category || 'all'} onValueChange={(v) => setDraftField({ category: v === 'all' ? '' : v })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="All Categories" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Date range</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="date" className="h-9" value={draft.date_from} onChange={(e) => setDraftField({ date_from: e.target.value })} />
                  <Input type="date" className="h-9" value={draft.date_to} onChange={(e) => setDraftField({ date_to: e.target.value })} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Amount range</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" placeholder="Min" className="h-9" value={draft.amount_min} onChange={(e) => setDraftField({ amount_min: e.target.value })} />
                  <Input type="number" placeholder="Max" className="h-9" value={draft.amount_max} onChange={(e) => setDraftField({ amount_max: e.target.value })} />
                </div>
              </div>

              <Button size="sm" className="w-full h-9" onClick={applyDraft}>
                Apply filters
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {!defaultType && filters.type && (
            <FilterChip label={`Type: ${filters.type}`} onClear={() => setFilters({ type: '' })} />
          )}
          {filters.category && (
            <FilterChip
              label={`Category: ${categories.find((c) => c.id.toString() === filters.category)?.name || filters.category}`}
              onClear={() => setFilters({ category: '' })}
            />
          )}
          {filters.date_from && <FilterChip label={`From ${filters.date_from}`} onClear={() => setFilters({ date_from: '' })} />}
          {filters.date_to && <FilterChip label={`To ${filters.date_to}`} onClear={() => setFilters({ date_to: '' })} />}
          {filters.amount_min && <FilterChip label={`Min ${filters.amount_min}`} onClear={() => setFilters({ amount_min: '' })} />}
          {filters.amount_max && <FilterChip label={`Max ${filters.amount_max}`} onClear={() => setFilters({ amount_max: '' })} />}
        </div>
      )}

      {/* Table */}
      <Card className="overflow-hidden">
        <DataTable
          transactions={transactions}
          onEdit={handleEdit}
          onDelete={handleDelete}
          currency={currency}
          loading={loading}
        />
        {pagination.count > 20 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Showing {((filters.page - 1) * 20) + 1}–{Math.min(filters.page * 20, pagination.count)} of {pagination.count}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={!pagination.previous} onClick={() => setFilters({ page: filters.page - 1 })}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground tabular-nums">{filters.page} / {totalPages}</span>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={!pagination.next} onClick={() => setFilters({ page: filters.page + 1 })}>
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

function FilterChip({ label, onClear }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
      {label}
      <button onClick={onClear} className="text-muted-foreground hover:text-foreground">
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}
