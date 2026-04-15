'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
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
}

const ERROR_LABELS: Record<string, { en: string; es: string }> = {
  fill_all_fields:  { en: 'Please fill in all fields.',          es: 'Completá todos los campos.' },
  password_too_short: { en: 'Password must be at least 6 characters.', es: 'La contraseña debe tener al menos 6 caracteres.' },
  already_linked:   { en: 'This client already has app access.', es: 'Este cliente ya tiene acceso a la app.' },
  email_taken:      { en: 'That email is already registered.',   es: 'Ese email ya está registrado.' },
  generic_error:    { en: 'Something went wrong. Try again.',    es: 'Ocurrió un error. Intentá de nuevo.' },
}

export function InviteClientButton({ clientId, clientEmail, isLinked }: Props) {
  const t = useTranslations('invite')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Detect language from cookie for error messages
  const locale = (typeof document !== 'undefined'
    ? document.cookie.match(/locale=(\w+)/)?.[1]
    : 'en') as 'en' | 'es' ?? 'en'

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await linkClientToAuth(clientId, undefined, formData)
      if (result?.status === 'error') {
        setError(ERROR_LABELS[result.message]?.[locale] ?? ERROR_LABELS.generic_error[locale])
      } else if (result?.status === 'success') {
        setSuccess(true)
        setTimeout(() => {
          setOpen(false)
          setSuccess(false)
          router.refresh()
        }, 1800)
      }
    })
  }

  function handleUnlink() {
    if (!confirm(locale === 'es'
      ? '¿Seguro que querés quitar el acceso a la app de este cliente?'
      : 'Remove app access for this client?')) return

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
        className="h-9 text-xs px-3 text-red-600 border-red-200 hover:bg-red-50"
      >
        {isPending ? '...' : t('remove_access')}
      </Button>
    )
  }

  return (
    <>
      <Button
        variant="outline"
        size="lg"
        onClick={() => setOpen(true)}
        className="h-9 text-xs px-3"
      >
        📱 {t('give_access')}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('dialog_title')}</DialogTitle>
            <DialogDescription>{t('dialog_description')}</DialogDescription>
          </DialogHeader>

          {success ? (
            <div className="py-6 text-center">
              <p className="text-2xl mb-2">✅</p>
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
              <div className="space-y-1.5">
                <Label htmlFor="invite-password">{t('password')}</Label>
                <Input
                  id="invite-password"
                  name="password"
                  type="password"
                  required
                  disabled={isPending}
                  placeholder="Min. 6 characters"
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
                  className="bg-amber-500 hover:bg-amber-600 text-white"
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
