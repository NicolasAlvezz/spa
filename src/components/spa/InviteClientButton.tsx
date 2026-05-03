'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Smartphone, Loader2, CheckCircle2 } from 'lucide-react'
import { linkClientToAuth, unlinkClientFromAuth } from '@/app/(admin)/admin/clients/[id]/link-auth-action'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

interface Props {
  clientId: string
  clientEmail: string | null
  isLinked: boolean
  className?: string
}

const ERROR_KEY_MAP: Record<string, string> = {
  fill_all_fields: 'error_fill_all_fields',
  already_linked:  'error_already_linked',
  email_taken:     'error_email_taken',
}

export function InviteClientButton({ clientId, clientEmail, isLinked, className }: Props) {
  const t = useTranslations('invite')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await linkClientToAuth(clientId, undefined, formData)
      if (result?.status === 'error') {
        const key = ERROR_KEY_MAP[result.message] ?? 'error_generic'
        setError(t(key as Parameters<typeof t>[0]))
      } else if (result?.status === 'success') {
        setSuccess(true)
        closeTimerRef.current = setTimeout(() => {
          setOpen(false)
          setSuccess(false)
          router.refresh()
        }, 2500)
      }
    })
  }

  function handleUnlink() {
    if (!confirm(t('confirm_remove'))) return

    startTransition(async () => {
      await unlinkClientFromAuth(clientId)
      router.refresh()
    })
  }

  if (isLinked) {
    return (
      <Button
        variant="outline"
        size="lg"
        onClick={handleUnlink}
        disabled={isPending}
        className={`h-9 text-xs px-3 text-red-600 border-red-200 hover:bg-red-50 gap-1.5 ${className ?? ''}`}
      >
        {isPending ? <Loader2 size={13} className="animate-spin" /> : null}
        {isPending ? t('removing') : t('remove_access')}
      </Button>
    )
  }

  return (
    <>
      <Button
        variant="outline"
        size="lg"
        onClick={() => setOpen(true)}
        className={`h-9 text-xs px-3 gap-1.5 ${className ?? ''}`}
      >
        <Smartphone size={13} />
        {t('give_access')}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('dialog_title')}</DialogTitle>
            <DialogDescription>{t('dialog_description')}</DialogDescription>
          </DialogHeader>

          {success ? (
            <div className="py-6 text-center flex flex-col items-center gap-2">
              <CheckCircle2 size={36} className="text-green-500" />
              <p className="text-sm font-medium text-green-700">{t('success')}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="invite-email">{t('email')}</Label>
                <Input
                  id="invite-email"
                  name="email"
                  type="email"
                  defaultValue={clientEmail ?? ''}
                  required
                  disabled={isPending}
                  placeholder="client@example.com"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                  {error}
                </p>
              )}

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                >
                  {t('cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-brand-500 hover:bg-brand-600 text-white"
                >
                  {isPending ? t('creating') : t('create_access')}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
