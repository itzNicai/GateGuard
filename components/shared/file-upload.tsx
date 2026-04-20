'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Upload, X, FileImage } from 'lucide-react'

interface SingleFileUploadProps {
  multiple?: false
  onFileSelect: (file: File | null) => void
  onFilesSelect?: never
  maxFiles?: never
  accept?: string
  maxSizeMB?: number
  label?: string
}

interface MultiFileUploadProps {
  multiple: true
  onFilesSelect: (files: File[]) => void
  onFileSelect?: never
  maxFiles?: number
  accept?: string
  maxSizeMB?: number
  label?: string
}

type FileUploadProps = SingleFileUploadProps | MultiFileUploadProps

export function FileUpload(props: FileUploadProps) {
  const { accept = 'image/*', maxSizeMB = 5, label = 'Upload Valid ID / Proof of Residency' } = props

  if (props.multiple) {
    return <MultiUpload {...props} accept={accept} maxSizeMB={maxSizeMB} label={label} />
  }
  return <SingleUpload {...props} accept={accept} maxSizeMB={maxSizeMB} label={label} />
}

/* ── Single file mode (existing behavior) ── */
function SingleUpload({ onFileSelect, accept, maxSizeMB, label }: SingleFileUploadProps & { accept: string; maxSizeMB: number; label: string }) {
  const [preview, setPreview] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setError(null)

    if (!file) {
      setPreview(null)
      setFileName(null)
      onFileSelect(null)
      return
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File must be under ${maxSizeMB}MB`)
      return
    }

    setFileName(file.name)
    onFileSelect(file)

    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (ev) => setPreview(ev.target?.result as string)
      reader.readAsDataURL(file)
    } else {
      setPreview(null)
    }
  }

  function handleClear() {
    setPreview(null)
    setFileName(null)
    setError(null)
    onFileSelect(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-2">
      <Input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />
      {!fileName ? (
        <Button
          type="button"
          variant="outline"
          className="w-full h-24 border-dashed flex flex-col gap-1"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-5 w-5" />
          <span className="text-sm">{label}</span>
        </Button>
      ) : (
        <div className="border rounded-md p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm truncate">
              <FileImage className="h-4 w-4 shrink-0" />
              <span className="truncate">{fileName}</span>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          {preview && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={preview} alt="Preview" className="w-full max-h-48 object-contain rounded" />
          )}
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

/* ── Multi file mode ── */
function MultiUpload({ onFilesSelect, maxFiles = 5, accept, maxSizeMB, label }: MultiFileUploadProps & { accept: string; maxSizeMB: number; label: string }) {
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    setError(null)

    if (inputRef.current) inputRef.current.value = ''

    const remaining = maxFiles - files.length
    if (remaining <= 0) return

    const toAdd: File[] = []
    for (const file of selected.slice(0, remaining)) {
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`"${file.name}" exceeds ${maxSizeMB}MB and was skipped`)
        continue
      }
      toAdd.push(file)
    }

    if (selected.length > remaining) {
      setError(`Only ${remaining} more photo${remaining === 1 ? '' : 's'} allowed — some were skipped`)
    }

    if (toAdd.length === 0) return

    const nextFiles = [...files, ...toAdd]
    setFiles(nextFiles)
    onFilesSelect(nextFiles)

    // Generate previews for new files (preserve order)
    const startIndex = files.length
    for (let idx = 0; idx < toAdd.length; idx++) {
      const file = toAdd[idx]
      if (file.type.startsWith('image/')) {
        const position = startIndex + idx
        const reader = new FileReader()
        reader.onload = (ev) => {
          setPreviews((prev) => {
            const next = [...prev]
            next[position] = ev.target?.result as string
            return next
          })
        }
        reader.readAsDataURL(file)
      }
    }
  }

  function handleRemove(index: number) {
    const nextFiles = files.filter((_, i) => i !== index)
    const nextPreviews = previews.filter((_, i) => i !== index)
    setFiles(nextFiles)
    setPreviews(nextPreviews)
    onFilesSelect(nextFiles)
    setError(null)
  }

  return (
    <div className="space-y-2">
      <Input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        onChange={handleChange}
        className="hidden"
      />

      {/* Thumbnail grid */}
      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {previews.map((src, i) => (
            <div key={i} className="relative group rounded-lg overflow-hidden border bg-muted/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Photo ${i + 1}`} className="w-full h-20 object-cover" />
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button — visible until maxFiles reached */}
      {files.length < maxFiles && (
        <Button
          type="button"
          variant="outline"
          className="w-full h-16 border-dashed flex flex-col gap-0.5"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4" />
          <span className="text-xs">{label}</span>
        </Button>
      )}

      {/* Counter */}
      <p className="text-[11px] text-muted-foreground text-center">
        {files.length} / {maxFiles} photos
      </p>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
