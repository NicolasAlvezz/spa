'use client'
import { useState, useRef, useEffect } from 'react'
import { Info } from 'lucide-react'

interface Props {
  title: string
  description: string
}

export function InfoPopover({ title, description }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [open])

  return (
    <div ref={ref} className="relative inline-flex flex-shrink-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-4 h-4 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
        aria-label="More information"
      >
        <Info size={10} className="text-gray-400" />
      </button>
      {open && (
        <div className="absolute z-50 top-6 right-0 w-64 bg-white border border-gray-200 rounded-xl shadow-lg p-4">
          <p className="text-xs font-semibold text-gray-900 mb-1.5">{title}</p>
          <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
        </div>
      )}
    </div>
  )
}
