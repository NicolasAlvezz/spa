'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import ReactSignatureCanvas from 'react-signature-canvas'

interface Props {
  label: string
  clearLabel: string
  onSignature: (dataUrl: string | null) => void
}

export function SignaturePad({ label, clearLabel, onSignature }: Props) {
  const padRef = useRef<ReactSignatureCanvas>(null)
  const [isEmpty, setIsEmpty] = useState(true)
  const isDrawingRef = useRef(false)

  const captureSignature = useCallback(() => {
    if (!isDrawingRef.current || !padRef.current) return
    isDrawingRef.current = false
    setIsEmpty(false)
    // getTrimmedCanvas() relies on trim-canvas which doesn't bundle correctly
    // in Next.js production builds — use getCanvas() directly instead.
    onSignature(padRef.current.getCanvas().toDataURL('image/png'))
  }, [onSignature])

  useEffect(() => {
    // Listen on document so iOS Safari always catches the finger-lift event,
    // even when the canvas's own onEnd doesn't fire.
    document.addEventListener('pointerup', captureSignature)
    document.addEventListener('touchend', captureSignature)
    return () => {
      document.removeEventListener('pointerup', captureSignature)
      document.removeEventListener('touchend', captureSignature)
    }
  }, [captureSignature])

  function handleClear() {
    padRef.current?.clear()
    isDrawingRef.current = false
    setIsEmpty(true)
    onSignature(null)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">{label}</p>
        <button
          type="button"
          onClick={handleClear}
          disabled={isEmpty}
          className="text-xs text-gray-400 hover:text-gray-600 underline disabled:opacity-30 disabled:cursor-default"
        >
          {clearLabel}
        </button>
      </div>

      <div className="relative border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-white">
        <ReactSignatureCanvas
          ref={padRef}
          onBegin={() => { isDrawingRef.current = true }}
          canvasProps={{
            width: 600,
            height: 180,
            style: { width: '100%', height: '160px', display: 'block', touchAction: 'none' },
          }}
          backgroundColor="rgb(255, 255, 255)"
          penColor="rgb(15, 23, 42)"
        />
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <p className="text-2xl text-gray-200">✍</p>
          </div>
        )}
      </div>
    </div>
  )
}
