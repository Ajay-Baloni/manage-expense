import { useNavigate } from 'react-router-dom'
import { Users, ChevronRight } from 'lucide-react'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'

export function SplitGroupCard({ group }) {
  const navigate = useNavigate()

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/splits/${group.id}`)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{group.name}</p>
            <p className="text-sm text-muted-foreground">
              {group.members?.length || 0} members · {group.expense_count || 0} expenses
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        </div>
      </CardContent>
    </Card>
  )
}
