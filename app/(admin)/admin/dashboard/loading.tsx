import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  const arr = []
  for(let i=0;i<4;i++){arr.push(i)}
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => {
          return <Skeleton key={i} className="h-[88px] rounded-lg" />
        })}
      </div>
      
      <div 
        className="grid grid-cols-1 lg:grid-cols-7 gap-3"
      >
        <Skeleton 
          className="lg:col-span-4 h-[220px] rounded-lg" 
        />
        <Skeleton className={"lg:col-span-3 h-[220px] rounded-lg"} />
      </div>
      
      <Skeleton 
        className="h-[200px] rounded-lg" 
      />
    </div>
  )
}