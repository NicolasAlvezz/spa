'use client'

import { useState, useTransition, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, MessageSquare, Smartphone, AlertCircle } from 'lucide-react'
import { inviteNewClientAction } from './actions'
import { PhoneInput } from '@/components/spa/PhoneInput'

const ERROR_LABELS: Record<string, { en: string; es: string }> = {
  fill_all_fields: { en: 'Please enter a phone number.', es: 'Ingresá un número de celular.' },
  phone_taken:     { en: 'That phone number is already registered.', es: 'Ese número ya está registrado.' },
  unauthorized:    { en: 'Unauthorized.', es: 'No autorizado.' },
  generic_error:   { en: 'Something went wrong. Try again.', es: 'Ocurrió un error. Intentá de nuevo.' },
}

export default function NewClientPage() {
  const [locale] = useState<'en' | 'es'>(() =>
    typeof document !== 'undefined'
      ? ((document.cookie.match(/locale=(\w+)/)?.[1] as 'en' | 'es') ?? 'en')
      : 'en'
  )
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [channel, setChannel] = useState<'sms' | 'whatsapp'>('whatsapp')
  const [alreadyInvited, setAlreadyInvited] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setAlreadyInvited(null)
    const formData = new FormData(e.currentTarget)
    formData.set('channel', channel)
    startTransition(async () => {
      const result = await inviteNewClientAction(undefined, formData)
      if (result?.status === 'error') {
        setError(ERROR_LABELS[result.message]?.[locale] ?? ERROR_LABELS.generic_error[locale])
      } else if (result?.status === 'already_invited') {
        setAlreadyInvited(result.phone)
      } else if (result?.status === 'success') {
        setSuccess(result.phone)
      }
    })
  }

  function handleConfirmResend() {
    if (!formRef.current) return
    setAlreadyInvited(null)
    setError(null)
    const formData = new FormData(formRef.current)
    formData.set('channel', channel)
    formData.set('confirm_resend', 'true')
    startTransition(async () => {
      const result = await inviteNewClientAction(undefined, formData)
      if (result?.status === 'error') {
        setError(ERROR_LABELS[result.message]?.[locale] ?? ERROR_LABELS.generic_error[locale])
      } else if (result?.status === 'success') {
        setSuccess(result.phone)
      }
    })
  }

  const label = (en: string, es: string) => locale === 'es' ? es : en

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-md">
      <Link
        href="/admin/clients"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft size={14} />
        {label('Back to clients', 'Volver a clientes')}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {label('Invite new client', 'Invitar nuevo cliente')}
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {label(
            "Enter the client's phone number. They'll receive a link to complete their own registration.",
            'Ingresá el celular del cliente. Recibirá un link para completar su registro.'
          )}
        </p>
      </div>

      {success ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <CheckCircle2 size={44} className="text-green-500" />
          <p className="text-base font-semibold text-green-700">
            {label('Invitation sent!', '¡Invitación enviada!')}
          </p>
          <p className="text-sm text-gray-500">{success}</p>
          <button
            onClick={() => { setSuccess(null); setAlreadyInvited(null) }}
            className="mt-4 text-sm text-brand-600 hover:underline"
          >
            {label('Invite another client', 'Invitar otro cliente')}
          </button>
        </div>
      ) : (
        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              {label('Phone / Cell', 'Celular')} *
            </label>
            <PhoneInput variant="light" disabled={isPending} />
          </div>

          {/* Channel selector */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">
              {label('Send via', 'Enviar por')}
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setChannel('whatsapp')}
                disabled={isPending}
                className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border text-sm font-medium transition-colors ${
                  channel === 'whatsapp'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <MessageSquare size={16} />
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setChannel('sms')}
                disabled={isPending}
                className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border text-sm font-medium transition-colors ${
                  channel === 'sms'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Smartphone size={16} />
                SMS
              </button>
            </div>
          </div>

          {/* Already invited confirmation */}
          {alreadyInvited && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-4 flex flex-col gap-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle size={18} className="text-amber-600 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-800">
                  {label(
                    `An invitation was already sent to ${alreadyInvited}. Send again?`,
                    `Ya se envió una invitación a ${alreadyInvited}. ¿Querés enviarla de nuevo?`
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleConfirmResend}
                  disabled={isPending}
                  className="flex-1 h-10 rounded-lg bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold transition-colors disabled:opacity-60"
                >
                  {label('Yes, resend', 'Sí, reenviar')}
                </button>
                <button
                  type="button"
                  onClick={() => setAlreadyInvited(null)}
                  disabled={isPending}
                  className="flex-1 h-10 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  {label('No, cancel', 'No, cancelar')}
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          {!alreadyInvited && (
            <button
              type="submit"
              disabled={isPending}
              className="h-12 rounded-xl bg-brand-500 hover:bg-brand-400 active:bg-brand-600 disabled:opacity-60 text-white font-bold transition-colors shadow-lg shadow-brand-900/20"
            >
              {isPending
                ? label('Sending...', 'Enviando...')
                : label('Send invitation', 'Enviar invitación')}
            </button>
          )}
        </form>
      )}
    </div>
  )
}
