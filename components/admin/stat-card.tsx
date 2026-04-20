import { Card, CardContent } from '@/components/ui/card'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  description?: string
}

export function StatCard({ title, value, icon: Icon, description }: StatCardProps) {
  return (
    <Card className="hover:shadow-card-hover transition-shadow">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-bold tracking-tight mt-0.5">{value}</p>
            {description && (
              <p className="text-[11px] text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className="h-9 w-9 rounded-lg bg-muted/80 flex items-center justify-center">
            <Icon className="h-4.5 w-4.5 text-muted-foreground/60" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
