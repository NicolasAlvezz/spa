'use client'

import { useEffect, useRef } from 'react'

interface Props {
  onScan: (value: string) => void
  onCameraError: () => void
  active: boolean
}

export function QrScanner({ onScan, onCameraError, active }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!active || !videoRef.current) return

    let stopped = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const readerHolder: { reader: any } = { reader: null }

    async function start() {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/library')
        if (stopped || !videoRef.current) return

        const reader = new BrowserMultiFormatReader()
        readerHolder.reader = reader

        reader.decodeFromVideoDevice(
          null,
          videoRef.current,
          (result) => {
            if (result && !stopped) {
              stopped = true
              readerHolder.reader?.reset()
              onScan(result.getText())
            }
          }
        )
      } catch {
        if (!stopped) onCameraError()
      }
    }

    start()

    return () => {
      stopped = true
      readerHolder.reader?.reset()
    }
  }, [active, onScan, onCameraError])

  return (
    <div className="relative w-full h-full bg-black">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        muted
        playsInline
      />

      {/* Viewfinder overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {/* Dark border around the frame */}
        <div className="absolute inset-0 bg-black/40" />
        {/* Clear window */}
        <div className="relative z-10 w-60 h-60 [box-shadow:0_0_0_9999px_rgba(0,0,0,0.40)]">
          {/* Corner brackets */}
          <span className="absolute top-0 left-0 w-9 h-9 border-t-[3px] border-l-[3px] border-white rounded-tl" />
          <span className="absolute top-0 right-0 w-9 h-9 border-t-[3px] border-r-[3px] border-white rounded-tr" />
          <span className="absolute bottom-0 left-0 w-9 h-9 border-b-[3px] border-l-[3px] border-white rounded-bl" />
          <span className="absolute bottom-0 right-0 w-9 h-9 border-b-[3px] border-r-[3px] border-white rounded-br" />
        </div>
      </div>
    </div>
  )
}
