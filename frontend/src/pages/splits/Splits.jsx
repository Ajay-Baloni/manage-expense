import { useEffect, useState } from 'react'
import { Plus, Users } from 'lucide-react'
import { useSplitStore } from '../../store/splitStore'
import { SplitGroupCard } from '../../components/SplitGroupCard'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { getErrorMessage } from '../../lib/utils'
import toast from 'react-hot-toast'

export default function Splits() {
  const { groups, fetchGroups, createGroup } = useSplitStore()
  const [modal, setModal] = useState(false)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchGroups() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await createGroup({ name })
      toast.success('Group created')
      setModal(false)
      setName('')
    } catch (err) { toast.error(getErrorMessage(err)) }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Split Expenses"
        description="Share costs and settle up with friends and groups."
      >
        <Button size="sm" className="h-9" onClick={() => setModal(true)}>
          <Plus className="h-4 w-4 mr-1.5" />New Group
        </Button>
      </PageHeader>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
            <Users className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-base font-medium text-foreground">No split groups yet</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            Create a group to start splitting expenses and tracking who owes what.
          </p>
          <Button size="sm" className="h-9 mt-4" onClick={() => setModal(true)}>
            <Plus className="h-4 w-4 mr-1.5" />Create your first group
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => <SplitGroupCard key={g.id} group={g} />)}
        </div>
      )}

      <Dialog open={modal} onOpenChange={(v) => !v && setModal(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New Split Group</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1">
              <Label>Group Name</Label>
              <Input placeholder="e.g. Trip to Vegas" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModal(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
