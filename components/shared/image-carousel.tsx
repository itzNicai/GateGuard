'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface ImageCarouselProps {
  urls: string[]
  initialIndex?: number
  open: boolean
  onClose: () => void
}

export function ImageCarousel({ urls, initialIndex = 0, open, onClose }: ImageCarouselProps) {
  if (urls.length === 0) return null

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-3xl p-0 bg-black/95 border-0 [&>button]:bg-white [&>button]:text-black [&>button]:hover:bg-white/80 [&>button]:rounded-full [&>button]:h-8 [&>button]:w-8">
        {/* Key forces fresh mount on each open, resetting to initialIndex */}
        {open && <CarouselInner urls={urls} initialIndex={initialIndex} />}
      </DialogContent>
    </Dialog>
  )
}

function CarouselInner({ urls, initialIndex }: { urls: string[]; initialIndex: number }) {
  const [current, setCurrent] = useState(initialIndex)

  const goNext = useCallback(() => {
    setCurrent((c) => (c + 1) % urls.length)
  }, [urls.length])

  const goPrev = useCallback(() => {
    setCurrent((c) => (c - 1 + urls.length) % urls.length)
  }, [urls.length])

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') goNext()
      else if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [goNext, goPrev])

  // Touch/swipe support
  const [touchStart, setTouchStart] = useState<number | null>(null)

  function handleTouchStart(e: React.TouchEvent) {
    setTouchStart(e.touches[0].clientX)
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStart === null) return
    const diff = e.changedTouches[0].clientX - touchStart
    if (Math.abs(diff) > 50) {
      if (diff > 0) goPrev()
      else goNext()
    }
    setTouchStart(null)
  }

  return (
    <>
      <DialogHeader className="sr-only">
        <DialogTitle>Proof Photos</DialogTitle>
      </DialogHeader>

      <div
        className="relative flex items-center justify-center min-h-[50vh] p-4 select-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Left arrow */}
        {urls.length > 1 && (
          <button
            onClick={goPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center text-white transition-colors z-10"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        {/* Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={urls[current]}
          alt={`Proof ${current + 1}`}
          className="max-w-full max-h-[80vh] object-contain rounded-lg"
        />

        {/* Right arrow */}
        {urls.length > 1 && (
          <button
            onClick={goNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center text-white transition-colors z-10"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Dot indicators */}
      {urls.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 pb-4">
          {urls.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === current ? 'w-4 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      )}
    </>
  )
}
