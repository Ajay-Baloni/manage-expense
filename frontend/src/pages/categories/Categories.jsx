import { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Plus, Pencil, Trash2, Target } from 'lucide-react'
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  createBudget,
  updateBudget,
  deleteBudget,
  fetchCurrentMonthBudgets,
} from '../../store/categoriesSlice'
import { selectUser } from '../../store/authSlice'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { BudgetProgressList } from '../../components/BudgetProgressBar'
import { getErrorMessage } from '../../lib/utils'
import toast from 'react-hot-toast'

const EMPTY_CAT = { name: '', icon: 'tag', color: '#6366f1', type: 'both' }
const EMPTY_BUDGET = { category: '', month: new Date().toISOString().slice(0, 7), limit_amount: '', alert_threshold: 80 }

export default function Categories() {
  const dispatch = useDispatch()
  const categories = useSelector((s) => s.categories.categories)
  const budgets = useSelector((s) => s.categories.budgets)
  const user = useSelector(selectUser)
  const currency = user?.profile?.currency || 'USD'

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
      month: b.month.slice(0, 7),
      limit_amount: b.limit_amount,
      alert_threshold: b.alert_threshold,
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
        month: budgetForm.month + '-01',
        category: parseInt(budgetForm.category),
        limit_amount: parseFloat(budgetForm.limit_amount),
      }
      if (editingBudget) await dispatch(updateBudget({ id: editingBudget.id, data })).unwrap()
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

  const expenseCategories = categories.filter((c) => c.type !== 'income')
  const incomeCategories = categories.filter((c) => c.type !== 'expense')

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Manage Categories</h2>
        <Button size="sm" onClick={() => openCatModal()}>
          <Plus className="h-4 w-4 mr-2" />New Category
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Expense categories */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-red-600">Expense Categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {expenseCategories.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                  <span className="text-sm font-medium">{c.name}</span>
                  {c.is_default && <span className="text-xs text-muted-foreground">(default)</span>}
                </div>
                {!c.is_default && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openCatModal(c)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteCat(c.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Income categories */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-green-600">Income Categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {incomeCategories.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                  <span className="text-sm font-medium">{c.name}</span>
                  {c.is_default && <span className="text-xs text-muted-foreground">(default)</span>}
                </div>
                {!c.is_default && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openCatModal(c)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteCat(c.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Budgets */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-base">Monthly Budgets</CardTitle>
            <Button size="sm" variant="outline" onClick={() => openBudgetModal()}>
              <Target className="h-4 w-4 mr-2" />Set Budget
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <BudgetProgressList budgets={budgets} currency={currency} />
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
              <Label>Month</Label>
              <Input type="month" value={budgetForm.month} onChange={(e) => setBudgetForm((f) => ({ ...f, month: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>Budget Limit</Label>
              <Input type="number" step="0.01" min="0" value={budgetForm.limit_amount} onChange={(e) => setBudgetForm((f) => ({ ...f, limit_amount: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>Alert Threshold (%)</Label>
              <Input type="number" min="0" max="100" value={budgetForm.alert_threshold} onChange={(e) => setBudgetForm((f) => ({ ...f, alert_threshold: parseInt(e.target.value) }))} />
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
