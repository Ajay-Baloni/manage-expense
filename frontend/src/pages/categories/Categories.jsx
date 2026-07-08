import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Plus, Pencil, Trash2, Target } from 'lucide-react'
import {
  fetchCategories, createCategory, updateCategory, deleteCategory,
  createBudget, updateBudget, deleteBudget, fetchCurrentMonthBudgets,
} from '../../store/categorySlice'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { PageHeader } from '../../components/layout/PageHeader'
import { BudgetProgressList } from '../../components/BudgetProgressBar'
import { getErrorMessage } from '../../lib/utils'
import toast from 'react-hot-toast'

const EMPTY_CAT = { name: '', icon: 'tag', color: '#6366f1', type: 'both' }
const EMPTY_BUDGET = { category: '', period: 'monthly', limit_amount: '' }

export default function Categories() {
  const dispatch = useDispatch()
  const categories = useSelector((s) => s.categories.categories)
  const budgets = useSelector((s) => s.categories.budgets)
  const user = useSelector((s) => s.auth.user)
  const currency = user?.profile?.currency || 'INR'

  const [catModal, setCatModal] = useState(false)
  const [budgetModal, setBudgetModal] = useState(false)
  const [editingCat, setEditingCat] = useState(null)
  const [editingBudget, setEditingBudget] = useState(null)
  const [catForm, setCatForm] = useState(EMPTY_CAT)
  const [budgetForm, setBudgetForm] = useState(EMPTY_BUDGET)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    dispatch(fetchCategories())
    dispatch(fetchCurrentMonthBudgets())
  }, [dispatch])

  const openCatModal = (cat = null) => {
    setEditingCat(cat)
    setCatForm(cat ? { name: cat.name, icon: cat.icon, color: cat.color, type: cat.type } : EMPTY_CAT)
    setCatModal(true)
  }

  const openBudgetModal = (b = null) => {
    setEditingBudget(b)
    setBudgetForm(b ? {
      category: b.category.toString(),
      period: b.period || 'monthly',
      limit_amount: b.limit_amount,
    } : EMPTY_BUDGET)
    setBudgetModal(true)
  }

  const saveCat = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (editingCat) await dispatch(updateCategory({ id: editingCat.id, data: catForm })).unwrap()
      else await dispatch(createCategory(catForm)).unwrap()
      toast.success(editingCat ? 'Category updated' : 'Category created')
      setCatModal(false)
    } catch (err) { toast.error(getErrorMessage(err)) }
    finally { setLoading(false) }
  }

  const saveBudget = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = {
        ...budgetForm,
        category: budgetForm.category,
        limit_amount: parseFloat(budgetForm.limit_amount),
      }
      // Upsert: only one budget is allowed per category+period, so if one
      // already exists we update it instead of creating a duplicate.
      const existing = editingBudget
        || budgets.find((b) => b.category === data.category && b.period === data.period)
      if (existing) await dispatch(updateBudget({ id: existing.id, data })).unwrap()
      else await dispatch(createBudget(data)).unwrap()
      toast.success('Budget saved')
      setBudgetModal(false)
      dispatch(fetchCurrentMonthBudgets())
    } catch (err) { toast.error(getErrorMessage(err)) }
    finally { setLoading(false) }
  }

  const handleDeleteCat = async (id) => {
    if (!confirm('Delete this category?')) return
    try { await dispatch(deleteCategory(id)).unwrap(); toast.success('Deleted') }
    catch (err) { toast.error(getErrorMessage(err)) }
  }

  const handleDeleteBudget = async (id) => {
    if (!confirm('Delete this budget?')) return
    try { await dispatch(deleteBudget(id)).unwrap(); toast.success('Budget deleted'); dispatch(fetchCurrentMonthBudgets()) }
    catch (err) { toast.error(getErrorMessage(err)) }
  }

  const expenseCategories = categories.filter((c) => c.type !== 'income')
  const incomeCategories = categories.filter((c) => c.type !== 'expense')

  return (
    <div className="space-y-5">
      <PageHeader
        title="Categories"
        description="Organize your transactions and set monthly budgets."
      >
        <Button size="sm" className="h-9" onClick={() => openCatModal()}>
          <Plus className="h-4 w-4 mr-1.5" />New Category
        </Button>
      </PageHeader>

      <div className="grid md:grid-cols-2 gap-4">
        <CategoryList
          title="Expense Categories"
          accent="bg-red-500"
          categories={expenseCategories}
          onEdit={openCatModal}
          onDelete={handleDeleteCat}
        />
        <CategoryList
          title="Income Categories"
          accent="bg-emerald-500"
          categories={incomeCategories}
          onEdit={openCatModal}
          onDelete={handleDeleteCat}
        />
      </div>

      {/* Budgets */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base font-semibold">Budgets</CardTitle>
            <Button size="sm" variant="outline" className="h-9" onClick={() => openBudgetModal()}>
              <Target className="h-4 w-4 mr-1.5" />Set Budget
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {budgets.length > 0 ? (
            <BudgetProgressList
              budgets={budgets}
              currency={currency}
              onEdit={openBudgetModal}
              onDelete={handleDeleteBudget}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm font-medium text-foreground">No budgets yet</p>
              <p className="text-sm text-muted-foreground mt-0.5">Set a budget to monitor your category spending.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Modal */}
      <Dialog open={catModal} onOpenChange={(v) => !v && setCatModal(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editingCat ? 'Edit Category' : 'New Category'}</DialogTitle></DialogHeader>
          <form onSubmit={saveCat} className="space-y-4">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={catForm.name} onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={catForm.type} onValueChange={(v) => setCatForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Color</Label>
              <div className="flex gap-2 items-center">
                <input type="color" value={catForm.color} onChange={(e) => setCatForm((f) => ({ ...f, color: e.target.value }))} className="h-10 w-16 rounded border" />
                <Input value={catForm.color} onChange={(e) => setCatForm((f) => ({ ...f, color: e.target.value }))} className="flex-1" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCatModal(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Budget Modal */}
      <Dialog open={budgetModal} onOpenChange={(v) => !v && setBudgetModal(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editingBudget ? 'Edit Budget' : 'Set Budget'}</DialogTitle></DialogHeader>
          <form onSubmit={saveBudget} className="space-y-4">
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={budgetForm.category} onValueChange={(v) => setBudgetForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.filter((c) => c.type !== 'income').map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Period</Label>
              <Select value={budgetForm.period} onValueChange={(v) => setBudgetForm((f) => ({ ...f, period: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Budget Limit</Label>
              <Input type="number" step="0.01" min="0" value={budgetForm.limit_amount} onChange={(e) => setBudgetForm((f) => ({ ...f, limit_amount: e.target.value }))} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setBudgetModal(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CategoryList({ title, accent, categories, onEdit, onDelete }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${accent}`} />
          {title}
          <span className="ml-auto text-xs font-normal text-muted-foreground">{categories.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {categories.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No categories</p>
        ) : (
          <div className="space-y-0.5">
            {categories.map((c) => (
              <div key={c.id} className="group flex items-center justify-between rounded-md px-2 py-2 hover:bg-accent transition-colors">
                <div className="flex items-center gap-2.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                  <span className="text-sm font-medium">{c.name}</span>
                  {c.is_default && (
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground bg-muted px-1.5 py-0.5 rounded">default</span>
                  )}
                </div>
                {!c.is_default && (
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(c)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(c.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
