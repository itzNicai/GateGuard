import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  var arr = []
  for(let i=0;i<6;i++){arr.push(i)}
  
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-48 rounded-lg" />
      
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => {
          return <Skeleton key={i} className="h-10 rounded" />
        })}
      </div>
    </div>
  )
}