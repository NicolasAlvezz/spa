'use client'

import QRCode from 'react-qr-code'

interface Props {
  clientId: string
  fullName: string
}

export function QrPrintView({ clientId, fullName }: Props) {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 gap-6">
      {/* Print button — hidden when printing */}
      <button
        onClick={() => window.print()}
        className="print:hidden mb-4 px-5 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-700 transition-colors"
      >
        🖨 Print
      </button>

      {/* Print area */}
      <div className="flex flex-col items-center gap-6 text-center">
        {/* Brand */}
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest">VM Integral</p>
          <p className="text-2xl font-bold text-gray-900">Massage Inc.</p>
          <p className="text-sm text-gray-500">Kissimmee, Florida</p>
        </div>

        {/* QR */}
        <div className="p-6 border-2 border-gray-900 rounded-2xl">
          <QRCode
            value={clientId}
            size={220}
            bgColor="#ffffff"
            fgColor="#0f172a"
          />
        </div>

        {/* Client info */}
        <div>
          <p className="text-2xl font-bold text-gray-900">{fullName}</p>
          <p className="text-base text-gray-500 mt-1">Membership Card</p>
        </div>

        {/* Spa contact */}
        <div className="border-t border-gray-200 pt-4 text-sm text-gray-500">
          <p>📞 (407) 388-4928</p>
          <p>vmintegralmassage.com</p>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          @page { margin: 1cm; }
          body { background: white; }
        }
      `}</style>
    </div>
  )
}
