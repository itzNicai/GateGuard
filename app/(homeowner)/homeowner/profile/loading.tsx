import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-[200px] rounded-lg" />
      <Skeleton className="h-[180px] rounded-lg" />
    </div>
  )
}
