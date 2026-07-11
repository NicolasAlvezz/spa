'use client'

import QRCode from 'react-qr-code'
import { Smartphone } from 'lucide-react'

export function LoginQrCard() {
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin}/login`

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
        <Smartphone size={14} className="text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-700">Client app access</h2>
      </div>

      <div className="flex flex-col items-center justify-center gap-4 py-8 px-5 flex-1">
        <div className="p-4 bg-white border-2 border-gray-900 rounded-2xl">
          <QRCode
            value={loginUrl}
            size={180}
            bgColor="#ffffff"
            fgColor="#0f172a"
          />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-800">Scan to open the app</p>
          <p className="text-xs text-gray-400 mt-1 break-all">{loginUrl}</p>
        </div>
      </div>
    </div>
  )
}
