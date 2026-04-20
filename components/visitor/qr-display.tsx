'use client'

import { useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Clock, Download } from 'lucide-react'

interface QRDisplayProps {
  qrCode: string
  visitorName: string
  homeownerName: string
  expiresAt: string
  onReset: () => void
}

export function QRDisplay({ qrCode, visitorName, homeownerName, expiresAt, onReset }: QRDisplayProps) {
  const downloadRef = useRef<HTMLDivElement>(null)
  const qrCanvasRef = useRef<HTMLDivElement>(null)
  const expiryDate = new Date(expiresAt)

  function handleDownload() {
    const qrCanvas = qrCanvasRef.current?.querySelector('canvas')
    if (!qrCanvas) return

    // Create a styled canvas for download
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const padding = 40
    const qrSize = 240
    const width = qrSize + padding * 2
    const infoHeight = 140
    const height = padding + qrSize + infoHeight + padding

    canvas.width = width
    canvas.height = height

    // Background
    ctx.fillStyle = '#ffffff'
    ctx.roundRect(0, 0, width, height, 16)
    ctx.fill()

    // Header bar
    ctx.fillStyle = '#1B3A5C'
    ctx.roundRect(0, 0, width, 44, [16, 16, 0, 0])
    ctx.fill()

    // Header text
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 14px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('GateGuard — Visitor Pass', width / 2, 28)

    // QR code
    const qrX = (width - qrSize) / 2
    const qrY = 56
    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize)

    // Visitor name
    const textY = qrY + qrSize + 24
    ctx.fillStyle = '#171717'
    ctx.font = 'bold 16px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(visitorName, width / 2, textY)

    // Visiting label
    ctx.fillStyle = '#737373'
    ctx.font = '12px Inter, system-ui, sans-serif'
    ctx.fillText(`Visiting: ${homeownerName}`, width / 2, textY + 22)

    // Divider line
    ctx.strokeStyle = '#e5e5e5'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(padding, textY + 36)
    ctx.lineTo(width - padding, textY + 36)
    ctx.stroke()

    // Expiry
    ctx.fillStyle = '#737373'
    ctx.font = '11px Inter, system-ui, sans-serif'
    ctx.fillText(
      `Valid until: ${expiryDate.toLocaleString('en', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
      width / 2,
      textY + 54
    )

    // One-time use notice
    ctx.fillStyle = '#C8A951'
    ctx.font = 'bold 10px Inter, system-ui, sans-serif'
    ctx.fillText('ONE-TIME USE ONLY', width / 2, textY + 72)

    // Download
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `gateguard-pass-${visitorName.replace(/\s+/g, '-').toLowerCase()}.png`
    a.click()
  }

  return (
    <div className="space-y-4 text-center animate-fade-in-scale" ref={downloadRef}>
      <div className="space-y-1">
        <h2 className="text-base font-semibold">Your QR Code</h2>
        <p className="text-xs text-muted-foreground">
          Show this to the guard at the gate.
        </p>
      </div>

      <div className="inline-block mx-auto shadow-card-hover rounded-xl overflow-hidden">
        {/* Header */}
        <div className="bg-primary px-4 py-2.5">
          <p className="text-[11px] font-semibold text-white tracking-wide">GateGuard — Visitor Pass</p>
        </div>
        {/* QR */}
        <div className="bg-white px-6 pt-5 pb-3">
          <div ref={qrCanvasRef} className="mx-auto w-fit">
            <QRCodeCanvas
              value={qrCode}
              size={200}
              level="H"
              marginSize={2}
              imageSettings={{
                src: '/logo.png',
                width: 44,
                height: 44,
                excavate: true,
              }}
            />
          </div>
        </div>
        {/* Info */}
        <div className="bg-white px-5 pb-4 space-y-1">
          <p className="font-semibold text-sm">{visitorName}</p>
          <p className="text-[11px] text-muted-foreground">Visiting: {homeownerName}</p>
          <div className="border-t border-border/40 pt-2 mt-2 space-y-1">
            <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
              <Clock className="h-3 w-3" />
              Valid until {expiryDate.toLocaleString('en', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-[9px] font-semibold text-secondary tracking-wider uppercase">One-time use only</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <Button onClick={handleDownload} className="gap-2">
          <Download className="h-4 w-4" />
          Download QR Pass
        </Button>
        <Button variant="outline" size="sm" onClick={onReset}>
          Register Another Visit
        </Button>
      </div>
    </div>
  )
}
