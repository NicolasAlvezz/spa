import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — must not use supabase between here and return
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const role = (user?.app_metadata?.role ?? null) as 'admin' | 'client' | null

  // Unauthenticated users can only access /login
  if (!user && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Admin-only routes
  const isAdminRoute =
    pathname.startsWith('/admin') || pathname.startsWith('/scan')

  if (isAdminRoute && role !== 'admin') {
    if (!user) return NextResponse.redirect(new URL('/login', request.url))
    // Authenticated but wrong role → redirect to their area
    return NextResponse.redirect(new URL('/my-qr', request.url))
  }

  // Client-only routes
  if (pathname.startsWith('/my-qr') && role !== 'client') {
    if (!user) return NextResponse.redirect(new URL('/login', request.url))
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  // Redirect authenticated users away from /login
  if (user && pathname === '/login') {
    const destination = role === 'admin' ? '/admin' : '/my-qr'
    return NextResponse.redirect(new URL(destination, request.url))
  }

  return supabaseResponse
}
