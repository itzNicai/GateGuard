'use client'

import { useState, useEffect } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const chartConfig = {
  visitors: {
    label: 'Visitors',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig

interface DayData {
  date: string
  visitors: number
}

export function VisitorActivityChart() {
  const [period, setPeriod] = useState<7 | 30>(7)
  const [data, setData] = useState<DayData[] | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const since = new Date()
      since.setDate(since.getDate() - period)

      const { data: visitors } = await supabase
        .from('visitors')
        .select('created_at')
        .gte('created_at', since.toISOString())

      if (!visitors) { setData([]); return }

      const counts: Record<string, number> = {}
      for (let i = 0; i < period; i++) {
        const d = new Date()
        d.setDate(d.getDate() - (period - 1 - i))
        counts[d.toISOString().split('T')[0]] = 0
      }
      visitors.forEach((v) => {
        const day = v.created_at.split('T')[0]
        if (counts[day] !== undefined) counts[day]++
      })

      setData(
        Object.entries(counts).map(([date, visitors]) => ({
          date,
          visitors,
        }))
      )
    }
    load()
  }, [period])

  if (!data) return <Skeleton className="h-[200px] rounded-lg" />

  return (
    <Card className="rounded-xl ring-1 ring-foreground/[0.06] shadow-card border-0">
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="text-[12px] font-semibold">Visitor Activity</CardTitle>
        <div className="flex gap-1">
          {([7, 30] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors',
                period === p
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {p}d
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[160px] w-full">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="fillVisitors" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.3} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              fontSize={10}
              tickMargin={8}
              tickFormatter={(v: string) => {
                const d = new Date(v + 'T00:00:00')
                return d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
              }}
              interval={period === 7 ? 0 : 'preserveStartEnd'}
            />
            <YAxis tickLine={false} axisLine={false} fontSize={10} tickMargin={4} allowDecimals={false} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(v) => {
                    return new Date(String(v) + 'T00:00:00').toLocaleDateString('en', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })
                  }}
                />
              }
            />
            <Area
              dataKey="visitors"
              type="monotone"
              fill="url(#fillVisitors)"
              stroke="var(--chart-1)"
              strokeWidth={2}
              animationDuration={800}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
