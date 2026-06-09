import { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Plus } from 'lucide-react'
import { fetchGroups, createGroup } from '../../store/splitsSlice'
import { SplitGroupCard } from '../../components/SplitGroupCard'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { getErrorMessage } from '../../lib/utils'
import toast from 'react-hot-toast'

export default function Splits() {
  const dispatch = useDispatch()
  const groups = useSelector((s) => s.splits.groups)
  const [modal, setModal] = useState(false)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { dispatch(fetchGroups()) }, [dispatch])

  const handleCreate = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await dispatch(createGroup({ name })).unwrap()
      toast.success('Group created')
      setModal(false)
      setName('')
    } catch (err) { toast.error(getErrorMessage(err)) }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-muted-foreground text-sm">{groups.length} group{groups.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={() => setModal(true)}>
          <Plus className="h-4 w-4 mr-2" />New Group
        </Button>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">No split groups yet</p>
          <p className="text-sm">Create a group to start splitting expenses with friends</p>
        </div>
      ) : (
        <div className="grid gap-3">
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
