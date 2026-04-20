'use client'

import { useEffect, useState } from 'react'
import { Pie, PieChart, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/client'

const chartConfig = {
  approved: { label: 'Approved', color: 'var(--chart-2)' },
  pending: { label: 'Pending', color: 'var(--chart-3)' },
  denied: { label: 'Denied', color: 'var(--chart-4)' },
} satisfies ChartConfig

const COLORS = ['var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)']

interface StatusData {
  status: string
  count: number
}

export function VisitorStatusChart() {
  const [data, setData] = useState<StatusData[] | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [approved, pending, denied] = await Promise.all([
        supabase.from('visitors').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('visitors').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('visitors').select('id', { count: 'exact', head: true }).eq('status', 'denied'),
      ])

      setData([
        { status: 'approved', count: approved.count ?? 0 },
        { status: 'pending', count: pending.count ?? 0 },
        { status: 'denied', count: denied.count ?? 0 },
      ])
    }
    load()
  }, [])

  const total = data?.reduce((s, d) => s + d.count, 0) ?? 0

  if (!data) return <Skeleton className="h-[200px] rounded-lg" />

  return (
    <Card className="rounded-xl ring-1 ring-foreground/[0.06] shadow-card border-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-[12px] font-semibold">Visitor Status</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[160px] w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent />} />
            <Pie
              data={data}
              dataKey="count"
              nameKey="status"
              cx="50%"
              cy="50%"
              innerRadius={42}
              outerRadius={65}
              strokeWidth={2}
              stroke="var(--background)"
              animationDuration={800}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i]} />
              ))}
            </Pie>
            <text
              x="50%"
              y="48%"
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-foreground"
              style={{ fontSize: 18, fontWeight: 700 }}
            >
              {total}
            </text>
            <text
              x="50%"
              y="60%"
              textAnchor="middle"
              className="fill-muted-foreground"
              style={{ fontSize: 11 }}
            >
              Total
            </text>
          </PieChart>
        </ChartContainer>
        <div className="flex justify-center gap-4 mt-1">
          {data.map((d, i) => (
            <div key={d.status} className="flex items-center gap-1.5 text-[11px]">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i] }} />
              <span className="text-muted-foreground capitalize">{d.status}</span>
              <span className="font-semibold">{d.count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
