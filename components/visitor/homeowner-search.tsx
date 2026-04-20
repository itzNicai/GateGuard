'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Search, MapPin } from 'lucide-react'

interface HomeownerOption {
  id: string
  full_name: string
  block: string | null
  lot: string | null
}

interface HomeownerSearchProps {
  onSelect: (homeowner: HomeownerOption | null) => void
  selected: HomeownerOption | null
}

export function HomeownerSearch({ onSelect, selected }: HomeownerSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<HomeownerOption[]>([])
  const [showResults, setShowResults] = useState(false)
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (query.length < 1) {
      setResults([])
      setShowResults(false)
      return
    }

    // Abort previous in-flight request
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/homeowners/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        )
        if (res.ok) {
          const data = await res.json()
          setResults(data)
          setShowResults(true)
        }
      } catch {
        // aborted — ignore
      } finally {
        setLoading(false)
      }
    }, 80)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  if (selected) {
    return (
      <div className="flex items-center justify-between border rounded-md p-3">
        <div>
          <p className="font-medium text-sm">{selected.full_name}</p>
          {selected.block && selected.lot && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {selected.block}, {selected.lot}
            </p>
          )}
        </div>
        <button
          type="button"
          className="text-xs text-primary hover:underline font-medium"
          onClick={() => { onSelect(null); setQuery('') }}
        >
          Change
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search homeowner by name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          className="pl-10"
        />
      </div>
      {showResults && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 max-h-52 overflow-auto rounded-lg border bg-card shadow-lg ring-1 ring-foreground/[0.06]">
          {results.map((ho) => (
            <button
              key={ho.id}
              type="button"
              className="w-full text-left px-3.5 py-2.5 hover:bg-muted transition-colors border-b border-border/40 last:border-b-0"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onSelect(ho); setShowResults(false); setQuery('') }}
            >
              <p className="font-medium text-sm">{ho.full_name}</p>
              {ho.block && ho.lot && (
                <p className="text-[11px] text-muted-foreground">{ho.block}, {ho.lot}</p>
              )}
            </button>
          ))}
        </div>
      )}
      {showResults && query.length >= 1 && results.length === 0 && !loading && (
        <div className="absolute z-50 w-full mt-1 p-4 rounded-lg border bg-card shadow-lg ring-1 ring-foreground/[0.06]">
          <p className="text-xs text-muted-foreground text-center">No homeowners found.</p>
        </div>
      )}
    </div>
  )
}
