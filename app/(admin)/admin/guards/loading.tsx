import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#3d3229]">
      <header className="border-b border-[#d4c5b0]/20 bg-[#3d3229]/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#d4c5b0]/20 backdrop-blur-md border border-[#e8dcc8]/30 rounded-xl flex items-center justify-center">
              <div className="w-5 h-5 bg-[#f5e6d3]/30 rounded-md" />
            </div>
            <div className="flex flex-col">
              <div className="h-4 w-24 bg-[#f5e6d3]/20 rounded" />
              <div className="h-3 w-32 bg-[#d4c5b0]/20 rounded mt-1" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-24 rounded-full bg-[#4a3f35] border border-[#d4c5b0]/20" />
            <Skeleton className="h-10 w-28 rounded-full bg-[#c9a962]" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="text-center mb-8 space-y-3">
          <Skeleton className="h-8 w-48 mx-auto rounded-lg bg-[#4a3f35]" />
          <Skeleton className="h-4 w-64 mx-auto rounded bg-[#4a3f35]/60" />
        </div>

        <div className="grid grid-cols-2 gap-3 max-w-2xl mx-auto">
          <Skeleton className="h-[100px] rounded-xl bg-[#4a3f35]/60 border border-[#d4c5b0]/10" />
          <Skeleton className="h-[100px] rounded-xl bg-[#4a3f35]/60 border border-[#d4c5b0]/10" />
          <Skeleton className="h-[100px] rounded-xl bg-[#4a3f35]/60 border border-[#d4c5b0]/10" />
          <Skeleton className="h-[100px] rounded-xl bg-[#4a3f35]/60 border border-[#d4c5b0]/10" />
        </div>

        <div className="space-y-3 max-w-2xl mx-auto pt-4">
          <Skeleton className="h-4 w-32 rounded bg-[#4a3f35]/40" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-[#4a3f35]/40 border border-[#d4c5b0]/10">
                <Skeleton className="h-10 w-10 rounded-full bg-[#c9a962]/20 shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3 rounded bg-[#4a3f35]/60" />
                  <Skeleton className="h-3 w-1/2 rounded bg-[#4a3f35]/40" />
                </div>
                <Skeleton className="h-8 w-20 rounded-md bg-[#4a3f35]/60 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}