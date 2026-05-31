import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, UserPlus, RefreshCw } from 'lucide-react'
import { useSplitStore } from '../../store/splitStore'
import { BalanceSheet } from '../../components/BalanceSheet'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { formatCurrency, formatDate, getErrorMessage } from '../../lib/utils'
import toast from 'react-hot-toast'

export default function SplitDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentGroup, expenses, balances, fetchGroup, fetchExpenses, fetchBalances, createExpense, deleteExpense, addMember, settle } = useSplitStore()

  const [expenseModal, setExpenseModal] = useState(false)
  const [memberModal, setMemberModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [expForm, setExpForm] = useState({ amount: '', description: '', date: new Date().toISOString().split('T')[0], split_type: 'equal' })
  const [memberForm, setMemberForm] = useState({ type: 'guest', name: '', email: '' })

  useEffect(() => {
    fetchGroup(id)
    fetchExpenses(id)
    fetchBalances(id)
  }, [id])

  const handleAddExpense = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await createExpense({
        group: parseInt(id),
        amount: parseFloat(expForm.amount),
        description: expForm.description,
        date: expForm.date,
        split_type: expForm.split_type,
      })
      toast.success('Expense added')
      setExpenseModal(false)
      fetchBalances(id)
    } catch (err) { toast.error(getErrorMessage(err)) }
    finally { setLoading(false) }
  }

  const handleAddMember = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await addMember(id, { guest_user: { name: memberForm.name, email: memberForm.email } })
      toast.success('Member added')
      setMemberModal(false)
      fetchBalances(id)
    } catch (err) { toast.error(getErrorMessage(err)) }
    finally { setLoading(false) }
  }

  const handleSettle = async (s) => {
    if (!confirm(`Record settlement: ${s.from_name} pays ${s.to_name} ${formatCurrency(s.amount)}?`)) return
    try {
      await settle(id, {
        group: parseInt(id),
        payer_member: s.from_member,
        receiver_member: s.to_member,
        amount: s.amount,
      })
      toast.success('Settlement recorded')
      fetchBalances(id)
    } catch (err) { toast.error(getErrorMessage(err)) }
  }

  if (!currentGroup) return <div className="text-muted-foreground p-4">Loading...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/splits')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">{currentGroup.name}</h2>
          <p className="text-sm text-muted-foreground">{currentGroup.members?.length} members</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setMemberModal(true)}>
            <UserPlus className="h-4 w-4 mr-2" />Add Member
          </Button>
          <Button size="sm" onClick={() => setExpenseModal(true)}>
            <Plus className="h-4 w-4 mr-2" />Add Expense
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Expenses */}
        <Card>
          <CardHeader><CardTitle className="text-base">Expenses</CardTitle></CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expenses yet</p>
            ) : (
              <div className="space-y-2">
                {expenses.map((exp) => (
                  <div key={exp.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{exp.description}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(exp.date)} · paid by {exp.paid_by_name}</p>
                    </div>
                    <span className="font-semibold text-sm">{formatCurrency(exp.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Balances */}
        <BalanceSheet balances={balances} onSettle={handleSettle} />
      </div>

      {/* Add Expense Modal */}
      <Dialog open={expenseModal} onOpenChange={(v) => !v && setExpenseModal(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
          <form onSubmit={handleAddExpense} className="space-y-4">
            <div className="space-y-1">
              <Label>Description</Label>
              <Input value={expForm.description} onChange={(e) => setExpForm((f) => ({ ...f, description: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>Amount</Label>
              <Input type="number" step="0.01" value={expForm.amount} onChange={(e) => setExpForm((f) => ({ ...f, amount: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>Date</Label>
              <Input type="date" value={expForm.date} onChange={(e) => setExpForm((f) => ({ ...f, date: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>Split Type</Label>
              <Select value={expForm.split_type} onValueChange={(v) => setExpForm((f) => ({ ...f, split_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="equal">Equal</SelectItem>
                  <SelectItem value="exact">Exact</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setExpenseModal(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Adding...' : 'Add'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Member Modal */}
      <Dialog open={memberModal} onOpenChange={(v) => !v && setMemberModal(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Member</DialogTitle></DialogHeader>
          <form onSubmit={handleAddMember} className="space-y-4">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={memberForm.name} onChange={(e) => setMemberForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>Email (optional)</Label>
              <Input type="email" value={memberForm.email} onChange={(e) => setMemberForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setMemberModal(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Adding...' : 'Add'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
