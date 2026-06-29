'use client'

import { useRef, useState } from 'react'
import ReactSignatureCanvas from 'react-signature-canvas'

interface Props {
  label: string
  clearLabel: string
  onSignature: (dataUrl: string | null) => void
}

export function SignaturePad({ label, clearLabel, onSignature }: Props) {
  const padRef = useRef<ReactSignatureCanvas>(null)
  const [isEmpty, setIsEmpty] = useState(true)

  function handleEnd() {
    if (padRef.current && !padRef.current.isEmpty()) {
      setIsEmpty(false)
      onSignature(padRef.current.getTrimmedCanvas().toDataURL('image/png'))
    }
  }

  function handleClear() {
    padRef.current?.clear()
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
          onEnd={handleEnd}
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
