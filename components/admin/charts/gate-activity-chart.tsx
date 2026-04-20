'use client'

import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/client'

const chartConfig = {
  entries: {
    label: 'Gate Entries',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig

interface DayData {
  date: string
  entries: number
}

export function GateActivityChart() {
  const [data, setData] = useState<DayData[] | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const since = new Date()
      since.setDate(since.getDate() - 14)

      const { data: logs } = await supabase
        .from('visit_logs')
        .select('entry_time')
        .not('entry_time', 'is', null)
        .gte('entry_time', since.toISOString())

      if (!logs) { setData([]); return }

      const counts: Record<string, number> = {}
      for (let i = 0; i < 14; i++) {
        const d = new Date()
        d.setDate(d.getDate() - (13 - i))
        counts[d.toISOString().split('T')[0]] = 0
      }
      logs.forEach((l) => {
        if (!l.entry_time) return
        const day = l.entry_time.split('T')[0]
        if (counts[day] !== undefined) counts[day]++
      })

      setData(
        Object.entries(counts).map(([date, entries]) => ({
          date,
          entries,
        }))
      )
    }
    load()
  }, [])

  if (!data) return <Skeleton className="h-[180px] rounded-lg" />

  return (
    <Card className="rounded-xl ring-1 ring-foreground/[0.06] shadow-card border-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-[12px] font-semibold">Gate Activity</CardTitle>
        <CardDescription className="text-[10px]">Entries over the last 14 days</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[140px] w-full">
          <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
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
              interval="preserveStartEnd"
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
            <Bar
              dataKey="entries"
              fill="var(--chart-2)"
              radius={[3, 3, 0, 0]}
              animationDuration={800}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
