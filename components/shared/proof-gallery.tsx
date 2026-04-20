'use client'

interface ProofGalleryProps {
  urls: string[]
  onImageClick: (index: number) => void
}

export function ProofGallery({ urls, onImageClick }: ProofGalleryProps) {
  if (urls.length === 0) return null

  return (
    <div className="grid grid-cols-3 gap-1.5">
      {urls.map((url, i) => (
        <button
          key={i}
          onClick={() => onImageClick(i)}
          className="relative group rounded-lg overflow-hidden border bg-muted/20 aspect-square"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={`Proof ${i + 1}`}
            className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
          />
          {i === 0 && urls.length > 1 && (
            <span className="absolute top-1 right-1 h-4 min-w-4 px-1 rounded-full bg-black/60 text-white text-[9px] font-medium flex items-center justify-center">
              {urls.length}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

/* Small inline button for table cells — shows first thumbnail with count badge */
export function ProofThumbnail({ urls, onClick }: { urls: string[]; onClick: () => void }) {
  if (urls.length === 0) {
    return <span className="text-muted-foreground/40 text-[12px]">—</span>
  }

  return (
    <button
      onClick={onClick}
      className="relative inline-flex items-center justify-center h-7 w-7 rounded-md overflow-hidden border bg-muted/20 hover:opacity-80 transition-opacity"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={urls[0]} alt="Proof" className="w-full h-full object-cover" />
      {urls.length > 1 && (
        <span className="absolute -top-0.5 -right-0.5 h-3.5 min-w-3.5 px-0.5 rounded-full bg-primary text-white text-[8px] font-bold flex items-center justify-center">
          {urls.length}
        </span>
      )}
    </button>
  )
}
