import { LoginQrCard } from '@/components/spa/LoginQrCard'

export const dynamic = 'force-dynamic'

export default function QrAccessPage() {
  return (
    <div className="min-h-full flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <LoginQrCard size={256} />
      </div>
    </div>
  )
}
