'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Camera, Keyboard, X } from 'lucide-react'

interface QRScannerProps {
  onScan: (code: string) => void
  onClose: () => void
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  const scannedRef = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [manualMode, setManualMode] = useState(false)
  const [manualCode, setManualCode] = useState('')

  useEffect(() => {
    if (manualMode) return

    let active = true

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        })

        if (!active) { stream.getTracks().forEach((t) => t.stop()); return }

        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }

        // Start scanning loop after video is ready
        if (videoRef.current) {
          videoRef.current.onloadeddata = () => { if (active) scanLoop() }
        }
      } catch (err) {
        if (!active) return
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes('NotAllowed') || msg.includes('Permission')) {
          setError('Camera permission denied. Please allow camera access.')
        } else if (msg.includes('NotFound')) {
          setError('No camera found on this device.')
        } else {
          setError('Unable to access camera: ' + msg)
        }
      }
    }

    function scanLoop() {
      if (!active || scannedRef.current) return

      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(scanLoop)
        return
      }

      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) { rafRef.current = requestAnimationFrame(scanLoop); return }

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      // Dynamic import to avoid SSR issues
      import('jsqr').then((jsQR) => {
        if (!active || scannedRef.current) return
        const code = jsQR.default(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' })
        if (code?.data) {
          scannedRef.current = true
          stopCamera()
          onScan(code.data)
        } else {
          rafRef.current = requestAnimationFrame(scanLoop)
        }
      }).catch(() => {
        if (active) rafRef.current = requestAnimationFrame(scanLoop)
      })
    }

    function stopCamera() {
      cancelAnimationFrame(rafRef.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }

    startCamera()

    return () => {
      active = false
      stopCamera()
    }
  }, [onScan, manualMode])

  function handleManualSubmit() {
    const code = manualCode.trim()
    if (!code) return
    onScan(code)
  }

  function handleClose() {
    // Stop camera before closing
    cancelAnimationFrame(rafRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    onClose()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">
          {manualMode ? 'Enter QR Code' : 'Scanning QR Code...'}
        </h2>
        <Button variant="ghost" size="sm" onClick={handleClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {manualMode ? (
        <div className="space-y-3 py-4">
          <p className="text-xs text-muted-foreground">
            Type or paste the QR code value from the visitor&apos;s pass.
          </p>
          <Input
            placeholder="Paste QR code value..."
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
            autoFocus
          />
          <div className="flex gap-2">
            <Button onClick={handleManualSubmit} disabled={!manualCode.trim()} className="flex-1">
              Submit
            </Button>
            <Button variant="outline" onClick={() => { setManualMode(false); setManualCode('') }}>
              <Camera className="mr-1.5 h-3.5 w-3.5" /> Camera
            </Button>
          </div>
        </div>
      ) : (
        <>
          {error ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Camera className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-destructive max-w-xs">{error}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setError(null)}>
                  Try Again
                </Button>
                <Button variant="ghost" size="sm" onClick={handleClose}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="relative w-full max-w-md mx-auto rounded-lg overflow-hidden bg-black aspect-[4/3]">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                {/* Scan overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-2 border-white/50 rounded-lg" />
                </div>
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Point the camera at the visitor&apos;s QR code
              </p>
            </>
          )}

          <button
            onClick={() => { setManualMode(true); setError(null) }}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            <Keyboard className="h-3.5 w-3.5" />
            Enter code manually
          </button>
        </>
      )}
    </div>
  )
}
