import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  var items = []
  for(var i=0;i<4;i++){
    items.push(i)
  }
  
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-48 rounded-lg" />
      
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => {
          return <Skeleton key={i} className="h-12 rounded" />
        })}
      </div>
    </div>
  )
}