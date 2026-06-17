'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import Link from 'next/link'
import QRCode from 'react-qr-code'
import { ArrowLeft, CheckCircle2, MessageSquare, Smartphone, AlertCircle, QrCode, X, Copy, Check, UserCheck } from 'lucide-react'
import { inviteNewClientAction, ensureAuthUserForQrAction } from './actions'
import { PhoneInput } from '@/components/spa/PhoneInput'
import { buildE164 } from '@/lib/phone'
import { buildWhatsAppUrl, buildRegistrationLink } from '@/lib/invite-message'

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
  const [alreadyRegistered, setAlreadyRegistered] = useState<string | null>(null)
  const [showQrModal, setShowQrModal] = useState(false)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [isQrPending, setIsQrPending] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  function getE164FromForm(form: HTMLFormElement): string | null {
    const prefix = (form.elements.namedItem('phone_prefix') as HTMLSelectElement | null)?.value?.trim()
    const local = (form.elements.namedItem('phone_local') as HTMLInputElement | null)?.value?.trim()
    if (!prefix || !local) return null
    return buildE164(local, prefix)
  }

  function openWhatsAppInvite(form: HTMLFormElement): boolean {
    const e164 = getE164FromForm(form)
    if (!e164 || e164.replace(/\D/g, '').length < 8) {
      setError(ERROR_LABELS.fill_all_fields[locale])
      return false
    }
    setError(null)
    window.open(buildWhatsAppUrl(e164), '_blank', 'noopener,noreferrer')
    return true
  }

  function handleWhatsAppClick() {
    if (!formRef.current || isPending) return
    setChannel('whatsapp')
    openWhatsAppInvite(formRef.current)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setAlreadyInvited(null)
    setAlreadyRegistered(null)
    if (channel === 'whatsapp' && formRef.current && !openWhatsAppInvite(formRef.current)) {
      return
    }
    const formData = new FormData(e.currentTarget)
    formData.set('channel', channel)
    startTransition(async () => {
      try {
        const result = await inviteNewClientAction(undefined, formData)
        if (result?.status === 'error') {
          setError(ERROR_LABELS[result.message]?.[locale] ?? ERROR_LABELS.generic_error[locale])
        } else if (result?.status === 'already_registered') {
          setAlreadyRegistered(result.phone)
        } else if (result?.status === 'already_invited') {
          setAlreadyInvited(result.phone)
        } else if (result?.status === 'success') {
          setSuccess(result.phone)
        }
      } catch {
        setError(ERROR_LABELS.generic_error[locale])
      }
    })
  }

  function handleConfirmResend() {
    if (!formRef.current) return
    setAlreadyInvited(null)
    setError(null)
    if (channel === 'whatsapp' && !openWhatsAppInvite(formRef.current)) {
      return
    }
    const formData = new FormData(formRef.current)
    formData.set('channel', channel)
    formData.set('confirm_resend', 'true')
    startTransition(async () => {
      try {
        const result = await inviteNewClientAction(undefined, formData)
        if (result?.status === 'error') {
          setError(ERROR_LABELS[result.message]?.[locale] ?? ERROR_LABELS.generic_error[locale])
        } else if (result?.status === 'success') {
          setSuccess(result.phone)
        }
      } catch {
        setError(ERROR_LABELS.generic_error[locale])
      }
    })
  }

  async function handleGenerateQr() {
    if (!formRef.current || isQrPending) return
    const e164 = getE164FromForm(formRef.current)
    if (!e164 || e164.replace(/\D/g, '').length < 8) {
      setError(ERROR_LABELS.fill_all_fields[locale])
      return
    }
    setError(null)
    setAlreadyRegistered(null)
    setIsQrPending(true)
    try {
      const result = await ensureAuthUserForQrAction(e164)
      if (result.status === 'already_registered') {
        setAlreadyRegistered(e164)
      } else if (result.status === 'error') {
        setError(ERROR_LABELS[result.message]?.[locale] ?? ERROR_LABELS.generic_error[locale])
      } else {
        setQrUrl(buildRegistrationLink(e164))
        setLinkCopied(false)
        setShowQrModal(true)
      }
    } catch {
      setError(ERROR_LABELS.generic_error[locale])
    } finally {
      setIsQrPending(false)
    }
  }

  async function handleCopyLink() {
    if (!qrUrl) return
    await navigator.clipboard.writeText(qrUrl)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  useEffect(() => {
    if (!showQrModal) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowQrModal(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [showQrModal])

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
            onClick={() => { setSuccess(null); setAlreadyInvited(null); setAlreadyRegistered(null) }}
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
                onClick={handleWhatsAppClick}
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

            {/* QR — in-person alternative */}
            <button
              type="button"
              onClick={handleGenerateQr}
              disabled={isPending || isQrPending}
              className="flex items-center justify-center gap-2 h-11 rounded-xl border border-violet-200 bg-violet-50 text-violet-700 text-sm font-medium transition-colors hover:bg-violet-100 disabled:opacity-60"
            >
              <QrCode size={16} />
              {isQrPending
                ? label('Generating...', 'Generando...')
                : label('Show registration QR', 'Mostrar QR de registro')}
            </button>
          </div>

          {/* Already registered — blocks invite and QR */}
          {alreadyRegistered && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-4 flex items-start gap-2.5">
              <UserCheck size={18} className="text-blue-600 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-800">
                {label(
                  `${alreadyRegistered} is already registered. This client must log in at /login.`,
                  `${alreadyRegistered} ya está registrado/a. Este cliente debe iniciar sesión en /login.`
                )}
              </p>
            </div>
          )}

          {/* Already invited confirmation */}
          {!alreadyRegistered && alreadyInvited && (
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

          {!alreadyInvited && !alreadyRegistered && (
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

      {/* QR Modal */}
      {showQrModal && qrUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={label('Registration QR', 'QR de registro')}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={(e) => { if (e.target === e.currentTarget) setShowQrModal(false) }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode size={20} className="text-violet-600" />
                <h2 className="text-base font-bold text-gray-900">
                  {label('Registration QR', 'QR de registro')}
                </h2>
              </div>
              <button
                onClick={() => setShowQrModal(false)}
                aria-label={label('Close', 'Cerrar')}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex justify-center p-4 bg-gray-50 rounded-xl">
              <QRCode value={qrUrl} size={200} />
            </div>

            <p className="text-sm text-gray-500 text-center">
              {label(
                'The client scans this code to complete their registration.',
                'El cliente escanea este código para completar su registro.'
              )}
            </p>

            <div className="flex items-center gap-2">
              <p className="flex-1 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2 truncate font-mono select-all">
                {qrUrl}
              </p>
              <button
                onClick={handleCopyLink}
                className="shrink-0 flex items-center gap-1.5 h-9 px-3 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {linkCopied
                  ? <Check size={14} className="text-green-500" />
                  : <Copy size={14} />
                }
                {linkCopied ? label('Copied!', '¡Copiado!') : label('Copy', 'Copiar')}
              </button>
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="h-10 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              {label('Close', 'Cerrar')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
