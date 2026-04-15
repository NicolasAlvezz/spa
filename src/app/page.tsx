import { redirect } from 'next/navigation'

// The middleware handles auth-based redirects.
// This catches any direct hit to "/" that passes through.
export default function RootPage() {
  redirect('/login')
}
