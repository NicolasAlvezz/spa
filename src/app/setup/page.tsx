import Image from 'next/image'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { LogIn } from 'lucide-react'
import { isClientFullyRegistered } from '@/lib/client-identity'
import { LanguageToggle } from '@/components/spa/LanguageToggle'
import SetupForm from './SetupForm'

type Props = { searchParams: { phone?: string } }

export default async function SetupPage({ searchParams }: Props) {
  const rawPhone = searchParams.phone ?? ''

  if (rawPhone) {
    const registered = await isClientFullyRegistered(rawPhone)

    if (registered) {
      const cookieStore = await cookies()
      const locale = (cookieStore.get('locale')?.value as 'en' | 'es') ?? 'en'
      const label = (en: string, es: string) => locale === 'es' ? es : en

      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">
          <div className="flex justify-end p-5">
            <LanguageToggle />
          </div>
          <main className="flex-1 flex items-center justify-center px-4 pb-16">
            <div className="w-full max-w-sm">
              <div className="text-center mb-10">
                <Image
                  src="/images/logo.png"
                  alt="VM Integral Massage"
                  width={160}
                  height={160}
                  priority
                  className="w-32 h-32 sm:w-40 sm:h-40 mx-auto mb-4 drop-shadow-2xl"
                />
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  VM Integral Massage
                </h1>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-8 flex flex-col gap-4">
                <p className="text-white font-semibold">
                  {label('You already have an account.', 'Ya tenés cuenta.')}
                </p>
                <p className="text-slate-400 text-sm">
                  {label(
                    'This link is for new registrations only. Please log in with your name and phone number.',
                    'Este link es solo para registros nuevos. Iniciá sesión con tu nombre y celular.'
                  )}
                </p>
                <Link
                  href="/login"
                  className="flex items-center justify-center gap-2 h-11 rounded-xl bg-brand-700 hover:bg-brand-600 text-white font-semibold text-sm transition-colors"
                >
                  <LogIn size={16} />
                  {label('Go to login', 'Ir a iniciar sesión')}
                </Link>
              </div>
              <p className="text-center text-slate-700 text-xs mt-6">
                VM Integral Massage Inc. &copy; {new Date().getFullYear()}
              </p>
            </div>
          </main>
        </div>
      )
    }
  }

  return <SetupForm />
}
