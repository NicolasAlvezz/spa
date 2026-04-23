'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { inviteNewClientAction } from './actions'

const ERROR_LABELS: Record<string, { en: string; es: string }> = {
  fill_all_fields: { en: 'Please enter an email address.', es: 'Ingresá un email.' },
  email_taken:     { en: 'That email is already registered.', es: 'Ese email ya está registrado.' },
  unauthorized:    { en: 'Unauthorized.', es: 'No autorizado.' },
  generic_error:   { en: 'Something went wrong. Try again.', es: 'Ocurrió un error. Intentá de nuevo.' },
}

export default function NewClientPage() {
  const [state, action, pending] = useActionState(inviteNewClientAction, undefined)
  const [locale] = useState<'en' | 'es'>(() =>
    typeof document !== 'undefined'
      ? ((document.cookie.match(/locale=(\w+)/)?.[1] as 'en' | 'es') ?? 'en')
      : 'en'
  )

  const errorMsg = state?.status === 'error'
    ? (ERROR_LABELS[state.message]?.[locale] ?? ERROR_LABELS.generic_error[locale])
    : null

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-md">
      <Link
        href="/admin/clients"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft size={14} />
        {locale === 'es' ? 'Volver a clientes' : 'Back to clients'}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {locale === 'es' ? 'Invitar nuevo cliente' : 'Invite a new client'}
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {locale === 'es'
            ? 'Ingresá el email del cliente. Recibirá un link para crear su cuenta.'
            : "Enter the client's email. They'll receive a link to set up their account."}
        </p>
      </div>

      {state?.status === 'success' ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <CheckCircle2 size={44} className="text-green-500" />
          <p className="text-base font-semibold text-green-700">
            {locale === 'es' ? '¡Invitación enviada!' : 'Invitation sent!'}
          </p>
          <p className="text-sm text-gray-500">{state.email}</p>
          <Link
            href="/admin/clients/new"
            className="mt-4 text-sm text-amber-600 hover:underline"
          >
            {locale === 'es' ? 'Invitar otro cliente' : 'Invite another client'}
          </Link>
        </div>
      ) : (
        <form action={action} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input
              name="email"
              type="email"
              required
              disabled={pending}
              placeholder="client@example.com"
              className="input"
            />
          </div>

          {errorMsg && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="h-12 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-60 text-white font-bold transition-colors shadow-lg shadow-amber-900/20"
          >
            {pending
              ? (locale === 'es' ? 'Enviando...' : 'Sending...')
              : (locale === 'es' ? 'Enviar invitación' : 'Send invitation')}
          </button>
        </form>
      )}
    </div>
  )
}
